const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkCurrentSchema() {
  try {
    // Check current tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 Current tables:');
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Check if we have existing data
    try {
      const problemCount = await pool.query('SELECT COUNT(*) FROM problems');
      console.log(`\n📈 Current problems: ${problemCount.rows[0].count}`);
      
      // Check problems table structure
      const problemColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'problems' 
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Problems table columns:');
      problemColumns.rows.forEach(row => console.log(`   - ${row.column_name}: ${row.data_type}`));
      
    } catch (err) {
      console.log('⚠️  Problems table check failed:', err.message);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}

checkCurrentSchema();