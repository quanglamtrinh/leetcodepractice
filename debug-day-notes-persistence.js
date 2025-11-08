const { Pool } = require('pg');
const express = require('express');
const cors = require('cors');

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

async function debugDayNotesPersistence() {
  try {
    console.log('🔍 Debugging Day Notes Persistence...\n');
    
    const testDate = '2024-11-04';
    const testNotes = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is a test note to debug persistence issues.' }
          ]
        }
      ]
    });
    
    console.log('📝 Test Date:', testDate);
    console.log('📝 Test Notes:', testNotes);
    console.log('\n');
    
    // Step 1: Clear any existing data for this date
    console.log('🧹 Step 1: Clearing existing data...');
    await pool.query('DELETE FROM day_notes WHERE date = $1', [testDate]);
    console.log('✅ Cleared existing data\n');
    
    // Step 2: Save notes (simulating the API call)
    console.log('💾 Step 2: Saving notes...');
    const saveResult = await pool.query(`
      INSERT INTO day_notes (date, notes, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (date) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING date, notes, created_at, updated_at
    `, [testDate, testNotes]);
    
    console.log('✅ Save result:', saveResult.rows[0]);
    console.log('\n');
    
    // Step 3: Immediately retrieve notes
    console.log('📖 Step 3: Retrieving notes immediately...');
    const retrieveResult = await pool.query(`
      SELECT date, notes, created_at, updated_at FROM day_notes WHERE date = $1
    `, [testDate]);
    
    if (retrieveResult.rows.length > 0) {
      console.log('✅ Retrieved notes:', retrieveResult.rows[0]);
      console.log('✅ Notes match:', retrieveResult.rows[0].notes === testNotes);
    } else {
      console.log('❌ No notes found!');
    }
    console.log('\n');
    
    // Step 4: Test the actual API endpoints
    console.log('🌐 Step 4: Testing API endpoints...');
    
    // Start a minimal server to test the endpoints
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    // Copy the exact endpoints from server.js
    app.get('/api/calendar/day-notes/:date', async (req, res) => {
      try {
        const { date } = req.params;
        
        console.log('📥 GET request for date:', date);
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        const result = await pool.query(`
          SELECT notes FROM day_notes WHERE date = $1
        `, [date]);

        const response = { 
          notes: result.rows.length > 0 ? result.rows[0].notes : '' 
        };
        
        console.log('📤 GET response:', response);
        
        res.json(response);
      } catch (error) {
        console.error('❌ Error fetching day notes:', error);
        res.status(500).json({ error: 'Failed to fetch day notes' });
      }
    });

    app.put('/api/calendar/day-notes/:date', async (req, res) => {
      try {
        const { date } = req.params;
        const { notes } = req.body;
        
        console.log('📥 PUT request for date:', date);
        console.log('📥 PUT notes:', notes);
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Validate notes
        if (typeof notes !== 'string') {
          return res.status(400).json({ error: 'Notes must be a string' });
        }

        // Upsert day notes
        const result = await pool.query(`
          INSERT INTO day_notes (date, notes, created_at, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (date) 
          DO UPDATE SET 
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP
          RETURNING date, notes
        `, [date, notes]);

        const response = { 
          success: true,
          data: result.rows[0]
        };
        
        console.log('📤 PUT response:', response);
        
        res.json(response);
      } catch (error) {
        console.error('❌ Error saving day notes:', error);
        res.status(500).json({ error: 'Failed to save day notes' });
      }
    });
    
    const server = app.listen(3002, () => {
      console.log('🚀 Test server started on port 3002');
    });
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test PUT endpoint
    console.log('\n🧪 Testing PUT endpoint...');
    const putResponse = await fetch('http://localhost:3002/api/calendar/day-notes/2024-11-04', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: testNotes })
    });
    
    const putResult = await putResponse.json();
    console.log('PUT endpoint result:', putResult);
    
    // Test GET endpoint
    console.log('\n🧪 Testing GET endpoint...');
    const getResponse = await fetch('http://localhost:3002/api/calendar/day-notes/2024-11-04');
    const getResult = await getResponse.json();
    console.log('GET endpoint result:', getResult);
    
    // Close server
    server.close();
    
    // Step 5: Check database state after API calls
    console.log('\n🔍 Step 5: Final database state...');
    const finalResult = await pool.query(`
      SELECT date, notes, created_at, updated_at FROM day_notes WHERE date = $1
    `, [testDate]);
    
    if (finalResult.rows.length > 0) {
      console.log('✅ Final database state:', finalResult.rows[0]);
    } else {
      console.log('❌ No data found in final check!');
    }
    
  } catch (error) {
    console.error('❌ Error in debug process:', error);
  } finally {
    await pool.end();
  }
}

debugDayNotesPersistence();