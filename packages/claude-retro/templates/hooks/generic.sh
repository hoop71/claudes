#!/bin/bash
# Generic claude-retro hook template
# Adapt this for your development tool's hook system

# Configuration
# You can customize how your tool provides the prompt data
# Common options:
#   - Read from stdin
#   - Read from command-line arguments
#   - Read from environment variables
#   - Read from a temporary file

# Example 1: Read prompt from command-line argument
PROMPT="$1"

# Example 2: Read prompt from stdin (uncomment if needed)
# PROMPT=$(cat)

# Example 3: Read from environment variable (uncomment if needed)
# PROMPT="$MY_TOOL_PROMPT"

# Get current timestamp
TIMESTAMP=$(date +%s)

# Session ID (use a unique identifier for your tool)
# You could use process ID, timestamp, or a custom session identifier
SESSION_ID="${CLAUDE_RETRO_SESSION:-default}"

# Get current working directory
CWD="${PWD}"

# Optional: Extract git context if available
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

# Create JSON payload using jq
# If jq is not available, you can use alternative JSON generation methods
if command -v jq &> /dev/null; then
  JSON=$(jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg session_id "$SESSION_ID" \
    --arg prompt "$PROMPT" \
    --arg cwd "$CWD" \
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

  # Send to claude-retro via JSON stdin
  echo "$JSON" | claude-retro capture --json
else
  # Fallback: Use command-line args (no jq required)
  claude-retro capture \
    --prompt "$PROMPT" \
    --cwd "$CWD"
fi

# Always exit successfully to not block your tool
exit 0
