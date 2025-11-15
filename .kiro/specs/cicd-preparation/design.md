# Design Document

## Overview

This design outlines the approach for cleaning up the LeetCode Practice repository by removing debug/test files, organizing documentation, and preparing the codebase for CI/CD deployment. The cleanup will be performed through a systematic file removal and organization process.

## Architecture

The cleanup process consists of three main phases:

1. **File Identification Phase**: Scan and categorize files to be removed or moved
2. **Cleanup Execution Phase**: Remove debug/test files and organize documentation
3. **Configuration Update Phase**: Update .gitignore to prevent future clutter

### Component Diagram

```
┌─────────────────────────────────────────┐
│         Cleanup Process                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  1. File Identification          │  │
│  │     - Scan root directory        │  │
│  │     - Categorize files           │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │  2. Cleanup Execution            │  │
│  │     - Remove test files          │  │
│  │     - Remove debug files         │  │
│  │     - Organize documentation     │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │  3. Configuration Update         │  │
│  │     - Update .gitignore          │  │
│  │     - Document changes           │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### File Categories

#### Debug Files (To Remove)
- `debug-*.js` - Debug scripts
- `debug_*.py` - Python debug scripts
- `check-*.js` - Schema checking scripts
- `verify-*.js` - Verification scripts
- `diagnose-*.js` - Diagnostic scripts
- `console-test-*.js` - Console test scripts

#### Test Files (To Remove)
- `test-*.html` - Manual test pages
- `test-*.js` - Test scripts (excluding proper test suites in client/)
- `test_*.js` - Alternative test naming pattern
- `comprehensive-notes-test.html` - Specific test file
- `quick-fix-test.html` - Quick test file

#### Temporary Setup/Apply Scripts (To Remove)
- `apply-calendar-schema.js`
- `apply-comprehensive-schema.js`
- `apply-schema-incremental.js`
- `apply-schema-update.js`
- `apply-spaced-repetition-schema.js`
- `setup-comprehensive-database.js`
- `add-test-button.js`
- `create-fallback-notes-tab.js`
- `run-calendar-api-tests.js`
- `fix-notes-tab.js`
- `fix-review-patterns.js`
- `fix-review-patterns-v2.js`
- `enhanced-notes-integration.js`
- `enhanced-notes-react-integration.js`
- `enhanced-notes-standalone.js`
- `enhanced-tabs-react-integration.js`

#### Documentation Files (To Organize)
Move to `docs/implementation-history/`:
- `*_SUMMARY.md` files
- `*_FIX.md` files
- `*_IMPLEMENTATION*.md` files
- `*_COMPLETE.md` files

Examples:
- `ASK_AI_IMPLEMENTATION_SUMMARY.md`
- `CALENDAR_API_FIX_SUMMARY.md`
- `DAY_NOTES_PERSISTENCE_FIX.md`
- `FIRST_TIME_SOLVE_ONLY_IMPLEMENTATION.md`
- etc.

#### Files to Preserve
- `server.js` - Main application server
- `script.js` - Main client script
- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` - Core documentation
- `package.json`, `package-lock.json` - Dependencies
- `docker-compose.yml`, `Dockerfile` - Container configuration
- `.env`, `env.example` - Environment configuration
- Schema files: `calendar-schema.sql`, `comprehensive-schema.sql`, `enhanced-spaced-repetition-schema.sql`, `reference_data.sql`, `reset_schemas.sql`, `update-calendar-schema.sql`
- Production Python scripts in root (if any are actually used)
- All files in `client/`, `scripts/`, `migrations/` directories

## Data Models

### File Categorization Model

```typescript
interface FileCategory {
  pattern: string;
  action: 'remove' | 'move' | 'preserve';
  destination?: string;
}

const fileCategories: FileCategory[] = [
  { pattern: 'test-*.html', action: 'remove' },
  { pattern: 'test-*.js', action: 'remove' },
  { pattern: 'debug-*.js', action: 'remove' },
  { pattern: '*_SUMMARY.md', action: 'move', destination: 'docs/implementation-history' },
  // ... etc
];
```

## Error Handling

### File Removal Errors
- If a file cannot be deleted (permissions, in use), log the error and continue
- Provide a summary of files that couldn't be removed
- Don't fail the entire process if individual files fail

### Directory Creation Errors
- If `docs/implementation-history` cannot be created, log error
- Attempt to continue with other cleanup tasks

### .gitignore Update Errors
- If .gitignore cannot be updated, log warning
- Provide manual instructions for updating .gitignore

## Testing Strategy

### Verification Steps
1. Count files before cleanup
2. Execute cleanup
3. Count files after cleanup
4. Verify documentation moved correctly
5. Verify .gitignore updated
6. Verify application still runs (`npm start` or equivalent)

### Rollback Strategy
- Git commit before cleanup allows easy rollback
- Document all changes in a cleanup summary file

## Implementation Approach

### Phase 1: Preparation
1. Create `docs/implementation-history/` directory
2. Read current .gitignore content

### Phase 2: File Organization
1. Move documentation files to `docs/implementation-history/`
2. Verify files moved successfully

### Phase 3: File Removal
1. Remove test files (test-*.html, test-*.js)
2. Remove debug files (debug-*, check-*, verify-*, diagnose-*)
3. Remove temporary setup/apply scripts
4. Remove specific utility files

### Phase 4: Configuration
1. Update .gitignore with new patterns
2. Create cleanup summary document

### Phase 5: Verification
1. Verify key application files still exist
2. Document cleanup results
3. Provide next steps for CI/CD setup

## CI/CD Preparation Notes

After cleanup, the following CI/CD considerations should be addressed:

1. **Build Process**: Ensure `package.json` scripts are production-ready
2. **Environment Variables**: Document required environment variables
3. **Database Migrations**: Ensure migration scripts are in proper order
4. **Docker Configuration**: Verify Dockerfile and docker-compose.yml are current
5. **Testing**: Ensure proper test suites in `client/` are preserved and functional
6. **Linting**: Verify ESLint and Prettier configurations are correct

## Files Count Estimate

Based on the directory listing:
- **Test files to remove**: ~80-90 files
- **Debug/verify/check files to remove**: ~20-25 files
- **Temporary scripts to remove**: ~15-20 files
- **Documentation to organize**: ~30-35 files

**Total files to process**: ~145-170 files
