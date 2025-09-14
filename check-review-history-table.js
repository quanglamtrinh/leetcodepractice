const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkReviewHistoryTable() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking review_history table structure...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'review_history' 
      ORDER BY ordinal_position
    `);
    
    console.log('review_history table columns:');
    result.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'nullable' : 'required';
      const defaultVal = row.column_default ? ` (default: ${row.column_default})` : '';
      console.log(`  - ${row.column_name}: ${row.data_type} (${nullable})${defaultVal}`);
    });
    
    // Also check what the current /api/reviews endpoint is trying to insert
    console.log('\n🔍 Current /api/reviews endpoint tries to insert:');
    console.log('  - problem_id: provided');
    console.log('  - result: provided');
    console.log('  - review_stage: hardcoded to 1');
    console.log('  - time_spent_minutes: provided');
    console.log('  - review_notes: provided');
    console.log('  - ❌ Missing: next_review_date (likely required)');
    console.log('  - ❌ Missing: interval_days (likely required)');
    console.log('  - ❌ Missing: scheduled_review_time (might be required)');
    
  } catch (err) {
    console.error('❌ Check failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkReviewHistoryTable();