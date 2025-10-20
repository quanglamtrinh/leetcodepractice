# Contributing to LeetCode Practice App

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Getting Started

### Prerequisites

- Node.js 14+ installed
- PostgreSQL 12+ installed
- Git installed
- Basic knowledge of JavaScript and SQL

### Setup Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/leetcodepractice.git
   cd leetcodepractice
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/penguingm1/leetcodepractice.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

6. **Set up database**:
   ```bash
   npm run setup
   ```

7. **Start development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

### Sync with Upstream

Before starting work, sync your fork:

```bash
git fetch upstream
git checkout main
git rebase upstream/main
git push origin main
```

### Create Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### Make Changes

1. Write code following the [Code Style](#code-style)
2. Test your changes thoroughly
3. Add tests if applicable
4. Update documentation as needed

### Commit Changes

Follow the [Commit Convention](#commit-convention):

```bash
git add .
git commit -m "feat(api): add pagination to problems endpoint"
```

### Push and Create Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub.

## Commit Convention

We use **Conventional Commits** for clear, structured commit messages.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling
- `ci`: CI/CD changes

### Scopes

- `api`: Backend API changes
- `db`: Database changes
- `ui`: Frontend UI changes
- `docker`: Docker-related changes
- `ci`: CI/CD pipeline changes

### Examples

```bash
feat(api): add endpoint for filtering problems by difficulty
fix(db): handle null values in popularity column
docs(readme): add curl examples for API endpoints
chore(deps): update express to v4.18.3
refactor(api): extract database queries to separate module
```

### Breaking Changes

For breaking changes, add `BREAKING CHANGE:` in the footer:

```
feat(api): change progress endpoint response format

BREAKING CHANGE: The /api/problems/:id/progress endpoint now returns
an object instead of a boolean for the solved field.
```

## Branch Naming

### Convention

```
<type>/<short-description>
```

### Types

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks
- `refactor/` - Code refactoring
- `test/` - Test additions
- `hotfix/` - Urgent fixes for production

### Examples

```
feat/add-user-authentication
fix/problem-sorting-bug
docs/update-api-documentation
chore/update-dependencies
refactor/extract-db-module
```

## Pull Request Process

### Before Submitting

1. **Rebase on latest main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests** (if applicable):
   ```bash
   npm test
   ```

3. **Check code style**:
   ```bash
   npm run lint
   npm run format:check
   ```

4. **Update documentation** if needed

### PR Title Format

Use the same convention as commits:

```
feat(api): add pagination support
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] All tests passing

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
```

### Review Process

1. Maintainer will review your PR
2. Address any feedback or requested changes
3. Once approved, it will be merged
4. PR will be squashed and merged with a clean commit message

## Code Style

### JavaScript

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes
  - `UPPER_CASE` for constants

### SQL

- **Keywords**: UPPERCASE (`SELECT`, `FROM`, `WHERE`)
- **Table/Column names**: lowercase with underscores
- **Indentation**: 2 spaces

### File Organization

- One main export per file
- Group related functions
- Keep files under 500 lines when possible

### Comments

```javascript
// Single-line comments for brief explanations

/**
 * Multi-line JSDoc comments for functions
 * @param {number} id - Problem ID
 * @returns {Promise<Object>} Problem data
 */
async function getProblem(id) {
  // Implementation
}
```

## Testing Guidelines

### Unit Tests

Test individual functions in isolation:

```javascript
describe('getProblemById', () => {
  it('should return problem when ID exists', async () => {
    const problem = await getProblemById(1);
    expect(problem).toBeDefined();
    expect(problem.id).toBe(1);
  });
});
```

### Integration Tests

Test API endpoints:

```javascript
describe('GET /api/problems', () => {
  it('should return list of problems', async () => {
    const response = await request(app).get('/api/problems');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

## Documentation

### When to Update Docs

- Adding new API endpoints → Update `docs/API.md`
- Changing architecture → Update `docs/ARCHITECTURE.md`
- Adding setup steps → Update `README.md`
- Deployment changes → Update `docs/DEPLOYMENT.md`

### Documentation Style

- Use clear, concise language
- Include code examples
- Add links to related docs
- Keep examples up-to-date

## Issue Guidelines

### Creating Issues

1. Search existing issues first
2. Use the issue template
3. Provide clear reproduction steps
4. Include environment details
5. Add relevant labels

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed

## Questions?

- Open a [GitHub Discussion](https://github.com/penguingm1/leetcodepractice/discussions)
- Ask in an issue
- Check existing documentation

---

Thank you for contributing! 🎉

