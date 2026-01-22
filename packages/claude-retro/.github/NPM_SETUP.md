# GitHub Actions NPM Publishing Setup

This document explains how to configure automatic NPM publishing via GitHub Actions.

## Workflow Overview

1. **Merge to `main`** → Version bump workflow runs
2. **Conventional commit** determines version bump type:
   - `feat:` or `feature:` → **minor** version bump (0.1.0 → 0.2.0)
   - `fix:`, `bugfix:`, etc. → **patch** version bump (0.1.0 → 0.1.1)
   - `feat!:` or `BREAKING CHANGE:` → **major** version bump (0.1.0 → 1.0.0)
3. **Tag is created** → Publish workflow triggers
4. **Package is published to NPM** → Done!

## Setup Instructions

### 1. Create NPM Access Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Click your profile → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select type: **Automation** (for CI/CD)
5. Copy the token (starts with `npm_...`)

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **Add secret**

### 3. Verify Workflows

The repository includes two workflows:

**`.github/workflows/version-bump.yml`**
- Triggers on push to `main`
- Bumps version based on commit message
- Creates and pushes git tag
- Creates GitHub release

**`.github/workflows/publish.yml`**
- Triggers on tag push (`v*`)
- Installs dependencies
- Publishes to NPM with `--access public`
- Updates GitHub release

### 4. Test the Workflow

1. Make a change and commit with a conventional commit message:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

2. Watch the Actions tab in GitHub:
   - Version bump workflow should run
   - Tag should be created (e.g., `v0.2.0`)
   - Publish workflow should trigger
   - Package should appear on npmjs.com

### 5. Skip Version Bump

To merge without bumping version, include `[skip version]` or `[skip ci]` in commit message:

```bash
git commit -m "docs: update README [skip version]"
```

## Conventional Commit Format

Use these prefixes in commit messages:

- `feat:` - New feature (minor bump)
- `fix:` - Bug fix (patch bump)
- `perf:` - Performance improvement (patch bump)
- `docs:` - Documentation only (patch bump)
- `style:` - Code style changes (patch bump)
- `refactor:` - Code refactoring (patch bump)
- `test:` - Adding tests (patch bump)
- `chore:` - Build/tooling changes (patch bump)
- `feat!:` or `BREAKING CHANGE:` - Breaking changes (major bump)

**Examples:**
```bash
git commit -m "feat: add Jira integration"           # 0.1.0 → 0.2.0
git commit -m "fix: correct session grouping"        # 0.1.0 → 0.1.1
git commit -m "feat!: change API interface"          # 0.1.0 → 1.0.0
git commit -m "docs: update README [skip version]"   # No version bump
```

## Manual Publishing (Fallback)

If you need to publish manually:

```bash
# Ensure you're logged in
npm login

# Bump version
npm version patch  # or minor/major

# Publish
npm publish --access public

# Push tag
git push --follow-tags
```

## Troubleshooting

### NPM publish fails with 403

- Check that `NPM_TOKEN` secret is set correctly
- Verify token has not expired
- Ensure token has automation/publish permissions

### Version bump fails

- Check that github-actions bot has permission to push
- Verify no branch protection rules prevent bot pushes
- Check commit message follows conventional format

### Workflow doesn't trigger

- Ensure workflows are in `.github/workflows/`
- Check that YAML is valid
- Verify branch name is exactly `main`
- Check Actions are enabled in repository settings

## Security Notes

- **Never commit NPM tokens to git**
- Use GitHub Secrets for all sensitive data
- Use Automation tokens (not personal tokens) for CI/CD
- Regularly rotate tokens (every 6-12 months)
- Limit token permissions to only what's needed
