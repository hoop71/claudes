# Contributing to Claudes

Thank you for your interest in contributing!

## Monorepo Structure

This repository contains multiple packages:

```
claudes/
├── packages/
│   └── claude-retro/     # Automated developer retrospectives
└── README.md
```

Each package has its own contributing guidelines. See the package's `CONTRIBUTING.md` for specific details.

## General Guidelines

### Reporting Issues

- Check if the issue already exists
- Use the package name in the title (e.g., "[claude-retro] Bug in report generation")
- Provide clear reproduction steps
- Include your environment details

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Follow the package's coding standards
5. Commit with conventional commits format
6. Push and create a PR

### Conventional Commits

Use conventional commit format:

```
<type>(<scope>): <description>

Examples:
feat(claude-retro): add Linear integration
fix(claude-retro): correct session grouping
docs(claude-retro): update README
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `chore`: Tooling/build
- `refactor`: Code refactoring
- `test`: Tests
- `perf`: Performance

**Scopes:**
- Use package name (e.g., `claude-retro`)

## Development

```bash
# Clone
git clone https://github.com/hoop71/claudes.git
cd claudes

# Work on a package
cd packages/claude-retro
npm install
npm link

# Make changes and test
# ...

# Commit with conventional format
git commit -m "feat(claude-retro): add new feature"
```

## Publishing

Publishing is automated via GitHub Actions. When you merge to `main` with a conventional commit, the appropriate package version will bump and publish automatically.

## Questions?

- Open an issue
- Check package-specific docs
- Review existing issues/PRs

## Code of Conduct

Be respectful, professional, and constructive in all interactions.

## License

By contributing, you agree that your contributions will be licensed under the same license as the package (typically MIT).
