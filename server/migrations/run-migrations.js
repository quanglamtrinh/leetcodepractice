const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Migration files in order
const migrations = [
  '001_create_users_table.sql',
  '002_create_calendar_tables.sql',
  '003_modify_tables_for_multi_user.sql',
  '004_create_user_specific_functions.sql'
];

async function runMigrations() {
  console.log('Starting database migrations for multi-user support...\n');

  try {
    for (const migrationFile of migrations) {
      const filePath = path.join(__dirname, migrationFile);
      
      console.log(`Running migration: ${migrationFile}`);
      
      // Read the SQL file
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration
      await pool.query(sql);
      
      console.log(`✓ Successfully applied: ${migrationFile}\n`);
    }

    console.log('All migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('1. If you have existing data, run the data migration script');
    console.log('2. Update the backend API routes to use authentication');
    console.log('3. Implement the frontend authentication UI');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('\nError details:', error);
    console.error('\nPlease check the error and fix any issues before retrying.');
    console.error('You may need to restore from backup if the database is in an inconsistent state.');
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run migrations
runMigrations();
