# Contributing to Claude Retro

Thank you for considering contributing to Claude Retro! This document provides guidelines and information for contributors.

## Code of Conduct

Be respectful, professional, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/hoop71/claudes/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node version, tool being integrated)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/hoop71/claudes.git
   cd claudes/packages/claude-retro
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

   **Commit message guidelines:**
   - Use present tense ("Add feature" not "Added feature")
   - Be concise but descriptive
   - Reference issues when applicable (#123)

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a Pull Request on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/examples if applicable

## Development Setup

### Prerequisites

- Node.js 22+
- git
- jq (for testing hooks)

### Install Dependencies

```bash
cd packages/claude-retro
npm install
```

### Link for Local Testing

```bash
npm link
```

Now `claude-retro` command will use your local development version.

### Running Tests

```bash
npm test
```

### Testing CLI Commands

```bash
# Test init
claude-retro init

# Test capture (manual)
echo '{"timestamp":1234567890,"session_id":"test","user_prompt":"test prompt","cwd":"/tmp"}' | \
  claude-retro capture --json

# Test process
claude-retro process

# Test report
claude-retro report --days 1
```

### Testing Hooks

```bash
# Install hook
claude-retro hook install claude-code

# Test hook
claude-retro hook test

# Verify capture
cat ~/.claude-retro/logs/*.jsonl
```

## Project Structure

```
claude-retro/
├── bin/                  # CLI entry point
│   └── claude-retro.js
├── lib/                  # Core library
│   ├── config.js         # Configuration management
│   ├── log-parser.js     # JSONL parsing
│   ├── time-calculator.js # Session grouping
│   ├── issue-extractor.js # Issue detection
│   └── git-analyzer.js   # Git operations
├── src/                  # Source files
│   ├── commands/         # CLI commands
│   ├── database.js       # SQLite schema
│   ├── processor.js      # Log processor
│   ├── reporter.js       # Report generator
│   ├── query.js          # Database queries
│   └── jira-client.js    # Jira API client
├── templates/            # Hook templates
│   └── hooks/
├── config/              # Config schema
│   └── schema.json
├── index.js             # Programmatic API
└── package.json
```

## Coding Standards

### JavaScript Style

- Use ES modules (`import`/`export`)
- Use async/await for async code
- Use descriptive variable names
- Add JSDoc comments for public functions
- Prefer `const` over `let`, avoid `var`

### Example:

```javascript
/**
 * Groups prompts into sessions based on time gaps
 *
 * @param {Array} prompts - Array of prompt entries
 * @param {number} gapMinutes - Max gap between prompts in same session
 * @returns {Array} Array of session objects
 */
export function groupSessions(prompts, gapMinutes = 30) {
  // Implementation
}
```

### Error Handling

- Always handle errors gracefully
- Provide helpful error messages
- Use try/catch for async operations
- Don't let hooks fail silently

### Performance

- Hooks must be < 10ms overhead
- Avoid synchronous operations in capture
- Use database indexes for queries
- Process logs asynchronously

## Documentation

When adding features:

1. Update README.md with new CLI commands/options
2. Update API documentation in index.js JSDoc comments
3. Add examples to templates/hooks/README.md if hook-related
4. Update CHANGELOG.md

## Testing Guidelines

### Manual Testing Checklist

Before submitting PR:

- [ ] `claude-retro init` works
- [ ] Hook installation works
- [ ] Capture stores data correctly
- [ ] Processing creates database entries
- [ ] Reports generate successfully
- [ ] Config validation works
- [ ] Backward compatibility maintained

### Integration Testing

Test with actual tools:

1. Install hook in Claude Code
2. Generate real prompts
3. Process logs
4. Generate report
5. Verify data accuracy

## Adding New Integrations

When adding support for a new tool:

1. Create hook template in `templates/hooks/{tool}.sh`
2. Add tool to `HOOK_LOCATIONS` in `src/commands/hook.js`
3. Test the integration thoroughly
4. Document in README.md and templates/hooks/README.md
5. Add example to CONTRIBUTING.md

## Release Process

(For maintainers)

1. Update version in package.json
2. Update CHANGELOG.md
3. Commit: `git commit -m "chore: bump version to x.y.z"`
4. Tag: `git tag vx.y.z`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`

## Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
