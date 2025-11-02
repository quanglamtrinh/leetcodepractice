const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// Apply calendar schema
async function applyCalendarSchema() {
  try {
    console.log('🗓️  Applying calendar database schema...');
    
    const schemaPath = path.join(__dirname, 'calendar-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('calendar-schema.sql file not found');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one statement
    await pool.query(schema);
    console.log('✅ Calendar schema applied successfully');
    return true;
  } catch (err) {
    console.error('❌ Error applying calendar schema:', err.message);
    console.error('Full error:', err);
    return false;
  }
}

// Test calendar functions
async function testCalendarFunctions() {
  try {
    console.log('🧪 Testing calendar database functions...\n');
    
    // Test 1: Test get_calendar_events function
    console.log('1. Testing get_calendar_events function...');
    const startDate = new Date().toISOString().split('T')[0]; // Today
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now
    
    const calendarEvents = await pool.query(`
      SELECT * FROM get_calendar_events($1, $2)
    `, [startDate, endDate]);
    
    console.log('   📋 Calendar events found:', calendarEvents.rows.length);
    if (calendarEvents.rows.length > 0) {
      console.log('   📝 Sample event:', calendarEvents.rows[0]);
    }
    
    // Test 2: Test get_events_for_day function
    console.log('\n2. Testing get_events_for_day function...');
    const todayEvents = await pool.query(`
      SELECT * FROM get_events_for_day($1)
    `, [startDate]);
    
    console.log('   📋 Today\'s events:', todayEvents.rows.length);
    if (todayEvents.rows.length > 0) {
      console.log('   📝 Sample today event:', todayEvents.rows[0]);
    }
    
    // Test 3: Test get_calendar_stats function
    console.log('\n3. Testing get_calendar_stats function...');
    const stats = await pool.query(`
      SELECT * FROM get_calendar_stats($1, $2)
    `, [startDate, endDate]);
    
    console.log('   📊 Calendar stats:', stats.rows[0]);
    
    // Test 4: Test create_practice_session_event function (if we have problems)
    console.log('\n4. Testing create_practice_session_event function...');
    
    // First check if we have any problems
    const problemsResult = await pool.query('SELECT id, title FROM problems LIMIT 1');
    
    if (problemsResult.rows.length > 0) {
      const testProblem = problemsResult.rows[0];
      console.log('   🎯 Using test problem:', testProblem.title);
      
      const eventId = await pool.query(`
        SELECT create_practice_session_event($1, $2, $3, $4, $5)
      `, [testProblem.id, startDate, 25, true, 'Test practice session']);
      
      console.log('   ✅ Practice session event created with ID:', eventId.rows[0].create_practice_session_event);
    } else {
      console.log('   ⚠️  No problems found in database, skipping practice session test');
    }
    
    // Test 5: Test get_overdue_tasks function
    console.log('\n5. Testing get_overdue_tasks function...');
    const overdueTasks = await pool.query('SELECT * FROM get_overdue_tasks()');
    
    console.log('   📋 Overdue tasks:', overdueTasks.rows.length);
    if (overdueTasks.rows.length > 0) {
      console.log('   📝 Sample overdue task:', overdueTasks.rows[0]);
    }
    
    // Test 6: Test views
    console.log('\n6. Testing calendar views...');
    
    const todaysEventsView = await pool.query('SELECT * FROM todays_events LIMIT 3');
    console.log('   📋 Today\'s events view:', todaysEventsView.rows.length);
    
    const upcomingTasksView = await pool.query('SELECT * FROM upcoming_tasks LIMIT 3');
    console.log('   📋 Upcoming tasks view:', upcomingTasksView.rows.length);
    
    const practiceHistoryView = await pool.query('SELECT * FROM practice_session_history LIMIT 3');
    console.log('   📋 Practice history view:', practiceHistoryView.rows.length);
    
    const monthlyOverview = await pool.query('SELECT * FROM calendar_monthly_overview LIMIT 3');
    console.log('   📋 Monthly overview view:', monthlyOverview.rows.length);
    
    console.log('\n✅ All calendar function tests completed successfully!');
    return true;
    
  } catch (err) {
    console.error('❌ Error testing calendar functions:', err.message);
    console.error('Full error:', err);
    return false;
  }
}

// Verify calendar schema
async function verifyCalendarSchema() {
  try {
    console.log('🔍 Verifying calendar schema...');
    
    // Check calendar tables exist
    const tables = ['calendar_events', 'calendar_event_tags'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        console.error(`❌ Table '${table}' not found`);
        return false;
      }
    }
    
    // Check ENUM types exist
    const enumTypes = ['event_type', 'task_status', 'event_priority'];
    
    for (const enumType of enumTypes) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_type 
          WHERE typname = $1
        )
      `, [enumType]);
      
      if (!result.rows[0].exists) {
        console.error(`❌ ENUM type '${enumType}' not found`);
        return false;
      }
    }
    
    // Check functions exist
    const functions = [
      'get_calendar_events',
      'get_events_for_day', 
      'create_practice_session_event',
      'get_overdue_tasks',
      'get_calendar_stats'
    ];
    
    for (const func of functions) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = $1
        )
      `, [func]);
      
      if (!result.rows[0].exists) {
        console.error(`❌ Function '${func}' not found`);
        return false;
      }
    }
    
    // Check indexes exist
    const indexes = [
      'idx_calendar_events_event_date',
      'idx_calendar_events_event_type',
      'idx_calendar_events_task_status'
    ];
    
    for (const index of indexes) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = $1
        )
      `, [index]);
      
      if (!result.rows[0].exists) {
        console.error(`❌ Index '${index}' not found`);
        return false;
      }
    }
    
    // Check data counts
    const eventCount = await pool.query('SELECT COUNT(*) as count FROM calendar_events');
    const tagCount = await pool.query('SELECT COUNT(*) as count FROM calendar_event_tags');
    
    console.log('✅ Calendar schema verification completed');
    console.log(`📊 Calendar events: ${eventCount.rows[0].count}`);
    console.log(`📊 Event tags: ${tagCount.rows[0].count}`);
    
    return true;
  } catch (err) {
    console.error('❌ Error verifying calendar schema:', err.message);
    return false;
  }
}

// Main function
async function setupCalendarDatabase() {
  console.log('🚀 Starting calendar database setup...\n');
  
  try {
    // Test connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('Database connection failed');
    }
    
    // Apply calendar schema
    const schemaOk = await applyCalendarSchema();
    if (!schemaOk) {
      throw new Error('Calendar schema application failed');
    }
    
    // Verify schema
    const verifyOk = await verifyCalendarSchema();
    if (!verifyOk) {
      throw new Error('Calendar schema verification failed');
    }
    
    // Test functions
    const testOk = await testCalendarFunctions();
    if (!testOk) {
      throw new Error('Calendar function testing failed');
    }
    
    console.log('\n🎉 Calendar database setup completed successfully!');
    console.log('\n📝 Calendar Features Added:');
    console.log('✅ Calendar events table with tasks, notes, and practice sessions');
    console.log('✅ Event tagging system for linking to problems/patterns');
    console.log('✅ Calendar functions for data retrieval');
    console.log('✅ Practice session auto-creation');
    console.log('✅ Task management with status tracking');
    console.log('✅ Calendar statistics and analytics');
    console.log('✅ Optimized indexes for performance');
    console.log('✅ Sample data for testing');
    
    console.log('\n📝 Next steps:');
    console.log('1. Calendar database schema is ready');
    console.log('2. Proceed to implement API endpoints');
    console.log('3. Test the calendar functions with your application');
    
  } catch (err) {
    console.error('\n❌ Calendar database setup failed:', err.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check PostgreSQL is running');
    console.log('2. Verify .env file configuration');
    console.log('3. Ensure comprehensive schema is already applied');
    console.log('4. Check calendar-schema.sql file exists');
    throw err;
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupCalendarDatabase()
    .then(() => {
      console.log('\n✅ Calendar setup completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Setup failed:', err.message);
      process.exit(1);
    });
}

module.exports = { setupCalendarDatabase, testConnection };