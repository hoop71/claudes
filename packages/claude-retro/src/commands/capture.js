import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { loadConfig, getDefaultConfigPath } from '../../lib/config.js';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function getLogPath(config) {
  const dataDir = config.dataDir.replace('~', process.env.HOME);
  const logsDir = join(dataDir, 'logs');

  // Ensure logs directory exists
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  // Create monthly log files
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return join(logsDir, `prompts-${yearMonth}.jsonl`);
}

function truncatePrompt(prompt, mode) {
  if (mode === 'minimal') {
    return null;
  } else if (mode === 'summary') {
    return prompt.substring(0, 200);
  }
  return prompt; // full mode
}

export async function captureCommand(options) {
  try {
    // Load config (with fallback to default)
    let config;
    try {
      config = loadConfig();
    } catch (error) {
      // If no config exists, use minimal defaults
      const defaultPath = getDefaultConfigPath();
      console.error(`Warning: No config found at ${defaultPath}. Using defaults.`);
      config = {
        dataDir: dirname(defaultPath).replace(process.env.HOME, '~'),
        privacyMode: 'summary'
      };
    }

    let data;

    if (options.json) {
      // Read JSON from stdin (Claude Code hook format)
      const input = await readStdin();
      data = JSON.parse(input);
    } else {
      // Build from command-line args
      data = {
        timestamp: Date.now() / 1000,
        session_id: process.env.CLAUDE_RETRO_SESSION || 'default',
        user_prompt: options.prompt || '',
        cwd: options.cwd || process.cwd(),
        git_branch: '',
        git_remote: ''
      };
    }

    // Apply privacy mode
    const logEntry = {
      timestamp: data.timestamp,
      session_id: data.session_id,
      user_prompt: truncatePrompt(data.user_prompt || '', config.privacyMode),
      prompt_length: (data.user_prompt || '').length,
      cwd: data.cwd,
      git_branch: data.git_branch || '',
      git_remote: data.git_remote || ''
    };

    // Append to log file
    const logPath = getLogPath(config);
    appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');

    // Silent success (hooks should be fast and quiet)
    process.exit(0);
  } catch (error) {
    // Log errors to stderr but don't block the hook
    console.error('claude-retro capture error:', error.message);
    process.exit(0); // Exit successfully to not block the parent tool
  }
}
