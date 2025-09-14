const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkReviewPatterns() {
  try {
    console.log('🔍 Checking review patterns...');
    
    const result = await pool.query('SELECT * FROM review_patterns ORDER BY difficulty');
    
    console.log('📋 Current review patterns:');
    result.rows.forEach(row => {
      console.log(`  ${row.difficulty}: ${row.pattern}`);
    });
    
    // Test the pattern parsing
    if (result.rows.length > 0) {
      const testPattern = result.rows[0].pattern;
      console.log('\n🧪 Testing pattern parsing:');
      console.log('Raw pattern:', testPattern);
      
      if (typeof testPattern === 'string') {
        const parsed = testPattern.replace(/[{}]/g, '').split(',').map(Number);
        console.log('Parsed pattern:', parsed);
      } else if (Array.isArray(testPattern)) {
        console.log('Already an array:', testPattern);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkReviewPatterns();