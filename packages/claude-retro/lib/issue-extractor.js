/**
 * Extracts issue keys from various sources with confidence scoring
 */

/**
 * Extracts issue keys from a git branch name
 * Pattern: user/PROJ-123 or feature/PROJ-123-description -> PROJ-123
 * Confidence: 1.0 (high)
 */
export function extractFromBranch(branchName, patterns) {
  if (!branchName) return [];

  const results = [];

  // Flexible branch pattern: looks for issue key anywhere in branch name
  // Matches: user/PROJ-123, feature/PROJ-123-desc, user/feature/PROJ-123, etc.
  const branchPattern = /\b([A-Z]{1,3}-\d+)\b/i;
  const match = branchName.match(branchPattern);

  if (match) {
    results.push({
      issueKey: match[1].toUpperCase(),
      source: 'branch',
      confidence: 1.0
    });
  }

  // Try custom patterns
  for (const pattern of patterns || []) {
    const regex = new RegExp(pattern, 'g');
    const matches = [...branchName.matchAll(regex)];

    for (const m of matches) {
      const key = (m[1] || m[0]).toUpperCase();
      if (!results.find(r => r.issueKey === key)) {
        results.push({
          issueKey: key,
          source: 'branch',
          confidence: 1.0
        });
      }
    }
  }

  return results;
}

/**
 * Extracts issue keys from commit messages
 * Pattern: [PROJ-123] Fix bug -> PROJ-123
 * Confidence: 1.0 (high)
 */
export function extractFromCommitMessage(message, patterns) {
  if (!message) return [];

  const results = [];

  // Standard commit patterns (1-3 chars, dash, number)
  const commitPatterns = [
    /\[([A-Z]{1,3}-\d+)\]/g,           // [PROJ-123]
    /^([A-Z]{1,3}-\d+):/g,             // PROJ-123:
    /^([A-Z]{1,3}-\d+)\s/g,            // PROJ-123 at start
  ];

  for (const pattern of commitPatterns) {
    const matches = [...message.matchAll(pattern)];
    for (const match of matches) {
      const key = match[1].toUpperCase();
      if (!results.find(r => r.issueKey === key)) {
        results.push({
          issueKey: key,
          source: 'commit',
          confidence: 1.0
        });
      }
    }
  }

  // Try custom patterns
  for (const pattern of patterns || []) {
    const regex = new RegExp(pattern, 'g');
    const matches = [...message.matchAll(regex)];

    for (const m of matches) {
      const key = (m[1] || m[0]).toUpperCase();
      if (!results.find(r => r.issueKey === key)) {
        results.push({
          issueKey: key,
          source: 'commit',
          confidence: 1.0
        });
      }
    }
  }

  return results;
}

/**
 * Extracts issue keys from prompt text
 * Confidence: 0.7 (medium - might be false positive)
 */
export function extractFromPrompt(promptText, patterns) {
  if (!promptText) return [];

  const results = [];
  const defaultPattern = /\b([A-Z]{1,3}-\d+)\b/g;

  // Use default pattern
  const matches = [...promptText.matchAll(defaultPattern)];
  for (const match of matches) {
    const key = match[1].toUpperCase();
    if (!results.find(r => r.issueKey === key)) {
      results.push({
        issueKey: key,
        source: 'prompt',
        confidence: 0.7
      });
    }
  }

  // Try custom patterns
  for (const pattern of patterns || []) {
    const regex = new RegExp(pattern, 'g');
    const customMatches = [...promptText.matchAll(regex)];

    for (const m of customMatches) {
      const key = (m[1] || m[0]).toUpperCase();
      if (!results.find(r => r.issueKey === key)) {
        results.push({
          issueKey: key,
          source: 'prompt',
          confidence: 0.7
        });
      }
    }
  }

  return results;
}

/**
 * Extracts issue keys from directory paths
 * Pattern: /path/to/PROJ-123/file -> PROJ-123
 * Confidence: 0.5 (lower - might be old/unrelated)
 */
export function extractFromPath(path, patterns) {
  if (!path) return [];

  const results = [];
  const defaultPattern = /\/([A-Z]{1,3}-\d+)\//g;

  const matches = [...path.matchAll(defaultPattern)];
  for (const match of matches) {
    const key = match[1].toUpperCase();
    if (!results.find(r => r.issueKey === key)) {
      results.push({
        issueKey: key,
        source: 'directory',
        confidence: 0.5
      });
    }
  }

  // Try custom patterns
  for (const pattern of patterns || []) {
    const regex = new RegExp(pattern, 'g');
    const customMatches = [...path.matchAll(regex)];

    for (const m of customMatches) {
      const key = (m[1] || m[0]).toUpperCase();
      if (!results.find(r => r.issueKey === key)) {
        results.push({
          issueKey: key,
          source: 'directory',
          confidence: 0.5
        });
      }
    }
  }

  return results;
}

/**
 * Extracts all issue keys from a session
 * Combines branch, commits, prompts, and directory
 * Deduplicates and keeps highest confidence
 */
export function extractFromSession(session, commits, patterns) {
  const allIssues = new Map();

  // Extract from branch
  if (session.prompts && session.prompts.length > 0) {
    const firstPrompt = session.prompts[0];
    if (firstPrompt.git_branch) {
      const branchIssues = extractFromBranch(firstPrompt.git_branch, patterns);
      for (const issue of branchIssues) {
        updateIssueMap(allIssues, issue);
      }
    }
  }

  // Extract from commits
  for (const commit of commits || []) {
    const commitIssues = extractFromCommitMessage(commit.message, patterns);
    for (const issue of commitIssues) {
      updateIssueMap(allIssues, issue);
    }
  }

  // Extract from prompts
  for (const prompt of session.prompts || []) {
    if (prompt.prompt_preview) {
      const promptIssues = extractFromPrompt(prompt.prompt_preview, patterns);
      for (const issue of promptIssues) {
        updateIssueMap(allIssues, issue);
      }
    }

    // Extract from directory path
    if (prompt.cwd) {
      const pathIssues = extractFromPath(prompt.cwd, patterns);
      for (const issue of pathIssues) {
        updateIssueMap(allIssues, issue);
      }
    }
  }

  return Array.from(allIssues.values());
}

/**
 * Updates issue map, keeping highest confidence for each key
 */
function updateIssueMap(map, issue) {
  const existing = map.get(issue.issueKey);

  if (!existing || issue.confidence > existing.confidence) {
    map.set(issue.issueKey, issue);
  } else if (existing && issue.confidence === existing.confidence) {
    // Keep both sources
    existing.source = `${existing.source},${issue.source}`;
  }
}

/**
 * Validates issue key format (1-3 letters, dash, numbers)
 */
export function isValidIssueKey(key) {
  return /^[A-Z]{1,3}-\d+$/i.test(key);
}

export default {
  extractFromBranch,
  extractFromCommitMessage,
  extractFromPrompt,
  extractFromPath,
  extractFromSession,
  isValidIssueKey
};
