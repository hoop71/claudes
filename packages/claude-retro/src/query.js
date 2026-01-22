/**
 * Database query functions for retrospective reports
 */

/**
 * Gets all sessions within date range
 */
export function getSessions(db, startDate, endDate) {
  const query = `
    SELECT
      s.session_id,
      s.start_time,
      s.end_time,
      s.cwd,
      s.duration_minutes,
      s.prompt_count
    FROM sessions s
    WHERE s.start_time >= ? AND s.end_time <= ?
    ORDER BY s.start_time ASC
  `;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  return db.prepare(query).all(startTimestamp, endTimestamp);
}

/**
 * Gets work grouped by issue (tracked work)
 */
export function getWorkByIssue(db, startDate, endDate) {
  const query = `
    SELECT
      si.issue_key,
      ji.summary,
      ji.status,
      ji.story_points,
      ji.sprint,
      COUNT(DISTINCT s.session_id) as session_count,
      SUM(s.duration_minutes) as total_minutes,
      COUNT(DISTINCT sc.commit_hash) as commit_count,
      MAX(si.confidence) as max_confidence,
      GROUP_CONCAT(DISTINCT si.source) as sources
    FROM sessions s
    INNER JOIN session_issues si ON s.session_id = si.session_id
    LEFT JOIN jira_issues ji ON si.issue_key = ji.issue_key
    LEFT JOIN session_commits sc ON s.session_id = sc.session_id
    WHERE s.start_time >= ? AND s.end_time <= ?
    GROUP BY si.issue_key
    ORDER BY total_minutes DESC
  `;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  return db.prepare(query).all(startTimestamp, endTimestamp);
}

/**
 * Gets untracked work (sessions without issue links)
 */
export function getUntrackedSessions(db, startDate, endDate) {
  const query = `
    SELECT
      s.session_id,
      s.start_time,
      s.end_time,
      s.cwd,
      s.duration_minutes,
      s.prompt_count,
      COUNT(DISTINCT sc.commit_hash) as commit_count
    FROM sessions s
    LEFT JOIN session_issues si ON s.session_id = si.session_id
    LEFT JOIN session_commits sc ON s.session_id = sc.session_id
    WHERE si.issue_key IS NULL
      AND s.start_time >= ?
      AND s.end_time <= ?
    GROUP BY s.session_id
    ORDER BY s.start_time ASC
  `;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  return db.prepare(query).all(startTimestamp, endTimestamp);
}

/**
 * Gets summary statistics for date range
 */
export function getSummaryStats(db, startDate, endDate) {
  const query = `
    SELECT
      COUNT(DISTINCT s.session_id) as total_sessions,
      SUM(s.duration_minutes) as total_minutes,
      COUNT(DISTINCT si.issue_key) as unique_issues,
      COUNT(DISTINCT sc.commit_hash) as total_commits,
      AVG(s.duration_minutes) as avg_session_minutes
    FROM sessions s
    LEFT JOIN session_issues si ON s.session_id = si.session_id
    LEFT JOIN session_commits sc ON s.session_id = sc.session_id
    WHERE s.start_time >= ? AND s.end_time <= ?
  `;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  return db.prepare(query).get(startTimestamp, endTimestamp);
}

/**
 * Gets commits for date range
 */
export function getCommits(db, startDate, endDate) {
  const query = `
    SELECT
      gc.commit_hash,
      gc.timestamp,
      gc.message,
      gc.author,
      gc.repo_path
    FROM git_commits gc
    INNER JOIN session_commits sc ON gc.commit_hash = sc.commit_hash
    INNER JOIN sessions s ON sc.session_id = s.session_id
    WHERE s.start_time >= ? AND s.end_time <= ?
    ORDER BY gc.timestamp DESC
  `;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  return db.prepare(query).all(startTimestamp, endTimestamp);
}

/**
 * Groups untracked sessions by directory
 */
export function groupUntrackedByDirectory(untrackedSessions) {
  const byDirectory = new Map();

  for (const session of untrackedSessions) {
    const dir = session.cwd || 'Unknown';
    if (!byDirectory.has(dir)) {
      byDirectory.set(dir, {
        directory: dir,
        sessions: [],
        total_minutes: 0,
        commit_count: 0
      });
    }

    const group = byDirectory.get(dir);
    group.sessions.push(session);
    group.total_minutes += session.duration_minutes || 0;
    group.commit_count += session.commit_count || 0;
  }

  return Array.from(byDirectory.values())
    .sort((a, b) => b.total_minutes - a.total_minutes);
}

export default {
  getSessions,
  getWorkByIssue,
  getUntrackedSessions,
  getSummaryStats,
  getCommits,
  groupUntrackedByDirectory
};
