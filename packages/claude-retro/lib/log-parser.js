import { readFileSync } from 'fs';

/**
 * Parses a JSONL log file and returns array of log entries
 */
export function parseLogFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    const entries = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);

        // Validate required fields
        if (!entry.timestamp || !entry.session_id) {
          errors.push({ line: i + 1, error: 'Missing required fields' });
          continue;
        }

        entries.push({
          timestamp: entry.timestamp,
          session_id: entry.session_id,
          prompt_preview: entry.prompt_preview || null,
          prompt_length: entry.prompt_length || 0,
          cwd: entry.cwd || null,
          git_branch: entry.git_branch || null,
          git_remote: entry.git_remote || null
        });
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { entries, errors };
  } catch (error) {
    throw new Error(`Failed to parse log file ${filePath}: ${error.message}`);
  }
}

/**
 * Groups log entries by session_id
 */
export function groupBySession(entries) {
  const sessions = new Map();

  for (const entry of entries) {
    if (!sessions.has(entry.session_id)) {
      sessions.set(entry.session_id, []);
    }
    sessions.get(entry.session_id).push(entry);
  }

  return sessions;
}

export default { parseLogFile, groupBySession };
