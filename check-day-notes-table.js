const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'leetcodeuser',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'leetcodepractice',
  password: process.env.DB_PASSWORD || '1',
  port: process.env.DB_PORT || 5432,
});

async function checkDayNotesTable() {
  try {
    console.log('🔍 Checking if day_notes table exists...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'day_notes'
      );
    `);
    
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check table structure
      console.log('\n📋 Table structure:');
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'day_notes'
        ORDER BY ordinal_position;
      `);
      
      console.table(structure.rows);
      
      // Check if there's any data
      console.log('\n📊 Sample data:');
      const sampleData = await pool.query(`
        SELECT date, LEFT(notes, 50) as notes_preview, created_at, updated_at
        FROM day_notes 
        ORDER BY date DESC 
        LIMIT 5;
      `);
      
      if (sampleData.rows.length > 0) {
        console.table(sampleData.rows);
      } else {
        console.log('No data found in day_notes table');
      }
      
      // Test insert/update
      console.log('\n🧪 Testing insert/update...');
      const testDate = '2024-11-04';
      const testNotes = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test note content' }] }]
      });
      
      const insertResult = await pool.query(`
        INSERT INTO day_notes (date, notes, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (date) 
        DO UPDATE SET 
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP
        RETURNING date, notes, updated_at;
      `, [testDate, testNotes]);
      
      console.log('Insert/Update result:', insertResult.rows[0]);
      
      // Test retrieval
      console.log('\n📖 Testing retrieval...');
      const retrieveResult = await pool.query(`
        SELECT notes FROM day_notes WHERE date = $1
      `, [testDate]);
      
      console.log('Retrieved notes:', retrieveResult.rows[0]?.notes || 'No notes found');
      
    } else {
      console.log('❌ day_notes table does not exist!');
      console.log('You need to run the calendar schema migration.');
    }
    
  } catch (error) {
    console.error('❌ Error checking day_notes table:', error);
  } finally {
    await pool.end();
  }
}

checkDayNotesTable();