#!/bin/bash
# Claude Code UserPromptSubmit hook
# Captures prompts and sends to claude-retro for retrospective tracking

# Read the JSON input from Claude Code
INPUT=$(cat)

# Pass it to claude-retro capture command
echo "$INPUT" | claude-retro capture --json

# Always exit 0 to not block Claude Code
exit 0
