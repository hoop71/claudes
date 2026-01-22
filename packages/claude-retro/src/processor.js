#!/usr/bin/env node

import { readdirSync, renameSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadConfig } from '../lib/config.js';
import { getDatabase } from './database.js';
import { parseLogFile, groupBySession } from '../lib/log-parser.js';
import { groupSessions } from '../lib/time-calculator.js';
import { getCommitsFromRepos } from '../lib/git-analyzer.js';
import { extractFromSession } from '../lib/issue-extractor.js';
import { createJiraClient } from './jira-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Rotates old log files (archives logs older than 30 days)
 */
function rotateOldLogs(logsDir) {
  const processedDir = join(logsDir, '.processed');
  const archiveDir = join(logsDir, 'archive');

  if (!existsSync(processedDir)) {
    return;
  }

  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  const files = readdirSync(processedDir);
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  let archivedCount = 0;

  for (const file of files) {
    const filePath = join(processedDir, file);
    const stats = statSync(filePath);

    if (stats.mtimeMs < thirtyDaysAgo) {
      // Compress and move to archive
      const archivePath = join(archiveDir, `${file}.gz`);

      try {
        execSync(`gzip -c "${filePath}" > "${archivePath}"`, { stdio: 'ignore' });
        execSync(`rm "${filePath}"`, { stdio: 'ignore' });
        archivedCount++;
      } catch (error) {
        console.warn(`  ⚠️  Failed to archive ${file}:`, error.message);
      }
    }
  }

  if (archivedCount > 0) {
    console.log(`🗄️  Archived ${archivedCount} old log file(s)\n`);
  }
}

async function processLogs() {
  console.log('🔄 Starting log processor...\n');

  try {
    // Load configuration
    const config = loadConfig();
    const db = getDatabase(config);

    const logsDir = join(config.dataDir, 'logs');
    const processedDir = join(logsDir, '.processed');

    // Ensure processed directory exists
    if (!existsSync(processedDir)) {
      mkdirSync(processedDir, { recursive: true });
    }

    // Find all JSONL files (not in .processed)
    const logFiles = readdirSync(logsDir)
      .filter(f => f.endsWith('.jsonl') && !f.startsWith('.'))
      .map(f => join(logsDir, f));

    if (logFiles.length === 0) {
      console.log('✓ No log files to process');
      return;
    }

    console.log(`📂 Found ${logFiles.length} log file(s) to process\n`);

    let totalEntries = 0;
    let totalSessions = 0;
    let totalCommits = 0;
    let totalIssues = 0;
    let errors = 0;

    // Process each log file
    for (const logFile of logFiles) {
      console.log(`Processing ${logFile}...`);

      try {
        // Check if already processed
        const checkProcessed = db.prepare('SELECT 1 FROM processing_log WHERE log_file = ?');
        if (checkProcessed.get(logFile)) {
          console.log('  ⏭️  Already processed, skipping\n');
          continue;
        }

        // Parse log file
        const { entries, errors: parseErrors } = parseLogFile(logFile);

        if (parseErrors.length > 0) {
          console.warn(`  ⚠️  ${parseErrors.length} parsing errors`);
          errors += parseErrors.length;
        }

        console.log(`  📝 Parsed ${entries.length} entries`);
        totalEntries += entries.length;

        if (entries.length === 0) {
          // Mark as processed even if empty
          const insertLog = db.prepare(
            'INSERT INTO processing_log (log_file, entries_count, sessions_created, errors_count) VALUES (?, ?, ?, ?)'
          );
          insertLog.run(logFile, 0, 0, parseErrors.length);
          console.log('  ✓ Marked as processed (empty)\n');
          continue;
        }

        // Group by session_id first, then by time gaps
        const sessionGroups = groupBySession(entries);
        const allSessions = [];

        for (const [sessionId, prompts] of sessionGroups) {
          const sessions = groupSessions(prompts, config.sessionGapMinutes);
          allSessions.push(...sessions);
        }

        console.log(`  🔗 Grouped into ${allSessions.length} sessions`);
        totalSessions += allSessions.length;

        // Process each session
        const insertSession = db.prepare(
          'INSERT OR REPLACE INTO sessions (session_id, start_time, end_time, cwd, duration_minutes, prompt_count) VALUES (?, ?, ?, ?, ?, ?)'
        );

        const insertPrompt = db.prepare(
          'INSERT INTO prompts (session_id, timestamp, prompt_preview, prompt_length, cwd, git_branch, git_remote) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        const insertCommit = db.prepare(
          'INSERT OR IGNORE INTO git_commits (commit_hash, timestamp, message, author, repo_path) VALUES (?, ?, ?, ?, ?)'
        );

        const insertSessionCommit = db.prepare(
          'INSERT OR IGNORE INTO session_commits (session_id, commit_hash) VALUES (?, ?)'
        );

        const insertSessionIssue = db.prepare(
          'INSERT OR REPLACE INTO session_issues (session_id, issue_key, source, confidence) VALUES (?, ?, ?, ?)'
        );

        // Begin transaction for performance
        const transaction = db.transaction(() => {
          for (const session of allSessions) {
            // Insert session
            insertSession.run(
              session.session_id,
              session.start_time,
              session.end_time,
              session.cwd,
              session.duration_minutes,
              session.prompt_count
            );

            // Insert prompts
            for (const prompt of session.prompts) {
              insertPrompt.run(
                session.session_id,
                prompt.timestamp,
                prompt.prompt_preview,
                prompt.prompt_length,
                prompt.cwd,
                prompt.git_branch,
                prompt.git_remote
              );
            }

            // Get git commits for session timeframe
            const repoPaths = session.prompts
              .map(p => p.cwd)
              .filter(Boolean);

            if (repoPaths.length > 0) {
              const commits = getCommitsFromRepos(
                repoPaths,
                session.start_time,
                session.end_time
              );

              for (const commit of commits) {
                insertCommit.run(
                  commit.commit_hash,
                  commit.timestamp,
                  commit.message,
                  commit.author,
                  commit.repo_path
                );

                insertSessionCommit.run(session.session_id, commit.commit_hash);
              }

              totalCommits += commits.length;

              // Extract issue keys
              const issues = extractFromSession(
                session,
                commits,
                config.issueKeyPatterns
              );

              for (const issue of issues) {
                insertSessionIssue.run(
                  session.session_id,
                  issue.issueKey,
                  issue.source,
                  issue.confidence
                );
              }

              totalIssues += issues.length;
            }
          }
        });

        transaction();

        // Mark log file as processed
        const insertLog = db.prepare(
          'INSERT INTO processing_log (log_file, entries_count, sessions_created, errors_count) VALUES (?, ?, ?, ?)'
        );
        insertLog.run(logFile, entries.length, allSessions.length, parseErrors.length);

        // Move to processed directory
        const processedPath = join(processedDir, `${Date.now()}-${logFile.split('/').pop()}`);
        renameSync(logFile, processedPath);

        console.log(`  ✓ Processed and archived\n`);
      } catch (error) {
        console.error(`  ❌ Error processing ${logFile}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n📊 Processing Summary');
    console.log('─'.repeat(50));
    console.log(`Total entries:       ${totalEntries}`);
    console.log(`Sessions created:    ${totalSessions}`);
    console.log(`Commits linked:      ${totalCommits}`);
    console.log(`Issues extracted:    ${totalIssues}`);
    if (errors > 0) {
      console.log(`Errors:              ${errors}`);
    }
    console.log('─'.repeat(50));
    console.log('✅ Processing complete\n');

    // Sync Jira issues (if configured)
    const jiraClient = createJiraClient(config);
    if (jiraClient) {
      await jiraClient.syncIssues(db);
    } else {
      console.log('⏭️  Jira sync skipped (not configured)\n');
    }

    // Rotate old logs
    rotateOldLogs(logsDir);

    db.close();
  } catch (error) {
    console.error('\n❌ Processor failed:', error.message);
    process.exit(1);
  }
}

// Run processor
processLogs();
