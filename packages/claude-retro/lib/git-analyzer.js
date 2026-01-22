import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Checks if directory is a git repository
 */
export function isGitRepo(repoPath) {
  const gitDir = join(repoPath, '.git');
  return existsSync(gitDir);
}

/**
 * Gets commits from a git repository within a time range
 *
 * @param {string} repoPath - Path to git repository
 * @param {number} startTime - Unix timestamp (seconds)
 * @param {number} endTime - Unix timestamp (seconds)
 * @returns {Array} Array of commit objects
 */
export function getCommits(repoPath, startTime, endTime) {
  if (!isGitRepo(repoPath)) {
    return [];
  }

  try {
    // Git log format: hash|timestamp|author|message
    const format = '%H|%at|%an|%s';
    const since = new Date(startTime * 1000).toISOString();
    const until = new Date(endTime * 1000).toISOString();

    const cmd = `git log --all --format="${format}" --since="${since}" --until="${until}"`;
    const output = execSync(cmd, {
      cwd: repoPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    if (!output.trim()) {
      return [];
    }

    const commits = output
      .trim()
      .split('\n')
      .map(line => {
        const [hash, timestamp, author, message] = line.split('|');
        return {
          commit_hash: hash,
          timestamp: parseInt(timestamp),
          author,
          message,
          repo_path: repoPath
        };
      });

    return commits;
  } catch (error) {
    console.error(`Failed to get commits from ${repoPath}:`, error.message);
    return [];
  }
}

/**
 * Gets current branch name
 */
export function getCurrentBranch(repoPath) {
  if (!isGitRepo(repoPath)) {
    return null;
  }

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf-8'
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Gets remote URL
 */
export function getRemoteUrl(repoPath) {
  if (!isGitRepo(repoPath)) {
    return null;
  }

  try {
    return execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf-8'
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Gets commits for multiple repositories
 */
export function getCommitsFromRepos(repoPaths, startTime, endTime) {
  const allCommits = [];
  const uniqueRepos = [...new Set(repoPaths.filter(Boolean))];

  for (const repoPath of uniqueRepos) {
    const commits = getCommits(repoPath, startTime, endTime);
    allCommits.push(...commits);
  }

  // Sort by timestamp
  return allCommits.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Gets commit statistics
 */
export function getCommitStats(repoPath, commitHash) {
  if (!isGitRepo(repoPath)) {
    return null;
  }

  try {
    const output = execSync(`git show --stat --format="" ${commitHash}`, {
      cwd: repoPath,
      encoding: 'utf-8'
    });

    // Parse files changed, insertions, deletions
    const lines = output.trim().split('\n');
    const stats = {
      files_changed: 0,
      insertions: 0,
      deletions: 0
    };

    for (const line of lines) {
      if (line.includes('changed')) {
        const match = line.match(/(\d+) file.*changed/);
        if (match) stats.files_changed = parseInt(match[1]);

        const insertMatch = line.match(/(\d+) insertion/);
        if (insertMatch) stats.insertions = parseInt(insertMatch[1]);

        const deleteMatch = line.match(/(\d+) deletion/);
        if (deleteMatch) stats.deletions = parseInt(deleteMatch[1]);
      }
    }

    return stats;
  } catch {
    return null;
  }
}

export default {
  isGitRepo,
  getCommits,
  getCurrentBranch,
  getRemoteUrl,
  getCommitsFromRepos,
  getCommitStats
};
