const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function applySchemaUpdate() {
  try {
    console.log('🔄 Applying calendar schema update...');
    
    // Step 1: Update the event_type enum
    console.log('1. Updating event_type enum...');
    
    // First, check if solved_problem already exists
    const checkEnum = await pool.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
      AND enumlabel = 'solved_problem'
    `);
    
    if (checkEnum.rows.length === 0) {
      // Add solved_problem to the enum
      await pool.query(`ALTER TYPE event_type ADD VALUE 'solved_problem'`);
      console.log('   ✅ Added solved_problem to event_type enum');
    } else {
      console.log('   ✅ solved_problem already exists in event_type enum');
    }
    
    // Step 2: Update existing practice_session events to solved_problem
    console.log('2. Converting practice_session events to solved_problem...');
    const updateResult = await pool.query(`
      UPDATE calendar_events 
      SET event_type = 'solved_problem'
      WHERE event_type = 'practice_session'
    `);
    console.log(`   ✅ Updated ${updateResult.rowCount} practice_session events to solved_problem`);
    
    // Step 3: Add difficulty column if it doesn't exist
    console.log('3. Adding difficulty column...');
    try {
      await pool.query(`ALTER TABLE calendar_events ADD COLUMN difficulty VARCHAR(10)`);
      console.log('   ✅ Added difficulty column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ Difficulty column already exists');
      } else {
        throw error;
      }
    }
    
    // Step 4: Remove was_successful column if it exists
    console.log('4. Removing was_successful column...');
    try {
      await pool.query(`ALTER TABLE calendar_events DROP COLUMN IF EXISTS was_successful`);
      console.log('   ✅ Removed was_successful column');
    } catch (error) {
      console.log('   ✅ was_successful column already removed or never existed');
    }
    
    // Step 5: Update difficulty values from problems table
    console.log('5. Updating difficulty values...');
    const difficultyUpdateResult = await pool.query(`
      UPDATE calendar_events ce
      SET difficulty = p.difficulty::VARCHAR
      FROM problems p
      WHERE ce.problem_id = p.id 
      AND ce.event_type = 'solved_problem'
      AND ce.difficulty IS NULL
    `);
    console.log(`   ✅ Updated difficulty for ${difficultyUpdateResult.rowCount} events`);
    
    // Step 6: Create the solved problem function
    console.log('6. Creating create_solved_problem_event function...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION create_solved_problem_event(
          p_problem_id BIGINT,
          p_event_date DATE DEFAULT CURRENT_DATE,
          p_time_spent INTEGER DEFAULT NULL,
          p_notes TEXT DEFAULT NULL
      )
      RETURNS BIGINT AS $$
      DECLARE
          v_event_id BIGINT;
          v_problem_title VARCHAR(255);
          v_problem_difficulty VARCHAR(10);
          v_color VARCHAR(7);
      BEGIN
          -- Get problem details
          SELECT title, difficulty INTO v_problem_title, v_problem_difficulty
          FROM problems WHERE id = p_problem_id;
          
          -- Determine color based on difficulty
          v_color := CASE v_problem_difficulty
              WHEN 'Easy' THEN '#22c55e'
              WHEN 'Medium' THEN '#f97316'
              WHEN 'Hard' THEN '#ef4444'
              ELSE '#6b7280'
          END;
          
          -- Create the solved problem event
          INSERT INTO calendar_events (
              event_type,
              title,
              description,
              event_date,
              problem_id,
              time_spent_minutes,
              difficulty,
              color,
              note_content
          ) VALUES (
              'solved_problem',
              'Solved: ' || v_problem_title,
              'Problem solved on ' || p_event_date,
              p_event_date,
              p_problem_id,
              p_time_spent,
              v_problem_difficulty,
              v_color,
              p_notes
          )
          RETURNING id INTO v_event_id;
          
          RETURN v_event_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Created create_solved_problem_event function');
    
    console.log('\n🎉 Schema update completed successfully!');
    
    // Verify the update
    const verifyResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_solved_problem_event'
      ) as function_exists
    `);
    
    const enumResult = await pool.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
      ORDER BY enumlabel
    `);
    
    console.log('\n📊 Verification:');
    console.log('Function exists:', verifyResult.rows[0].function_exists);
    console.log('Event types:', enumResult.rows.map(r => r.enumlabel));
    
  } catch (error) {
    console.error('❌ Error applying schema update:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

applySchemaUpdate().catch(console.error);