const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkFunction() {
  try {
    // Check if the function exists and what it does
    const result = await pool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'get_events_for_day'
    `);
    
    if (result.rows.length > 0) {
      console.log('get_events_for_day function definition:');
      console.log(result.rows[0].definition);
    } else {
      console.log('get_events_for_day function not found');
    }
    
    // Check what events exist for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`\nChecking events for ${today}:`);
    
    const eventsResult = await pool.query(`
      SELECT id, title, event_type, event_date, is_archived, problem_id
      FROM calendar_events 
      WHERE event_date = $1 
      ORDER BY created_at DESC
    `, [today]);
    
    console.log(`Total events for ${today}: ${eventsResult.rows.length}`);
    eventsResult.rows.forEach(event => {
      console.log(`  - ID ${event.id}: ${event.title} (${event.event_type}) - archived: ${event.is_archived}, problem_id: ${event.problem_id}`);
    });
    
    // Test the function if it exists
    if (result.rows.length > 0) {
      console.log(`\nTesting get_events_for_day function for ${today}:`);
      const functionResult = await pool.query(`SELECT * FROM get_events_for_day($1)`, [today]);
      console.log(`Function returned ${functionResult.rows.length} events:`);
      functionResult.rows.forEach(event => {
        console.log(`  - ${event.title} (${event.event_type})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFunction();