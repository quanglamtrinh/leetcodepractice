const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function fixReviewPatterns() {
  try {
    console.log('🔧 Fixing review patterns to include proper spaced repetition intervals...');
    
    // Update patterns to include the correct intervals:
    // 0 = today (initial review when marked as solved)
    // 1 = tomorrow (first spaced repetition review)
    // 3 = 3 days later
    // 7 = 1 week later
    // etc.
    
    const correctPatterns = {
      'Easy': [0, 1, 3, 7, 14, 30, 60, 120],
      'Medium': [0, 1, 3, 7, 14, 30, 60, 120], 
      'Hard': [0, 1, 2, 4, 8, 16, 32, 64]  // Harder problems need more frequent reviews
    };
    
    for (const [difficulty, pattern] of Object.entries(correctPatterns)) {
      console.log(`📝 Updating ${difficulty} pattern to: [${pattern.join(', ')}]`);
      
      await pool.query(`
        UPDATE review_patterns 
        SET pattern = $1 
        WHERE difficulty = $2
      `, [pattern, difficulty.toLowerCase()]);
    }
    
    // Verify the updates
    console.log('\n✅ Verifying updated patterns:');
    const result = await pool.query('SELECT * FROM review_patterns ORDER BY difficulty');
    
    result.rows.forEach(row => {
      const parsed = Array.isArray(row.pattern) ? row.pattern : row.pattern.replace(/[{}]/g, '').split(',').map(Number);
      console.log(`  ${row.difficulty}: [${parsed.join(', ')}]`);
    });
    
    console.log('\n🎉 Review patterns updated successfully!');
    console.log('\n📋 Now the spaced repetition will work correctly:');
    console.log('  - Day 0: Initial review (when marked as solved)');
    console.log('  - Day 1: First spaced repetition review (tomorrow)');
    console.log('  - Day 3: Second spaced repetition review');
    console.log('  - Day 7: Third spaced repetition review');
    console.log('  - And so on...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixReviewPatterns();