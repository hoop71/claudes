import { loadConfig } from '../lib/config.js';

/**
 * Jira API client for fetching assigned issues
 */
export class JiraClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.jiraUrl;
    this.username = config.jiraUsername;
    this.apiToken = config.jiraApiToken;

    if (!this.baseUrl || !this.username || !this.apiToken) {
      throw new Error('Jira configuration is incomplete');
    }
  }

  /**
   * Builds authorization header
   */
  getAuthHeader() {
    const auth = Buffer.from(`${this.username}:${this.apiToken}`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Makes a request to Jira API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/rest/api/3/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Fetches issues assigned to current user
   *
   * @param {number} daysBack - How many days back to fetch (default: 30)
   * @returns {Promise<Array>} Array of issues
   */
  async fetchAssignedIssues(daysBack = 30) {
    console.log(`  🔍 Fetching Jira issues from last ${daysBack} days...`);

    const jql = `assignee = currentUser() AND updated >= -${daysBack}d ORDER BY updated DESC`;

    try {
      const data = await this.request('search', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          fields: [
            'summary',
            'status',
            'assignee',
            'updated',
            'customfield_10016' // Story points (may vary by Jira instance)
          ],
          maxResults: 1000
        })
      });

      const issues = data.issues.map(issue => ({
        issue_key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name || 'Unknown',
        assignee: issue.fields.assignee?.displayName || this.username,
        story_points: issue.fields.customfield_10016 || null,
        sprint: this.extractSprint(issue),
        updated_at: Math.floor(new Date(issue.fields.updated).getTime() / 1000)
      }));

      console.log(`  ✓ Fetched ${issues.length} issues`);
      return issues;
    } catch (error) {
      console.error(`  ❌ Failed to fetch Jira issues:`, error.message);
      throw error;
    }
  }

  /**
   * Extracts sprint name from issue (if in a sprint)
   */
  extractSprint(issue) {
    const sprint = issue.fields.customfield_10020; // Sprint field (may vary)
    if (Array.isArray(sprint) && sprint.length > 0) {
      const latest = sprint[sprint.length - 1];
      if (typeof latest === 'string') {
        const match = latest.match(/name=([^,]+)/);
        return match ? match[1] : null;
      }
    }
    return null;
  }

  /**
   * Syncs issues to database
   */
  async syncIssues(db, daysBack = 30) {
    console.log('\n🔄 Syncing Jira issues...');

    try {
      const issues = await this.fetchAssignedIssues(daysBack);

      const insertIssue = db.prepare(`
        INSERT OR REPLACE INTO jira_issues
        (issue_key, summary, status, story_points, sprint, assignee, updated_at, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `);

      const transaction = db.transaction(() => {
        for (const issue of issues) {
          insertIssue.run(
            issue.issue_key,
            issue.summary,
            issue.status,
            issue.story_points,
            issue.sprint,
            issue.assignee,
            issue.updated_at
          );
        }
      });

      transaction();

      console.log(`✓ Synced ${issues.length} Jira issues\n`);
      return issues.length;
    } catch (error) {
      console.error('❌ Jira sync failed:', error.message);
      console.warn('⚠️  Continuing with cached data\n');
      return 0;
    }
  }

  /**
   * Gets cache staleness in days
   */
  getCacheStaleness(db) {
    const result = db.prepare(`
      SELECT
        (strftime('%s', 'now') - MAX(synced_at)) / 86400 as days_old
      FROM jira_issues
    `).get();

    return result?.days_old || null;
  }
}

/**
 * Creates Jira client from config
 */
export function createJiraClient(config) {
  if (!config.jiraUrl || !config.jiraUsername || !config.jiraApiToken) {
    return null;
  }

  try {
    return new JiraClient(config);
  } catch (error) {
    console.warn('⚠️  Jira client initialization failed:', error.message);
    return null;
  }
}

export default { JiraClient, createJiraClient };
