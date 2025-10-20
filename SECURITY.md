# Security Policy

## Protecting Sensitive Data

This project uses environment variables to manage sensitive configuration. Follow these guidelines:

### Environment Variables

1. **Never commit `.env` files** to version control
2. Use `env.example` as a template for required environment variables
3. Keep database credentials, API keys, and secrets in `.env` only

### Database Credentials

If you suspect your database credentials have been exposed:

1. **Immediately rotate your database password**:
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres
   
   -- Change password
   ALTER USER leetcodeuser WITH PASSWORD 'new_secure_password';
   ```

2. **Update your `.env` file** with the new password

3. **Review recent database access logs** for suspicious activity

### Best Practices

- Use strong, unique passwords for database accounts
- Limit database user permissions to only what's necessary
- Run PostgreSQL on localhost for development (not exposed to internet)
- Use environment-specific `.env` files (`.env.development`, `.env.production`)
- For production, use managed secret services (AWS Secrets Manager, etc.)

## Git History Cleanup

If sensitive data was previously committed:

1. **This repository has been cleaned** using `git-filter-repo` to remove `.env` and `node_modules/`
2. If you had cloned before the cleanup, delete your local copy and re-clone
3. Never use `git revert` for secrets - they remain in history

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Contact the maintainer directly
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure

## Dependencies

- Regularly update dependencies: `npm audit` and `npm update`
- Review security advisories for PostgreSQL and Node.js
- Use `npm audit fix` to automatically patch known vulnerabilities

---

Last updated: October 2025

