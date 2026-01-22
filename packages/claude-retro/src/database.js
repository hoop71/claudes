import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function initDatabase(dbPath) {
  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for better concurrency
  db.exec('PRAGMA journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Sessions table: groups prompts by work sessions
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      cwd TEXT,
      duration_minutes REAL NOT NULL,
      prompt_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Prompts table: individual prompts within sessions
    CREATE TABLE IF NOT EXISTS prompts (
      prompt_id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      prompt_preview TEXT,
      prompt_length INTEGER NOT NULL,
      cwd TEXT,
      git_branch TEXT,
      git_remote TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    -- Git commits table: commits made during sessions
    CREATE TABLE IF NOT EXISTS git_commits (
      commit_hash TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      message TEXT NOT NULL,
      author TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Session-commit junction table
    CREATE TABLE IF NOT EXISTS session_commits (
      session_id TEXT NOT NULL,
      commit_hash TEXT NOT NULL,
      PRIMARY KEY (session_id, commit_hash),
      FOREIGN KEY (session_id) REFERENCES sessions(session_id),
      FOREIGN KEY (commit_hash) REFERENCES git_commits(commit_hash)
    );

    -- Jira issues cache
    CREATE TABLE IF NOT EXISTS jira_issues (
      issue_key TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      status TEXT,
      story_points REAL,
      sprint TEXT,
      assignee TEXT,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Session-issue junction table with confidence scoring
    CREATE TABLE IF NOT EXISTS session_issues (
      session_id TEXT NOT NULL,
      issue_key TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('branch', 'commit', 'prompt', 'directory')),
      confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      PRIMARY KEY (session_id, issue_key, source),
      FOREIGN KEY (session_id) REFERENCES sessions(session_id),
      FOREIGN KEY (issue_key) REFERENCES jira_issues(issue_key)
    );

    -- Processing log to track which log files have been processed
    CREATE TABLE IF NOT EXISTS processing_log (
      log_file TEXT PRIMARY KEY,
      processed_at INTEGER DEFAULT (strftime('%s', 'now')),
      entries_count INTEGER NOT NULL,
      sessions_created INTEGER NOT NULL,
      errors_count INTEGER DEFAULT 0
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_prompts_session ON prompts(session_id);
    CREATE INDEX IF NOT EXISTS idx_prompts_timestamp ON prompts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessions_time ON sessions(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_commits_timestamp ON git_commits(timestamp);
    CREATE INDEX IF NOT EXISTS idx_commits_repo ON git_commits(repo_path);
    CREATE INDEX IF NOT EXISTS idx_session_commits_session ON session_commits(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_commits_commit ON session_commits(commit_hash);
    CREATE INDEX IF NOT EXISTS idx_session_issues_session ON session_issues(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_issues_issue ON session_issues(issue_key);
    CREATE INDEX IF NOT EXISTS idx_jira_updated ON jira_issues(updated_at);
  `);

  console.log(`✓ Database initialized at ${dbPath}`);

  return db;
}

export function getDatabase(config) {
  const dataDir = config.dataDir.replace('~', homedir());
  const dbPath = join(dataDir, 'retro.db');
  return new DatabaseSync(dbPath);
}

export default { initDatabase, getDatabase };
