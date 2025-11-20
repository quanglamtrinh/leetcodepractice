const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcodepractice',
  user: process.env.DB_USER || 'leetcodeuser',
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration 007: Restructure calendar tables...\n');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '007_restructure_calendar_tables.sql'),
      'utf8'
    );
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('\n✅ Migration 007 completed successfully!');
    console.log('   - Added priority to calendar_tasks (default: none)');
    console.log('   - Added start_time and end_time to calendar_events');
    console.log('   - Migrated data from event_time/duration_minutes');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
