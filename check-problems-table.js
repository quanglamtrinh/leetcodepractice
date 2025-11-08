const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkProblemsTable() {
  try {
    // Check table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'problems' 
      ORDER BY ordinal_position
    `);
    
    console.log('Problems table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check if we have any solved problems with dates
    const solvedResult = await pool.query(`
      SELECT COUNT(*) as total_solved,
             COUNT(CASE WHEN updated_at IS NOT NULL THEN 1 END) as with_dates
      FROM problems 
      WHERE solved = true
    `);
    
    console.log('\nSolved problems info:');
    console.log(`  Total solved: ${solvedResult.rows[0].total_solved}`);
    console.log(`  With dates: ${solvedResult.rows[0].with_dates}`);
    
    // Sample some solved problems to see their date info
    const sampleResult = await pool.query(`
      SELECT id, title, solved, created_at, updated_at
      FROM problems 
      WHERE solved = true
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    
    console.log('\nSample solved problems:');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.title}: solved=${row.solved}, updated=${row.updated_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkProblemsTable();