# Git Workflow Guide

This guide explains the Git workflow used in this project.

## Branch Strategy

### Main Branches

- `main`: Production-ready code
- `develop`: Integration branch for features (optional)

### Feature Branches

Create feature branches from `main`:

```bash
git checkout main
git pull origin main
git checkout -b <type>/<description>
```

### Branch Types

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `chore/` - Maintenance, tooling
- `refactor/` - Code refactoring
- `test/` - Test additions
- `hotfix/` - Critical production fixes
- `security/` - Security improvements

### Examples

```bash
git checkout -b feat/add-user-authentication
git checkout -b fix/pagination-bug
git checkout -b docs/update-api-docs
git checkout -b chore/upgrade-dependencies
```

## Commit Messages

### Conventional Commits Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add pagination to problems endpoint` |
| `fix` | Bug fix | `fix(db): handle null popularity values` |
| `docs` | Documentation | `docs(readme): add deployment instructions` |
| `style` | Code style | `style(api): format code with prettier` |
| `refactor` | Code restructure | `refactor(api): extract database queries` |
| `perf` | Performance | `perf(db): add index on concept column` |
| `test` | Tests | `test(api): add tests for progress endpoint` |
| `chore` | Maintenance | `chore(deps): update express to 4.18.3` |
| `ci` | CI/CD | `ci(github): add automated testing workflow` |

### Scopes

- `api` - Backend API
- `db` - Database
- `ui` - Frontend UI
- `docker` - Docker configuration
- `ci` - CI/CD pipelines
- `docs` - Documentation

### Examples

```bash
# Simple feature
feat(api): add endpoint for problem recommendations

# Bug fix with details
fix(db): prevent duplicate problem entries

When importing CSV, duplicate problem IDs were causing
constraint violations. Added ON CONFLICT clause to handle updates.

Closes #42

# Breaking change
feat(api): restructure progress endpoint response

BREAKING CHANGE: The progress endpoint now returns an object
with additional metadata instead of a simple boolean.

Before: { "solved": true }
After: { "solved": true, "solved_at": "2025-10-20", "notes": "..." }
```

## Pull Request Workflow

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

### 2. Make Changes

```bash
# Make your changes
git add .
git commit -m "feat(scope): description"
```

### 3. Keep Branch Updated

```bash
git fetch origin
git rebase origin/main
```

### 4. Push Branch

```bash
git push origin feat/my-feature
```

### 5. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill out PR template
5. Request review

### 6. Address Feedback

```bash
# Make requested changes
git add .
git commit -m "fix(scope): address review comments"
git push origin feat/my-feature
```

### 7. Merge

Once approved, the PR will be merged with "Squash and Merge" to keep history clean.

## Keeping Fork Synced

If you forked the repository:

```bash
# Add upstream remote (one-time setup)
git remote add upstream https://github.com/penguingm1/leetcodepractice.git

# Sync your fork
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Common Workflows

### Working on Multiple Features

```bash
# Start feature 1
git checkout -b feat/feature-1
# Work on feature 1...
git push origin feat/feature-1

# Start feature 2 (from main, not feature-1)
git checkout main
git checkout -b feat/feature-2
# Work on feature 2...
```

### Updating Branch After Main Changes

```bash
git checkout feat/my-feature
git fetch origin
git rebase origin/main

# If conflicts occur
# Fix conflicts in files
git add .
git rebase --continue
```

### Squashing Commits Locally

If you have many small commits:

```bash
# Interactive rebase last 5 commits
git rebase -i HEAD~5

# Or rebase since branching from main
git rebase -i main
```

In the editor, change `pick` to `squash` for commits you want to combine.

## Release Process

### Creating a Release

1. **Update CHANGELOG.md** with version number and date
2. **Update package.json** version
3. **Create release commit**:
   ```bash
   git commit -m "chore(release): bump version to 2.0.0"
   ```
4. **Tag the release**:
   ```bash
   git tag -a v2.0.0 -m "Release version 2.0.0"
   git push origin v2.0.0
   ```
5. **Create GitHub Release** from the tag

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes

## Branch Protection Rules

For the `main` branch (configure on GitHub):

- [ ] Require pull request reviews (at least 1)
- [ ] Require status checks to pass (CI/CD)
- [ ] Require branches to be up to date
- [ ] Include administrators in restrictions
- [ ] Allow force pushes: NO
- [ ] Allow deletions: NO

## Best Practices

### Do's ✅

- Commit frequently with meaningful messages
- Keep commits focused and atomic
- Rebase before creating PR
- Write descriptive PR descriptions
- Link issues in PR
- Respond to code review feedback
- Keep branches short-lived (< 1 week)

### Don'ts ❌

- Don't commit directly to `main`
- Don't commit node_modules or .env
- Don't use generic commit messages ("update", "fix")
- Don't mix multiple features in one PR
- Don't force push to main
- Don't leave PRs open for weeks

## Troubleshooting

### Merge Conflicts

```bash
# Update your branch
git fetch origin
git rebase origin/main

# If conflicts occur
# 1. Open conflicted files
# 2. Resolve conflicts manually
# 3. Mark as resolved
git add <file>
git rebase --continue
```

### Accidentally Committed to Main

```bash
# Create feature branch with current changes
git branch feat/accidental-changes

# Reset main to remote
git checkout main
git reset --hard origin/main

# Continue work on feature branch
git checkout feat/accidental-changes
```

### Need to Change Last Commit Message

```bash
git commit --amend -m "new message"
git push --force-with-lease origin your-branch
```

---

For contribution guidelines, see [CONTRIBUTING.md](../CONTRIBUTING.md).

For commit examples, see the [Git log](https://github.com/penguingm1/leetcodepractice/commits/main).

