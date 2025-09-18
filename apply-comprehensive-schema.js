const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'leetcode_practice',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function applySchema() {
  try {
    console.log('Reading comprehensive schema...');
    const schema = fs.readFileSync('comprehensive-schema.sql', 'utf8');
    
    console.log('Applying comprehensive schema to database...');
    await pool.query(schema);
    
    console.log('✅ Comprehensive schema applied successfully!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Created tables:');
    result.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    // Verify ENUM types were created
    const enumResult = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      ORDER BY typname
    `);
    
    console.log('\n🏷️  Created ENUM types:');
    enumResult.rows.forEach(row => {
      console.log('  -', row.typname);
    });
    
    // Verify functions were created
    const funcResult = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    
    console.log('\n⚙️  Created functions:');
    funcResult.rows.forEach(row => {
      console.log('  -', row.routine_name);
    });
    
    // Check sample data
    const conceptCount = await pool.query('SELECT COUNT(*) FROM concepts');
    const techniqueCount = await pool.query('SELECT COUNT(*) FROM techniques');
    const goalCount = await pool.query('SELECT COUNT(*) FROM goals');
    const templateCount = await pool.query('SELECT COUNT(*) FROM template_basics');
    
    console.log('\n📊 Sample data inserted:');
    console.log('  - Concepts:', conceptCount.rows[0].count);
    console.log('  - Techniques:', techniqueCount.rows[0].count);
    console.log('  - Goals:', goalCount.rows[0].count);
    console.log('  - Templates:', templateCount.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();