# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-21

### Added
- Initial release of claude-retro
- CLI with commands: init, capture, process, report, hook, config
- Hook templates for Claude Code, Cursor, and generic tools
- Programmatic API for custom integrations
- Privacy-first design with configurable data storage (minimal/summary/full)
- Git integration for automatic commit correlation
- Jira integration for issue tracking
- 1Password support for secure credential storage
- Local SQLite database for data storage
- Session grouping and time tracking
- Markdown report generation

### Features
- **CLI Commands:**
  - `claude-retro init` - Interactive setup wizard
  - `claude-retro capture` - Prompt capture for hooks
  - `claude-retro process` - Log processing with watch mode
  - `claude-retro report` - Flexible report generation
  - `claude-retro hook` - Hook installation and management
  - `claude-retro config` - Configuration management

- **Integrations:**
  - Claude Code (native support)
  - Cursor (experimental)
  - Generic hook template for custom tools
  - Jira API integration
  - 1Password CLI integration

- **Privacy:**
  - Configurable privacy modes
  - Local-only data storage
  - No telemetry

- **Developer Experience:**
  - Comprehensive documentation
  - Hook templates with examples
  - Programmatic API
  - Open source (MIT license)

[0.1.0]: https://github.com/hoop71/claude-retro/releases/tag/v0.1.0
