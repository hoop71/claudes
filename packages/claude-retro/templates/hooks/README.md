# Hook Templates

This directory contains hook templates for integrating claude-retro with various development tools.

## Available Templates

### claude-code.sh

For Claude Code (official CLI tool from Anthropic).

**Installation:**
```bash
claude-retro hook install claude-code
```

The hook will be installed to `~/.claude/hooks/UserPromptSubmit.sh` and will automatically capture all prompts.

### cursor.sh

For Cursor (AI code editor).

**Installation:**
```bash
claude-retro hook install cursor
```

**Note:** Cursor's hook system is experimental and may require adaptation.

### generic.sh

A generic template you can adapt for any development tool that supports hooks or callbacks.

**Usage:**
```bash
claude-retro hook install generic
```

This will display the template. Copy and adapt it for your tool.

## Adapting the Generic Template

The generic template shows several common patterns for capturing prompts:

1. **From command-line arguments** - Your tool passes the prompt as `$1`
2. **From stdin** - Your tool pipes the prompt
3. **From environment variables** - Your tool sets `$MY_TOOL_PROMPT`

### Example Adaptations

#### For a custom CLI tool:

```bash
#!/bin/bash
# In your tool's prompt handler
PROMPT="$*"
echo "$PROMPT" | claude-retro capture --json
```

#### For a VS Code extension:

```javascript
// In your extension's onPrompt handler
const { execSync } = require('child_process');

function capturePrompt(prompt) {
  const data = JSON.stringify({
    timestamp: Date.now() / 1000,
    session_id: 'vscode-session',
    user_prompt: prompt,
    cwd: workspace.rootPath,
    git_branch: getCurrentBranch(),
    git_remote: getGitRemote()
  });

  execSync('claude-retro capture --json', {
    input: data,
    stdio: ['pipe', 'ignore', 'ignore']
  });
}
```

#### For a web-based tool:

```javascript
// Send to a local endpoint that runs claude-retro
async function capturePrompt(prompt) {
  const data = {
    timestamp: Date.now() / 1000,
    session_id: 'web-session',
    user_prompt: prompt,
    cwd: '/path/to/project',
    git_branch: '',
    git_remote: ''
  };

  await fetch('http://localhost:3000/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

// Server-side (Express.js)
app.post('/capture', (req, res) => {
  const { spawn } = require('child_process');
  const proc = spawn('claude-retro', ['capture', '--json']);
  proc.stdin.write(JSON.stringify(req.body));
  proc.stdin.end();
  res.sendStatus(200);
});
```

## JSON Format

All hooks should send data in this JSON format:

```json
{
  "timestamp": 1234567890.123,
  "session_id": "unique-session-id",
  "user_prompt": "The prompt text",
  "cwd": "/path/to/working/directory",
  "git_branch": "feature-branch",
  "git_remote": "https://github.com/user/repo.git"
}
```

Fields:
- `timestamp` - Unix timestamp (seconds, can be fractional)
- `session_id` - Unique identifier for the session (helps group prompts)
- `user_prompt` - The prompt text (will be truncated based on privacy settings)
- `cwd` - Current working directory
- `git_branch` - Current git branch (optional)
- `git_remote` - Git remote URL (optional)

## Performance Considerations

Hooks should be fast (<10ms) to not impact user experience:

- The `claude-retro capture` command is optimized for speed (~1-2ms)
- It appends to a log file without database access
- Processing happens later via `claude-retro process`

## Privacy

The privacy mode in your config determines how much prompt data is stored:

- **minimal** - Only timestamp and length
- **summary** - First 200 characters
- **full** - Complete prompt text

The hook always sends the full prompt, but `claude-retro capture` applies the privacy filter before storing.

## Testing

Test your hook integration:

```bash
# Test the capture command
claude-retro hook test

# Check that data was captured
claude-retro process
claude-retro report --days 1
```

## Troubleshooting

### Hook not capturing data

1. Check hook is installed and executable:
   ```bash
   ls -la ~/.claude/hooks/UserPromptSubmit.sh
   ```

2. Test manually:
   ```bash
   echo '{"timestamp":1234567890,"session_id":"test","user_prompt":"test","cwd":"/tmp"}' | claude-retro capture --json
   ```

3. Check logs:
   ```bash
   ls ~/.claude-retro/logs/
   ```

### Permission errors

Ensure the hook script is executable:
```bash
chmod +x ~/.claude/hooks/UserPromptSubmit.sh
```

### jq not found

Install jq (required for bash hooks):
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq  # Debian/Ubuntu
sudo yum install jq      # RedHat/CentOS
```

Or use the command-line args fallback (no jq required):
```bash
claude-retro capture --prompt "$PROMPT" --cwd "$PWD"
```
