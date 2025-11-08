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

async function debugRaceCondition() {
  try {
    console.log('🔍 Testing for race conditions in day notes persistence...\n');
    
    const testDate1 = '2024-11-04';
    const testDate2 = '2024-11-05';
    
    // Clear both dates
    await pool.query('DELETE FROM day_notes WHERE date IN ($1, $2)', [testDate1, testDate2]);
    console.log('🧹 Cleared test data\n');
    
    // Scenario 1: Save notes for date1, then immediately switch to date2
    console.log('📝 Scenario 1: Save and immediate switch');
    
    const notes1 = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Notes for November 4th' }] }]
    });
    
    // Save notes for date1
    console.log(`💾 Saving notes for ${testDate1}...`);
    await pool.query(`
      INSERT INTO day_notes (date, notes, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (date) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
    `, [testDate1, notes1]);
    console.log('✅ Save completed');
    
    // Immediately check if it's there
    const check1 = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate1]);
    console.log(`📖 Immediate check for ${testDate1}: ${check1.rows.length > 0 ? 'Found' : 'Not found'}`);
    
    // Simulate loading date2 (which should be empty)
    console.log(`📖 Loading ${testDate2}...`);
    const check2 = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate2]);
    console.log(`📖 Check for ${testDate2}: ${check2.rows.length > 0 ? 'Found' : 'Not found'}`);
    
    // Go back to date1
    console.log(`📖 Going back to ${testDate1}...`);
    const check3 = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate1]);
    console.log(`📖 Check for ${testDate1} after switch: ${check3.rows.length > 0 ? 'Found' : 'Not found'}`);
    
    if (check3.rows.length > 0) {
      console.log('✅ Notes persisted correctly through date switch');
    } else {
      console.log('❌ Notes were lost during date switch!');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Scenario 2: Rapid saves with delays (simulating debounced saves)
    console.log('📝 Scenario 2: Rapid saves with delays');
    
    const rapidNotes = [
      'First save attempt',
      'Second save attempt', 
      'Third save attempt',
      'Final save attempt'
    ];
    
    // Clear the test date
    await pool.query('DELETE FROM day_notes WHERE date = $1', [testDate1]);
    
    // Simulate rapid saves with small delays
    for (let i = 0; i < rapidNotes.length; i++) {
      const noteContent = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: rapidNotes[i] }] }]
      });
      
      console.log(`💾 Save attempt ${i + 1}: "${rapidNotes[i]}"`);
      
      // Save with a small delay between each
      setTimeout(async () => {
        try {
          await pool.query(`
            INSERT INTO day_notes (date, notes, created_at, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (date) 
            DO UPDATE SET 
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP
          `, [testDate1, noteContent]);
          console.log(`✅ Save ${i + 1} completed`);
        } catch (error) {
          console.log(`❌ Save ${i + 1} failed:`, error.message);
        }
      }, i * 100); // 100ms delay between saves
    }
    
    // Wait for all saves to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check final result
    const finalCheck = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate1]);
    if (finalCheck.rows.length > 0) {
      const finalNotes = JSON.parse(finalCheck.rows[0].notes);
      const finalText = finalNotes.content[0].content[0].text;
      console.log(`📖 Final saved text: "${finalText}"`);
      
      if (finalText === rapidNotes[rapidNotes.length - 1]) {
        console.log('✅ Final save won (expected behavior)');
      } else {
        console.log('⚠️ Unexpected final result - possible race condition');
      }
    } else {
      console.log('❌ No notes found after rapid saves!');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Scenario 3: Test cache invalidation timing
    console.log('📝 Scenario 3: Cache invalidation timing');
    
    // This simulates the calendar service cache behavior
    const cache = new Map();
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    function getCachedData(key, fetchFn) {
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        console.log(`📦 Using cached data for ${key}`);
        return Promise.resolve(cached.data);
      }
      
      console.log(`🌐 Fetching fresh data for ${key}`);
      return fetchFn().then(data => {
        cache.set(key, {
          data,
          timestamp: Date.now()
        });
        return data;
      });
    }
    
    function invalidateCache(key) {
      cache.delete(key);
      console.log(`🗑️ Invalidated cache for ${key}`);
    }
    
    // Test the cache behavior
    const testDate = testDate1;
    const cacheKey = `day-notes-${testDate}`;
    
    // First load (should fetch from DB)
    const load1 = await getCachedData(cacheKey, async () => {
      const result = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate]);
      return result.rows[0]?.notes || '';
    });
    console.log(`📖 First load: ${load1 ? 'Has content' : 'Empty'}`);
    
    // Second load (should use cache)
    const load2 = await getCachedData(cacheKey, async () => {
      const result = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate]);
      return result.rows[0]?.notes || '';
    });
    console.log(`📖 Second load: ${load2 ? 'Has content' : 'Empty'}`);
    
    // Save new data and invalidate cache
    const newNotes = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated notes after cache test' }] }]
    });
    
    await pool.query(`
      INSERT INTO day_notes (date, notes, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (date) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
    `, [testDate, newNotes]);
    
    invalidateCache(cacheKey);
    
    // Load again (should fetch fresh data)
    const load3 = await getCachedData(cacheKey, async () => {
      const result = await pool.query('SELECT notes FROM day_notes WHERE date = $1', [testDate]);
      return result.rows[0]?.notes || '';
    });
    
    if (load3 === newNotes) {
      console.log('✅ Cache invalidation working correctly');
    } else {
      console.log('❌ Cache invalidation failed!');
    }
    
  } catch (error) {
    console.error('❌ Error in race condition test:', error);
  } finally {
    await pool.end();
  }
}

debugRaceCondition();