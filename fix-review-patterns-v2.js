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
    console.log('🔧 Fixing review patterns with correct PostgreSQL array syntax...');
    
    // Use PostgreSQL array syntax: ARRAY[0,1,3,7,14,30,60,120]
    const updates = [
      { difficulty: 'easy', pattern: 'ARRAY[0,1,3,7,14,30,60,120]' },
      { difficulty: 'medium', pattern: 'ARRAY[0,1,3,7,14,30,60,120]' },
      { difficulty: 'hard', pattern: 'ARRAY[0,1,2,4,8,16,32,64]' }
    ];
    
    for (const update of updates) {
      console.log(`📝 Updating ${update.difficulty} pattern...`);
      
      await pool.query(`
        UPDATE review_patterns 
        SET pattern = ${update.pattern}
        WHERE difficulty = $1
      `, [update.difficulty]);
    }
    
    // Verify the updates
    console.log('\n✅ Verifying updated patterns:');
    const result = await pool.query('SELECT * FROM review_patterns ORDER BY difficulty');
    
    result.rows.forEach(row => {
      console.log(`  ${row.difficulty}: ${row.pattern}`);
    });
    
    console.log('\n🎉 Review patterns updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixReviewPatterns();