# Claude Retro

[![npm version](https://badge.fury.io/js/@hoop71%2Fclaude-retro.svg)](https://www.npmjs.com/package/@hoop71/claude-retro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)

> Automated developer retrospectives for any coding tool

Claude Retro automatically tracks your development work across git commits, issue trackers, and coding sessions - then generates insightful retrospective reports to help you understand where your time goes.

## Features

- **Automated Time Tracking** - Captures development sessions from any tool via simple hooks
- **Git Integration** - Correlates sessions with commits automatically
- **Issue Tracker Integration** - Links work to Jira issues (more trackers coming soon)
- **Privacy First** - Configurable privacy modes (minimal/summary/full)
- **Fast & Lightweight** - < 2ms overhead per prompt capture
- **Flexible** - CLI, programmatic API, and hook templates for any tool
- **Local-First** - All data stored locally in SQLite

## Quick Start

### Installation

```bash
npm install -g @hoop71/claude-retro
```

**Requirements:**
- Node.js 22+ (for built-in SQLite support)
- git
- jq (optional, for bash hooks)

### Setup

Run the interactive setup wizard:

```bash
claude-retro init
```

This will:
1. Create your configuration file
2. Set up the data directory
3. Initialize the database
4. Optionally configure Jira integration

### Install Hook

Install a hook for your development tool:

```bash
# For Claude Code
claude-retro hook install claude-code

# For Cursor (experimental)
claude-retro hook install cursor

# For other tools
claude-retro hook install generic  # Shows template to adapt
```

### Generate Reports

After working for a while, process your data and generate a report:

```bash
# Process logs into database
claude-retro process

# Generate last 7 days report
claude-retro report

# Generate custom date range
claude-retro report --start 2025-01-01 --end 2025-01-31

# Watch mode: auto-process logs every minute
claude-retro process --watch
```

## CLI Reference

### `claude-retro init`

Interactive setup wizard. Creates configuration file and initializes database.

**Options:**
- `--tool <name>` - Automatically install hook for specified tool

**Example:**
```bash
claude-retro init --tool claude-code
```

### `claude-retro capture`

Captures a prompt (used by hooks). You typically don't call this directly.

**Options:**
- `--json` - Read JSON data from stdin
- `--prompt <text>` - Prompt text (when not using JSON)
- `--cwd <path>` - Working directory

**Example:**
```bash
echo '{"timestamp":1234567890,"session_id":"test","user_prompt":"Hello","cwd":"/tmp"}' | \
  claude-retro capture --json
```

### `claude-retro process`

Processes log files into the database.

**Options:**
- `--watch` - Continuous processing mode
- `--interval <minutes>` - Polling interval in watch mode (default: 1)

**Example:**
```bash
# Process once
claude-retro process

# Watch and auto-process
claude-retro process --watch --interval 5
```

### `claude-retro report`

Generates retrospective reports.

**Options:**
- `-d, --days <number>` - Number of days to include (default: 7)
- `--start <date>` - Start date (YYYY-MM-DD)
- `--end <date>` - End date (YYYY-MM-DD)
- `-f, --format <format>` - Output format: markdown or json (default: markdown)

**Example:**
```bash
# Last 7 days
claude-retro report

# Last 30 days
claude-retro report --days 30

# Specific date range
claude-retro report --start 2025-01-01 --end 2025-01-15

# JSON output for custom processing
claude-retro report --days 7 --format json
```

### `claude-retro hook`

Hook management.

**Actions:**
- `install <tool>` - Install hook for a tool
- `uninstall <tool>` - Remove hook
- `test` - Test hook integration

**Tools:**
- `claude-code` - Claude Code official CLI
- `cursor` - Cursor AI editor
- `generic` - Show generic template

**Example:**
```bash
claude-retro hook install claude-code
claude-retro hook test
claude-retro hook uninstall claude-code
```

### `claude-retro config`

Configuration management.

**Options:**
- `--show` - Show current configuration (as JSON)
- `--path` - Show configuration file path
- `--validate` - Validate configuration

**Example:**
```bash
# Show config location
claude-retro config --path

# Validate config
claude-retro config --validate

# Show full config
claude-retro config --show
```

## Configuration

Configuration is stored in `~/.claude-retro/config.json` by default.

### Configuration File Format

```json
{
  "dataDir": "~/.claude-retro",
  "privacyMode": "summary",
  "timezone": "America/New_York",
  "sessionGapMinutes": 30,
  "issueKeyPatterns": ["PROJ-\\d+", "TASK-\\d+"],
  "weeklyReportDay": "Friday",
  "weeklyReportTime": "15:00",
  "jiraUrl": "https://yourcompany.atlassian.net",
  "jiraUsername": "you@company.com",
  "jiraApiToken": "your-api-token-or-1password-ref"
}
```

### Privacy Modes

- **minimal** - Only stores timestamp and prompt length
- **summary** - Stores first 200 characters of prompts (recommended)
- **full** - Stores complete prompt text

### 1Password Integration

You can store sensitive credentials (like Jira API tokens) in 1Password:

```json
{
  "jiraApiToken": "op://vault/item/field?account=yourcompany.1password.com"
}
```

The `op://` references are automatically resolved when loading config.

### Environment Variables

- `CLAUDE_RETRO_CONFIG` - Override config file location
- `DEV_RETRO_CONFIG` - Alternative config location
- `CLAUDE_RETRO_SESSION` - Override session ID in hooks

## Integration Guides

### Claude Code

Claude Code integration is native and automatic:

```bash
# Install hook
claude-retro hook install claude-code

# Start using Claude Code normally
claude

# Process and generate reports
claude-retro process
claude-retro report
```

### Cursor

Cursor integration is experimental:

```bash
claude-retro hook install cursor
```

Note: Cursor's hook system may require manual adaptation.

### Custom Tools

For other tools, use the generic template:

```bash
# Show generic template
claude-retro hook install generic

# Copy template and adapt for your tool
# See templates/hooks/README.md for examples
```

### VS Code Extension

Example integration in a VS Code extension:

```javascript
const { exec } = require('child_process');

function capturePrompt(prompt) {
  const data = {
    timestamp: Date.now() / 1000,
    session_id: 'vscode',
    user_prompt: prompt,
    cwd: vscode.workspace.rootPath,
    git_branch: getCurrentBranch(),
    git_remote: getGitRemote()
  };

  exec('claude-retro capture --json', {
    input: JSON.stringify(data)
  });
}
```

### Web Application

Example integration via HTTP endpoint:

```javascript
// Frontend
async function capturePrompt(prompt) {
  await fetch('/api/retro/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
}

// Backend (Express)
app.post('/api/retro/capture', (req, res) => {
  const { spawn } = require('child_process');
  const data = {
    timestamp: Date.now() / 1000,
    session_id: req.session.id,
    user_prompt: req.body.prompt,
    cwd: process.cwd()
  };

  const proc = spawn('claude-retro', ['capture', '--json']);
  proc.stdin.write(JSON.stringify(data));
  proc.stdin.end();

  res.sendStatus(200);
});
```

## Programmatic API

Claude Retro can also be used as a library:

```javascript
import {
  loadConfig,
  initDatabase,
  parseLogFile,
  groupSessions,
  getSessions,
  getWorkByIssue
} from '@hoop71/claude-retro';

// Load config
const config = loadConfig();

// Get database connection
const dbPath = `${config.dataDir}/retro.db`;
const db = initDatabase(dbPath);

// Parse log files
const entries = parseLogFile('~/.claude-retro/logs/prompts-2025-01.jsonl');
const sessions = groupSessions(entries, config.sessionGapMinutes);

// Query database
const startDate = new Date('2025-01-01');
const endDate = new Date('2025-01-31');

const dbSessions = getSessions(db, startDate, endDate);
const workByIssue = getWorkByIssue(db, startDate, endDate);

console.log(`Sessions: ${dbSessions.length}`);
console.log(`Issues: ${Object.keys(workByIssue).length}`);
```

See [API Documentation](./docs/API.md) for complete API reference.

## Data Storage

All data is stored locally in:

```
~/.claude-retro/
├── config.json          # Configuration
├── data/
│   ├── retro.db        # SQLite database
│   └── logs/           # JSONL log files
│       ├── prompts-2025-01.jsonl
│       ├── prompts-2025-02.jsonl
│       └── .processed/  # Archived processed logs
```

## Privacy & Security

- **Local-First**: All data stays on your machine
- **Configurable Privacy**: Choose how much data to store
- **Secure Credentials**: Use 1Password references for API tokens
- **No Telemetry**: We don't collect any usage data
- **Open Source**: Audit the code yourself

## Development

### Building from Source

```bash
git clone https://github.com/hoop71/claudes.git
cd claudes/packages/claude-retro
npm install
npm link
```

### Running Tests

```bash
npm test
```

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## FAQ

### How much overhead does hook capture add?

< 2ms per prompt. The capture command just appends to a JSONL file without database access.

### Can I use this without Jira?

Yes! Jira integration is optional. Without it, you'll still get session tracking and git commit correlation.

### Where can I see an example report?

Run `claude-retro report` after capturing some work. Reports show:
- Total time spent
- Sessions by issue/project
- Commits by session
- Untracked work
- Time distribution

### Can I migrate from the Claude Code plugin?

Yes! The package automatically checks for existing config at `~/.claude/plugins/claude-retro/config.json` and migrates it.

### How do I backup my data?

Simply backup `~/.claude-retro/`:
```bash
tar -czf claude-retro-backup.tar.gz ~/.claude-retro/
```

### Can I customize report format?

Yes! Use `--format json` to get raw data and format it however you like:
```bash
claude-retro report --format json | jq '.sessions'
```

## License

MIT © 2026

## Links

- [GitHub Repository](https://github.com/hoop71/claudes)
- [NPM Package](https://www.npmjs.com/package/@hoop71/claude-retro)
- [Issue Tracker](https://github.com/hoop71/claudes/issues)
- [Contributing Guide](./CONTRIBUTING.md)
