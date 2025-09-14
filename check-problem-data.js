const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkProblemData() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking problem data that might be causing the error...\n');
    
    // Get the problem from the due today queue
    const queueResult = await client.query('SELECT * FROM get_daily_review_queue() LIMIT 1');
    
    if (queueResult.rows.length === 0) {
      console.log('❌ No problems in due today queue');
      return;
    }
    
    const queueProblem = queueResult.rows[0];
    console.log(`📝 Queue problem: ${queueProblem.problem_title} (ID: ${queueProblem.problem_id})`);
    
    // Get the full problem data from problems table
    const problemResult = await client.query('SELECT * FROM problems WHERE id = $1', [queueProblem.problem_id]);
    
    if (problemResult.rows.length === 0) {
      console.log('❌ Problem not found in problems table!');
      return;
    }
    
    const problem = problemResult.rows[0];
    console.log('\n📊 Full problem data:');
    console.log(`  - ID: ${problem.id}`);
    console.log(`  - Title: ${problem.title}`);
    console.log(`  - Difficulty: ${problem.difficulty}`);
    console.log(`  - Solved: ${problem.solved}`);
    console.log(`  - First solved date: ${problem.first_solved_date}`);
    console.log(`  - LeetCode link: ${problem.leetcode_link}`);
    
    // Check review patterns for this difficulty
    const patternResult = await client.query('SELECT * FROM review_patterns WHERE difficulty = $1', [problem.difficulty]);
    
    if (patternResult.rows.length > 0) {
      console.log(`\n📊 Review pattern for ${problem.difficulty}: ${patternResult.rows[0].pattern}`);
    } else {
      console.log(`\n⚠️  No review pattern found for ${problem.difficulty}`);
    }
    
    // Check existing review history
    const historyResult = await client.query(`
      SELECT * FROM review_history 
      WHERE problem_id = $1 
      ORDER BY id DESC 
      LIMIT 3
    `, [problem.id]);
    
    console.log(`\n📊 Recent review history (${historyResult.rows.length} entries):`);
    historyResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Stage: ${row.review_stage}, Result: ${row.result}, Next: ${row.next_review_date}`);
    });
    
    // Test a simple insert to see what fails
    console.log('\n🧪 Testing simple review_history insert...');
    
    try {
      const testInsert = await client.query(`
        INSERT INTO review_history (problem_id, result, interval_days, next_review_date)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [problem.id, 'remembered', 1, '2025-09-10']);
      
      console.log(`   ✅ Simple insert succeeded: ID ${testInsert.rows[0].id}`);
      
      // Clean up the test insert
      await client.query('DELETE FROM review_history WHERE id = $1', [testInsert.rows[0].id]);
      
    } catch (insertError) {
      console.log(`   ❌ Simple insert failed: ${insertError.message}`);
      console.log(`   📊 Error code: ${insertError.code}`);
    }
    
  } catch (err) {
    console.error('❌ Check failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProblemData();