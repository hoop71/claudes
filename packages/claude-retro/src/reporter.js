#!/usr/bin/env node

import { parseArgs } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { loadConfig } from '../lib/config.js';
import { getDatabase } from './database.js';
import {
  getSessions,
  getWorkByIssue,
  getUntrackedSessions,
  getSummaryStats,
  getCommits,
  groupUntrackedByDirectory
} from './query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command-line arguments
 */
function parseArguments() {
  const { values } = parseArgs({
    options: {
      days: {
        type: 'string',
        short: 'd',
        default: '7'
      },
      start: {
        type: 'string',
        short: 's'
      },
      end: {
        type: 'string',
        short: 'e'
      },
      format: {
        type: 'string',
        short: 'f',
        default: 'markdown'
      }
    }
  });

  let startDate, endDate;

  if (values.start && values.end) {
    startDate = new Date(values.start);
    endDate = new Date(values.end);
  } else {
    const days = parseInt(values.days) || 7;
    endDate = endOfDay(new Date());
    startDate = startOfDay(subDays(endDate, days));
  }

  return { startDate, endDate, format: values.format };
}

/**
 * Formats hours from minutes
 */
function formatHours(minutes) {
  if (!minutes) return '0.0h';
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

/**
 * Calculates alignment percentage
 */
function calculateAlignment(trackedMinutes, untrackedMinutes) {
  const total = trackedMinutes + untrackedMinutes;
  if (total === 0) return 0;
  return ((trackedMinutes / total) * 100).toFixed(1);
}

/**
 * Generates markdown report
 */
function generateMarkdownReport(data) {
  const { startDate, endDate, stats, workByIssue, untrackedGroups, commits, config } = data;

  const lines = [];

  // Header
  lines.push(`# Development Retrospective`);
  lines.push('');
  lines.push(`**Period:** ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`);
  lines.push('');

  // Executive Summary
  lines.push(`## Executive Summary`);
  lines.push('');

  const totalHours = formatHours(stats.total_minutes);
  const avgSession = formatHours(stats.avg_session_minutes);

  lines.push(`- **Total Work Time:** ${totalHours} across ${stats.total_sessions} sessions`);
  lines.push(`- **Average Session:** ${avgSession}`);
  lines.push(`- **Issues Worked On:** ${stats.unique_issues}`);
  lines.push(`- **Commits Made:** ${stats.total_commits}`);

  // Calculate tracked vs untracked
  const trackedMinutes = workByIssue.reduce((sum, w) => sum + (w.total_minutes || 0), 0);
  const untrackedMinutes = untrackedGroups.reduce((sum, g) => sum + (g.total_minutes || 0), 0);
  const alignment = calculateAlignment(trackedMinutes, untrackedMinutes);

  lines.push(`- **Work Alignment:** ${alignment}% tracked to issues`);
  lines.push('');

  // Work by Issue
  if (workByIssue.length > 0) {
    lines.push(`## Work by Issue`);
    lines.push('');

    for (const work of workByIssue) {
      const jiraUrl = config.jiraUrl
        ? `${config.jiraUrl}/browse/${work.issue_key}`
        : null;

      const issueLink = jiraUrl
        ? `[${work.issue_key}](${jiraUrl})`
        : work.issue_key;

      lines.push(`### ${issueLink}`);

      if (work.summary) {
        lines.push(`**${work.summary}**`);
        lines.push('');
      }

      lines.push(`- Time: ${formatHours(work.total_minutes)} (${work.session_count} sessions)`);
      lines.push(`- Commits: ${work.commit_count}`);

      if (work.status) {
        lines.push(`- Status: ${work.status}`);
      }

      if (work.story_points) {
        lines.push(`- Story Points: ${work.story_points}`);
      }

      if (work.sprint) {
        lines.push(`- Sprint: ${work.sprint}`);
      }

      lines.push(`- Detection: ${work.sources} (confidence: ${(work.max_confidence * 100).toFixed(0)}%)`);
      lines.push('');
    }
  } else {
    lines.push(`## Work by Issue`);
    lines.push('');
    lines.push('No tracked work found for this period.');
    lines.push('');
  }

  // Untracked Work
  if (untrackedGroups.length > 0) {
    lines.push(`## Untracked Work`);
    lines.push('');
    lines.push('Work not associated with any issue:');
    lines.push('');

    for (const group of untrackedGroups) {
      const dirName = group.directory.split('/').pop() || group.directory;
      lines.push(`### ${dirName}`);
      lines.push(`**Directory:** \`${group.directory}\``);
      lines.push('');
      lines.push(`- Time: ${formatHours(group.total_minutes)} (${group.sessions.length} sessions)`);
      lines.push(`- Commits: ${group.commit_count}`);
      lines.push('');

      // Suggest creating issues
      if (group.total_minutes > 30) {
        lines.push(`> 💡 **Suggestion:** ${formatHours(group.total_minutes)} of untracked work - consider creating a Jira issue.`);
        lines.push('');
      }
    }

    const untrackedHours = formatHours(untrackedMinutes);
    const untrackedPercent = (100 - parseFloat(alignment)).toFixed(1);

    lines.push(`**Total Untracked:** ${untrackedHours} (${untrackedPercent}% of work)`);
    lines.push('');
  }

  // Productivity Insights
  lines.push(`## Productivity Insights`);
  lines.push('');

  if (parseFloat(alignment) >= 80) {
    lines.push(`✅ **Strong alignment** (${alignment}%) - Most work is tracked to issues.`);
  } else if (parseFloat(alignment) >= 60) {
    lines.push(`⚠️ **Moderate alignment** (${alignment}%) - Consider tracking more work in issues.`);
  } else {
    lines.push(`❌ **Low alignment** (${alignment}%) - Significant untracked work detected.`);
  }

  lines.push('');

  // Session patterns
  if (stats.avg_session_minutes > 240) {
    lines.push(`⚠️ Long average session time (${avgSession}) - Remember to take breaks!`);
  } else if (stats.avg_session_minutes < 30) {
    lines.push(`ℹ️ Short average session time (${avgSession}) - Many brief sessions detected.`);
  }

  lines.push('');

  // Commits per hour
  if (stats.total_commits > 0 && stats.total_minutes > 0) {
    const commitsPerHour = (stats.total_commits / (stats.total_minutes / 60)).toFixed(1);
    lines.push(`📊 Commit frequency: ${commitsPerHour} commits per hour`);
    lines.push('');
  }

  // Recent Commits
  if (commits.length > 0) {
    lines.push(`## Recent Commits`);
    lines.push('');

    const recentCommits = commits.slice(0, 10);
    for (const commit of recentCommits) {
      const date = format(new Date(commit.timestamp * 1000), 'MMM d, HH:mm');
      const shortHash = commit.commit_hash.substring(0, 7);
      lines.push(`- \`${shortHash}\` ${commit.message} (${date})`);
    }

    if (commits.length > 10) {
      lines.push('');
      lines.push(`_...and ${commits.length - 10} more commits_`);
    }

    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`_Generated by [Claude Retro](https://github.com/anthropics/claude-retro) on ${format(new Date(), 'MMM d, yyyy HH:mm')}_`);

  return lines.join('\n');
}

/**
 * Main report generation function
 */
async function generateReport() {
  try {
    const { startDate, endDate, format: outputFormat } = parseArguments();

    // Load config and database
    const config = loadConfig();
    const db = getDatabase(config);

    // Query data
    const stats = getSummaryStats(db, startDate, endDate);
    const workByIssue = getWorkByIssue(db, startDate, endDate);
    const untrackedSessions = getUntrackedSessions(db, startDate, endDate);
    const untrackedGroups = groupUntrackedByDirectory(untrackedSessions);
    const commits = getCommits(db, startDate, endDate);

    db.close();

    // Check if any data exists
    if (stats.total_sessions === 0) {
      console.log('\n⚠️  No data found for the specified period.');
      console.log(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`);
      console.log('\nMake sure:');
      console.log('  1. You\'ve used Claude Code during this period');
      console.log('  2. The processor has run (or run it manually: node scripts/processor.js)');
      console.log('  3. The hook is capturing data (check logs: ls ~/.claude-retro/logs/)\n');
      process.exit(1);
    }

    // Generate report
    const data = {
      startDate,
      endDate,
      stats,
      workByIssue,
      untrackedGroups,
      commits,
      config
    };

    const report = generateMarkdownReport(data);

    // Output
    console.log(report);

  } catch (error) {
    console.error('\n❌ Report generation failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run report generator
generateReport();
