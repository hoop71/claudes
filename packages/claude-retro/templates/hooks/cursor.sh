#!/bin/bash
# Cursor on-prompt hook (experimental)
# Captures prompts and sends to claude-retro for retrospective tracking

# Note: Cursor's hook system may be different from Claude Code
# This is a template that may need adaptation

# Read prompt from stdin or arguments
PROMPT="$*"
if [ -z "$PROMPT" ]; then
  PROMPT=$(cat)
fi

# Get git context
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

# Create JSON payload
JSON=$(jq -n \
  --arg timestamp "$(date +%s)" \
  --arg session_id "${CLAUDE_RETRO_SESSION:-cursor-session}" \
  --arg prompt "$PROMPT" \
  --arg cwd "$PWD" \
  --arg git_branch "$GIT_BRANCH" \
  --arg git_remote "$GIT_REMOTE" \
  '{
    timestamp: ($timestamp | tonumber),
    session_id: $session_id,
    user_prompt: $prompt,
    cwd: $cwd,
    git_branch: $git_branch,
    git_remote: $git_remote
  }')

# Send to claude-retro
echo "$JSON" | claude-retro capture --json

exit 0
