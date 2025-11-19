# Database Migrations for Multi-User Support

This directory contains SQL migration files to add multi-user support to the LeetCode Practice App.

## Migration Files

1. **001_create_users_table.sql** - Creates the users table with authentication fields
2. **002_create_calendar_tables.sql** - Creates calendar_notes, calendar_tasks, and calendar_events tables
3. **003_modify_tables_for_multi_user.sql** - Modifies existing tables to support multi-user data isolation
4. **004_create_user_specific_functions.sql** - Updates database functions to accept user_id parameter

## Running Migrations

### Option 1: Using the migration script (Recommended)

```bash
node server/migrations/run-migrations.js
```

This will execute all migration files in order.

### Option 2: Manual execution

You can run each migration file manually using psql:

```bash
psql -U your_username -d your_database -f server/migrations/001_create_users_table.sql
psql -U your_username -d your_database -f server/migrations/002_create_calendar_tables.sql
psql -U your_username -d your_database -f server/migrations/003_modify_tables_for_multi_user.sql
psql -U your_username -d your_database -f server/migrations/004_create_user_specific_functions.sql
```

### Option 3: Using Docker

If you're using Docker, you can execute migrations inside the container:

```bash
docker exec -i your_postgres_container psql -U your_username -d your_database < server/migrations/001_create_users_table.sql
docker exec -i your_postgres_container psql -U your_username -d your_database < server/migrations/002_create_calendar_tables.sql
docker exec -i your_postgres_container psql -U your_username -d your_database < server/migrations/003_modify_tables_for_multi_user.sql
docker exec -i your_postgres_container psql -U your_username -d your_database < server/migrations/004_create_user_specific_functions.sql
```

## Important Notes

### Before Running Migrations

1. **Backup your database** - Always create a backup before running migrations:
   ```bash
   pg_dump -U your_username your_database > backup_before_migration.sql
   ```

2. **Review the migrations** - Read through each migration file to understand what changes will be made.

3. **Check dependencies** - Ensure the `update_updated_at_column()` function exists (it's created in comprehensive-schema.sql).

### After Running Migrations

1. **Data Migration Required** - If you have existing data in the problems table with solved/notes columns, you'll need to:
   - Create a default user account
   - Migrate existing progress data to the user_progress table
   - Associate existing review_history and review_attempts with the default user

2. **Update Application Code** - The backend API routes need to be updated to:
   - Use the new user_progress table instead of problems.solved/notes
   - Filter all queries by user_id
   - Pass user_id to database functions

## Schema Changes Summary

### New Tables
- `users` - User accounts with authentication
- `user_progress` - User-specific problem progress (replaces solved/notes in problems)
- `calendar_notes` - User calendar notes
- `calendar_tasks` - User calendar tasks
- `calendar_events` - User calendar events

### Modified Tables
- `problems` - Removed solved and notes columns (moved to user_progress)
- `review_history` - Added user_id column
- `review_attempts` - Added user_id column
- `mistakes` - Added user_id column

### Updated Functions
- `get_due_problems_today(user_id)` - Now accepts user_id parameter
- `add_review_session(user_id, problem_id, ...)` - Now accepts user_id parameter
- `process_review_session(user_id, problem_id, ...)` - Now accepts user_id parameter
- `get_user_statistics(user_id)` - New function for user-specific stats

### Removed Views
- `due_problems_today` - Replaced by function
- `problem_stats` - Replaced by function
- `mistake_analysis` - Replaced by function

## Rollback

If you need to rollback these migrations, you can restore from your backup:

```bash
psql -U your_username -d your_database < backup_before_migration.sql
```

## Troubleshooting

### Error: function update_updated_at_column() does not exist

This function should exist from the comprehensive-schema.sql. If it doesn't, add it:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Error: column "solved" does not exist in problems table

This is expected after migration 003. The solved column has been moved to the user_progress table.

### Error: relation "users" does not exist

Make sure you run migrations in order, starting with 001_create_users_table.sql.
