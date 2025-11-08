const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  try {
    // Check if the function exists
    const funcResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_solved_problem_event'
      ) as function_exists
    `);
    
    console.log('create_solved_problem_event function exists:', funcResult.rows[0].function_exists);
    
    // Check event types
    const enumResult = await pool.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
      ORDER BY enumlabel
    `);
    
    console.log('Available event types:', enumResult.rows.map(r => r.enumlabel));
    
    // Check if calendar_events table exists
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'calendar_events'
      ) as table_exists
    `);
    
    console.log('calendar_events table exists:', tableResult.rows[0].table_exists);
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();