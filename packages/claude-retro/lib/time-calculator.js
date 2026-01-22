import crypto from 'crypto';

/**
 * Groups prompts into work sessions based on time gaps
 *
 * @param {Array} prompts - Array of prompt entries
 * @param {number} gapMinutes - Minutes of inactivity before new session (default: 30)
 * @returns {Array} Array of session objects
 */
export function groupSessions(prompts, gapMinutes = 30) {
  if (!prompts || prompts.length === 0) {
    return [];
  }

  // Sort prompts by timestamp
  const sorted = [...prompts].sort((a, b) => a.timestamp - b.timestamp);

  const sessions = [];
  let currentSession = null;
  const gapMs = gapMinutes * 60 * 1000;

  for (const prompt of sorted) {
    const promptTime = prompt.timestamp * 1000; // Convert to milliseconds

    if (!currentSession ||
        (promptTime - currentSession.lastPromptTime) > gapMs) {
      // Start new session
      if (currentSession) {
        // Finalize previous session
        currentSession.duration_minutes =
          (currentSession.end_time - currentSession.start_time) / 1000 / 60;
        sessions.push(currentSession);
      }

      // Create new session
      currentSession = {
        session_id: generateSessionId(prompt),
        start_time: Math.floor(promptTime / 1000),
        end_time: Math.floor(promptTime / 1000),
        lastPromptTime: promptTime,
        cwd: prompt.cwd,
        prompts: [],
        original_session_id: prompt.session_id
      };
    }

    // Add prompt to current session
    currentSession.prompts.push(prompt);
    currentSession.end_time = Math.floor(promptTime / 1000);
    currentSession.lastPromptTime = promptTime;
    currentSession.prompt_count = currentSession.prompts.length;

    // Update cwd to most recent non-null value
    if (prompt.cwd) {
      currentSession.cwd = prompt.cwd;
    }
  }

  // Finalize last session
  if (currentSession) {
    currentSession.duration_minutes =
      (currentSession.end_time - currentSession.start_time) / 60;
    sessions.push(currentSession);
  }

  return sessions;
}

/**
 * Generates a unique session ID based on start time and cwd
 */
function generateSessionId(prompt) {
  const hash = crypto
    .createHash('sha256')
    .update(`${prompt.timestamp}-${prompt.cwd || ''}-${prompt.session_id}`)
    .digest('hex');
  return hash.substring(0, 16);
}

/**
 * Calculates total hours from sessions
 */
export function calculateTotalHours(sessions) {
  return sessions.reduce((total, session) => {
    return total + (session.duration_minutes || 0);
  }, 0) / 60;
}

/**
 * Groups sessions by date
 */
export function groupSessionsByDate(sessions) {
  const byDate = new Map();

  for (const session of sessions) {
    const date = new Date(session.start_time * 1000).toISOString().split('T')[0];
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date).push(session);
  }

  return byDate;
}

/**
 * Detects long sessions (>4 hours) that may indicate missing breaks
 */
export function detectLongSessions(sessions, thresholdHours = 4) {
  return sessions.filter(session => {
    return session.duration_minutes > (thresholdHours * 60);
  });
}

export default {
  groupSessions,
  calculateTotalHours,
  groupSessionsByDate,
  detectLongSessions
};
