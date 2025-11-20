const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  console.log('🚀 Starting calendar migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '005_add_calendar_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 005_add_calendar_tables.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('calendar_notes', 'calendar_tasks')
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Verification:');
    console.log('Tables created:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    // Check data migration
    const notesCount = await pool.query('SELECT COUNT(*) as count FROM calendar_notes');
    const tasksCount = await pool.query('SELECT COUNT(*) as count FROM calendar_tasks');
    const eventsCount = await pool.query('SELECT COUNT(*) as count FROM calendar_events');
    
    console.log('\n📈 Data summary:');
    console.log(`  - calendar_notes: ${notesCount.rows[0].count} records`);
    console.log(`  - calendar_tasks: ${tasksCount.rows[0].count} records`);
    console.log(`  - calendar_events: ${eventsCount.rows[0].count} records`);
    
    console.log('\n🎉 All done! You can now use the new calendar tables.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
