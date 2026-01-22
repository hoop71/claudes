/**
 * Claude Retro - Automated Developer Retrospectives
 *
 * Programmatic API for integrating retrospective tracking into any development tool.
 *
 * @packageDocumentation
 */

// Configuration management
export {
  loadConfig,
  saveConfig,
  getDefaultConfigPath,
  getDefaultDataDir,
  is1PasswordAvailable,
  resolveSecretReference
} from './lib/config.js';

// Log parsing and session grouping
export {
  parseLogFile,
  groupBySession
} from './lib/log-parser.js';

// Time calculation and session analysis
export {
  groupSessions,
  calculateTotalHours,
  groupSessionsByDate,
  detectLongSessions
} from './lib/time-calculator.js';

// Issue extraction from various sources
export {
  extractFromSession,
  extractFromBranch,
  extractFromCommitMessage,
  extractFromPrompt,
  extractFromPath,
  isValidIssueKey
} from './lib/issue-extractor.js';

// Git analysis
export {
  isGitRepo,
  getCommits,
  getCurrentBranch,
  getRemoteUrl,
  getCommitsFromRepos,
  getCommitStats
} from './lib/git-analyzer.js';

// Database operations
export {
  initDatabase,
  getDatabase
} from './src/database.js';

// Jira client
export {
  JiraClient,
  createJiraClient
} from './src/jira-client.js';

// Query functions for reports
export {
  getSessions,
  getWorkByIssue,
  getUntrackedSessions,
  getSummaryStats,
  getCommits as queryCommits,
  groupUntrackedByDirectory
} from './src/query.js';

/**
 * Example usage:
 *
 * ```javascript
 * import { loadConfig, initDatabase, parseLogFile, groupSessions, getSessions } from '@hoop71/claude-retro';
 *
 * // Load configuration
 * const config = loadConfig();
 *
 * // Initialize database
 * const dbPath = config.dataDir.replace('~', process.env.HOME) + '/retro.db';
 * const db = initDatabase(dbPath);
 *
 * // Parse log files
 * const entries = parseLogFile('prompts-2025-01.jsonl');
 * const sessions = groupSessions(entries, config.sessionGapMinutes);
 *
 * // Query sessions from database
 * const startDate = new Date('2025-01-01');
 * const endDate = new Date('2025-01-31');
 * const dbSessions = getSessions(db, startDate, endDate);
 *
 * console.log(`Found ${dbSessions.length} sessions`);
 * ```
 */

// Re-import for default export
import { loadConfig, saveConfig, getDefaultConfigPath, getDefaultDataDir } from './lib/config.js';
import { parseLogFile, groupBySession } from './lib/log-parser.js';
import { groupSessions } from './lib/time-calculator.js';
import { extractFromSession } from './lib/issue-extractor.js';
import { getCommitsFromRepos } from './lib/git-analyzer.js';
import { initDatabase, getDatabase } from './src/database.js';
import { JiraClient, createJiraClient } from './src/jira-client.js';

// Default export with all APIs
export default {
  // Config
  loadConfig,
  saveConfig,
  getDefaultConfigPath,
  getDefaultDataDir,

  // Database
  initDatabase,
  getDatabase,

  // Parsing
  parseLogFile,
  groupBySession,

  // Analysis
  groupSessions,
  extractFromSession,
  getCommitsFromRepos,

  // Jira
  JiraClient,
  createJiraClient
};
