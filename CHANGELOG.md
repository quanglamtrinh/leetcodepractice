# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub issue templates for bugs and feature requests
- Pull request template
- Comprehensive documentation (API.md, ARCHITECTURE.md, DEPLOYMENT.md)
- Docker support with Dockerfile and docker-compose.yml
- GitHub Actions CI/CD workflow
- Database migration system
- Seed script for importing CSV data
- ESLint and Prettier configurations
- Security documentation (SECURITY.md)

### Changed
- Enhanced README with curl examples and deployment guide
- Improved package.json with additional npm scripts
- Cleaned Git history (removed node_modules and .env)

### Security
- Removed .env file from Git repository
- Added comprehensive .gitignore
- Created env.example template
- Documented security best practices

## [1.0.0] - 2025-10-20

### Added
- Initial release with core features
- Problem management system
- Progress tracking with PostgreSQL
- Notes system for problems
- Statistics dashboard
- Spaced repetition system
- Similar problems feature
- Review history tracking

### Frontend
- React-based UI with TypeScript
- Problem browsing by concept
- Sorting and filtering capabilities
- Notes editor with rich text
- Progress visualization

### Backend
- Express.js REST API
- PostgreSQL database integration
- CSV import functionality
- Health check endpoint
- CORS support

---

## Version History Format

### [Version] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security improvements

