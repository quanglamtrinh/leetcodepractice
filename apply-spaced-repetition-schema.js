const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function applySpacedRepetitionSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Applying Spaced Repetition Schema...');
    
    await client.query('BEGIN');
    
    // 1. Create spaced repetition tables
    console.log('🏗️  Creating spaced repetition tables...');
    
    // Review Schedules Table - Standard spaced repetition intervals
    await client.query(`
      CREATE TABLE IF NOT EXISTS review_schedules (
        id BIGSERIAL PRIMARY KEY,
        stage INTEGER NOT NULL,
        interval_days INTEGER NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ review_schedules');
    
    // Forgetting Patterns Table - Recovery strategies based on forgetting patterns
    await client.query(`
      CREATE TABLE IF NOT EXISTS forgetting_patterns (
        id BIGSERIAL PRIMARY KEY,
        stage_forgotten INTEGER NOT NULL,
        times_forgotten INTEGER NOT NULL,
        reset_interval_days INTEGER NOT NULL,
        intensive_review_count INTEGER NOT NULL,
        recovery_notes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ forgetting_patterns');
    
    // Intensive Recovery Cycles Table - Daily practice cycles for forgotten problems
    await client.query(`
      CREATE TABLE IF NOT EXISTS intensive_recovery_cycles (
        id BIGSERIAL PRIMARY KEY,
        problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
        cycles_remaining INTEGER NOT NULL,
        cycle_interval_days INTEGER NOT NULL,
        started_date DATE DEFAULT CURRENT_DATE,
        completed_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ intensive_recovery_cycles');
    
    // Extend existing review_history table with spaced repetition fields
    console.log('🔧 Extending review_history table...');
    
    const alterQueries = [
      'ALTER TABLE review_history ADD COLUMN IF NOT EXISTS review_stage INTEGER DEFAULT 1',
      'ALTER TABLE review_history ADD COLUMN IF NOT EXISTS scheduled_review_time TIMESTAMP',
      'ALTER TABLE review_history ADD COLUMN IF NOT EXISTS actual_delay_hours NUMERIC DEFAULT 0'
    ];
    
    for (const query of alterQueries) {
      try {
        await client.query(query);
        console.log('   ✓ Extended review_history');
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
      }
    }
    
    // 2. Insert standard review schedule data
    console.log('📊 Inserting standard review schedules...');
    
    await client.query(`
      INSERT INTO review_schedules (stage, interval_days, description) VALUES 
        (1, 1, 'Next day - Initial consolidation'),
        (2, 3, 'Day 3 - Critical memory cliff'),
        (3, 7, 'Week 1 - Short-term retention test'),
        (4, 14, 'Week 2 - Medium-term retention'),
        (5, 30, 'Month 1 - Long-term memory formation'),
        (6, 60, 'Month 2 - Deep long-term retention'),
        (7, 120, 'Month 4 - Permanent memory test'),
        (8, 240, 'Month 8 - Master level retention')
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ Standard review intervals inserted');
    
    // 3. Insert forgetting recovery patterns
    console.log('📊 Inserting forgetting recovery patterns...');
    
    await client.query(`
      INSERT INTO forgetting_patterns (stage_forgotten, times_forgotten, reset_interval_days, intensive_review_count, recovery_notes) VALUES 
        -- First time forgetting at different stages
        (1, 1, 1, 2, 'Forgot at 1-day mark: Pattern not consolidated - restart with 2 daily intensive reviews'),
        (2, 1, 1, 3, 'Forgot at 3-day critical cliff: Memory pathway weak - needs 3 daily intensive reviews'),
        (3, 1, 2, 2, 'Forgot at 7-day mark: Interference likely - moderate reset with 2 intensive reviews'),
        (4, 1, 3, 2, 'Forgot at 14-day mark: Pattern confusion - 3-day reset with reinforcement'),
        (5, 1, 7, 1, 'Forgot at 30-day mark: Long-term memory issue - weekly reset'),
        (6, 1, 14, 1, 'Forgot at 60+ day mark: Deep pattern forgotten - bi-weekly reset'),
        
        -- Second time forgetting (more concerning)
        (1, 2, 1, 4, 'Second 1-day failure: Serious consolidation problem - 4 daily intensive reviews needed'),
        (2, 2, 1, 5, 'Second 3-day failure: Major memory pathway issue - 5 daily intensive cycles'),
        (3, 2, 2, 3, 'Second 7-day failure: Pattern interference - extended intensive period'),
        (4, 2, 3, 3, 'Second 14-day failure: Conceptual confusion - daily reviews for 3 days'),
        
        -- Third+ time forgetting (critical intervention needed)
        (1, 3, 1, 6, 'Third+ 1-day failure: CRITICAL - needs pattern re-learning with 6 daily intensive reviews'),
        (2, 3, 1, 8, 'Third+ 3-day failure: CRITICAL - complete pattern breakdown, 8 daily intensive cycles'),
        (3, 3, 1, 5, 'Third+ 7-day failure: CRITICAL - fundamental pattern confusion, daily practice needed'),
        (4, 3, 2, 4, 'Third+ 14-day failure: CRITICAL - needs structured daily pattern study')
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✓ Forgetting recovery patterns inserted');
    
    // 4. Create indexes for performance
    console.log('📊 Creating spaced repetition indexes...');
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_review_history_problem_scheduled ON review_history(problem_id, scheduled_review_time)',
      'CREATE INDEX IF NOT EXISTS idx_intensive_recovery_active ON intensive_recovery_cycles(problem_id, completed_date)',
      'CREATE INDEX IF NOT EXISTS idx_review_history_result_date ON review_history(result, review_date)',
      'CREATE INDEX IF NOT EXISTS idx_forgetting_patterns_lookup ON forgetting_patterns(stage_forgotten, times_forgotten)',
      'CREATE INDEX IF NOT EXISTS idx_review_schedules_stage ON review_schedules(stage)',
      'CREATE INDEX IF NOT EXISTS idx_intensive_cycles_problem ON intensive_recovery_cycles(problem_id, cycles_remaining)'
    ];
    
    for (const query of indexQueries) {
      try {
        await client.query(query);
        console.log('   ✓ Index created');
      } catch (err) {
        console.log(`   ⚠️  Index: ${err.message}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Spaced Repetition Schema applied successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Spaced Repetition Schema application failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function createSpacedRepetitionFunctions() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating spaced repetition PostgreSQL functions...');
    
    await client.query('BEGIN');
    
    // 1. Handle Forgetting Event Function
    console.log('📝 Creating handle_forgetting_event function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION handle_forgetting_event(
        p_problem_id BIGINT,
        p_forgotten_stage INTEGER,
        p_time_spent INTEGER DEFAULT NULL,
        p_confusion_notes TEXT DEFAULT NULL,
        p_specific_mistakes TEXT[] DEFAULT NULL
      ) RETURNS TABLE (
        recovery_plan TEXT,
        next_review_date DATE,
        intensive_reviews_needed INTEGER,
        study_recommendations TEXT[],
        urgency_level INTEGER,
        estimated_recovery_days INTEGER
      ) AS $$
      DECLARE
        forgetting_count INTEGER;
        recovery_pattern RECORD;
        problem_diff difficulty_level;
        next_review DATE;
        study_suggestions TEXT[];
        urgency INTEGER;
        recovery_message TEXT;
        recovery_days INTEGER;
      BEGIN
        -- Count how many times this problem has been forgotten in last 90 days
        SELECT COUNT(*) INTO forgetting_count
        FROM review_history 
        WHERE problem_id = p_problem_id 
        AND result = 'forgot'
        AND review_date >= CURRENT_DATE - 90;
        
        -- Get problem difficulty
        SELECT difficulty INTO problem_diff FROM problems WHERE id = p_problem_id;
        
        -- Get the appropriate recovery pattern
        SELECT * INTO recovery_pattern 
        FROM forgetting_patterns 
        WHERE stage_forgotten = p_forgotten_stage
        AND times_forgotten = LEAST(forgetting_count + 1, 3)  -- Cap at 3 for worst case
        ORDER BY times_forgotten DESC 
        LIMIT 1;
        
        -- Fallback if no pattern found
        IF recovery_pattern IS NULL THEN
          recovery_pattern := ROW(1, 1, 1, 2, 'Default recovery pattern')::forgetting_patterns;
        END IF;
        
        -- Calculate next review date (always at least tomorrow)
        next_review := CURRENT_DATE + recovery_pattern.reset_interval_days;
        
        -- Calculate estimated recovery time
        recovery_days := recovery_pattern.intensive_review_count * recovery_pattern.reset_interval_days;
        
        -- Determine urgency level
        urgency := CASE 
          WHEN forgetting_count >= 2 THEN 5  -- Critical
          WHEN p_forgotten_stage <= 2 THEN 4  -- High (early stage forgetting)
          WHEN p_forgotten_stage <= 4 THEN 3  -- Medium  
          ELSE 2  -- Low
        END;
        
        -- Generate study recommendations based on forgetting pattern
        study_suggestions := CASE forgetting_count + 1
          WHEN 1 THEN ARRAY[
            'Review the base pattern theory today',
            'Write out the algorithm step-by-step',
            'Practice 1-2 similar problems',
            'Focus on the key insight you missed',
            'Add pattern notes to your study guide'
          ]
          WHEN 2 THEN ARRAY[
            'STUDY THE PATTERN FUNDAMENTALS TODAY',
            'Watch video explanation of the pattern',
            'Code the pattern template from memory',
            'Practice 3-4 similar problems this week',
            'Identify what specific part confuses you',
            'Consider if this pattern conflicts with another',
            'Create a pattern comparison chart'
          ]
          ELSE ARRAY[
            'CRITICAL: COMPLETE PATTERN RE-LEARNING NEEDED',
            'Schedule focused study session (45+ minutes today)',
            'Start with easiest problems in this pattern',
            'Create your own pattern template/cheatsheet',
            'Practice 5+ similar problems over next week',
            'Consider getting additional learning resources',
            'May indicate fundamental conceptual gap',
            'Consider pairing this with mentor/study group review'
          ]
        END;
        
        -- Create recovery plan message
        recovery_message := CASE forgetting_count + 1
          WHEN 1 THEN format('STANDARD RESET: Forgot at stage %s. Reset to %s-day cycle with %s daily intensive reviews.',
                            p_forgotten_stage, recovery_pattern.reset_interval_days, recovery_pattern.intensive_review_count)
          WHEN 2 THEN format('CONCERNING PATTERN: Second forgetting at stage %s. Extended reset with %s daily intensive reviews. Pattern may be conflicting with others.',
                            p_forgotten_stage, recovery_pattern.intensive_review_count)
          ELSE format('CRITICAL INTERVENTION: Third+ forgetting indicates fundamental pattern breakdown. Intensive %s-day recovery needed.',
                      recovery_days)
        END;
        
        -- Record the forgetting event with detailed analysis
        INSERT INTO review_history (
          problem_id, result, review_stage, scheduled_review_time, 
          time_spent_minutes, review_notes, actual_delay_hours
        ) VALUES (
          p_problem_id, 'forgot', 1, next_review::TIMESTAMP,  -- Reset to stage 1
          p_time_spent, 
          format('FORGOT at stage %s. Count: %s. Reset plan: %s intensive reviews over %s days. Notes: %s',
                 p_forgotten_stage, forgetting_count + 1, recovery_pattern.intensive_review_count,
                 recovery_days, COALESCE(p_confusion_notes, 'No specific notes')),
          CASE WHEN p_forgotten_stage > 1 THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - (
              SELECT scheduled_review_time FROM review_history 
              WHERE problem_id = p_problem_id 
              ORDER BY review_date DESC LIMIT 1
            )))/3600
          ELSE 0 END
        );
        
        -- Create intensive recovery cycle
        INSERT INTO intensive_recovery_cycles (problem_id, cycles_remaining, cycle_interval_days)
        VALUES (p_problem_id, recovery_pattern.intensive_review_count, recovery_pattern.reset_interval_days);
        
        -- Add specific mistakes if provided
        IF p_specific_mistakes IS NOT NULL THEN
          INSERT INTO mistakes (problem_id, description, mistake_type, review_session_id)
          SELECT p_problem_id, unnest(p_specific_mistakes), 'logic_error', currval('review_history_id_seq');
        END IF;
        
        RETURN QUERY SELECT 
          recovery_message,
          next_review,
          recovery_pattern.intensive_review_count,
          study_suggestions,
          urgency,
          recovery_days;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ handle_forgetting_event function created');
    
    // 2. Process Daily Intensive Recovery Function
    console.log('📝 Creating process_daily_intensive_recovery function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION process_daily_intensive_recovery(
        p_problem_id BIGINT,
        p_result review_result,
        p_notes TEXT DEFAULT NULL
      ) RETURNS TABLE (
        status TEXT,
        cycles_remaining INTEGER,
        next_review_date DATE,
        graduation_status TEXT,
        days_until_normal_cycle INTEGER
      ) AS $$
      DECLARE
        current_cycle RECORD;
        next_date DATE;
        status_msg TEXT;
        graduation_msg TEXT;
        days_remaining INTEGER;
      BEGIN
        -- Get current intensive cycle status
        SELECT * INTO current_cycle 
        FROM intensive_recovery_cycles 
        WHERE problem_id = p_problem_id 
        AND completed_date IS NULL 
        ORDER BY started_date DESC 
        LIMIT 1;
        
        IF current_cycle IS NULL THEN
          RETURN QUERY SELECT 'No intensive cycle active'::TEXT, 0, CURRENT_DATE, 'Normal review cycle'::TEXT, 0;
          RETURN;
        END IF;
        
        IF p_result = 'remembered' THEN
          -- Successful intensive review
          UPDATE intensive_recovery_cycles 
          SET cycles_remaining = cycles_remaining - 1
          WHERE id = current_cycle.id;
          
          days_remaining := current_cycle.cycles_remaining - 1;
          
          IF days_remaining <= 0 THEN
            -- Graduated from intensive cycle
            UPDATE intensive_recovery_cycles 
            SET completed_date = CURRENT_DATE
            WHERE id = current_cycle.id;
            
            -- Start normal review cycle from stage 1
            INSERT INTO review_history (problem_id, result, review_stage, scheduled_review_time, review_notes)
            VALUES (p_problem_id, 'remembered', 1, (CURRENT_DATE + 1)::TIMESTAMP,
                    'Graduated from intensive recovery - starting normal daily cycle');
            
            status_msg := 'GRADUATED from intensive recovery';
            graduation_msg := 'Ready for normal spaced repetition cycle';
            next_date := CURRENT_DATE + 1;  -- Tomorrow
            days_remaining := 0;
            
          ELSE
            -- Continue intensive cycle
            next_date := CURRENT_DATE + current_cycle.cycle_interval_days;
            status_msg := format('Intensive cycle continues - %s daily reviews remaining', days_remaining);
            graduation_msg := 'Still in recovery mode';
          END IF;
          
        ELSE
          -- Failed intensive review - restart the intensive cycle
          UPDATE intensive_recovery_cycles 
          SET cycles_remaining = (SELECT intensive_review_count FROM forgetting_patterns
                                  WHERE stage_forgotten = 1 AND times_forgotten = 1 LIMIT 1),
              started_date = CURRENT_DATE
          WHERE id = current_cycle.id;
          
          next_date := CURRENT_DATE + current_cycle.cycle_interval_days;
          status_msg := 'FAILED intensive review - cycle restarted';
          graduation_msg := 'Extended recovery needed';
          days_remaining := (SELECT intensive_review_count FROM forgetting_patterns
                             WHERE stage_forgotten = 1 AND times_forgotten = 1 LIMIT 1);
        END IF;
        
        RETURN QUERY SELECT 
          status_msg,
          (SELECT cycles_remaining FROM intensive_recovery_cycles WHERE id = current_cycle.id),
          next_date,
          graduation_msg,
          days_remaining;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ process_daily_intensive_recovery function created');
    
    // 3. Get Daily Review Queue Function
    console.log('📝 Creating get_daily_review_queue function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION get_daily_review_queue(p_target_date DATE DEFAULT CURRENT_DATE)
      RETURNS TABLE (
        problem_id BIGINT,
        problem_title TEXT,
        difficulty difficulty_level,
        review_type TEXT,
        priority INTEGER,
        days_overdue INTEGER,
        last_review_date DATE,
        times_forgotten BIGINT,
        pattern_names TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        WITH review_data AS (
          SELECT 
            p.id,
            p.title,
            p.difficulty,
            rh.scheduled_review_time::DATE as scheduled_date,
            rh.review_date::DATE as last_reviewed,
            COUNT(*) FILTER (WHERE rh2.result = 'forgot' AND rh2.review_date >= CURRENT_DATE - 90) as forgot_count,
            CASE 
              WHEN irc.cycles_remaining > 0 THEN 'INTENSIVE_RECOVERY'
              WHEN rh.scheduled_review_time::DATE <= p_target_date THEN 'NORMAL_REVIEW'
              ELSE 'NOT_DUE'
            END as review_type,
            GREATEST(0, p_target_date - rh.scheduled_review_time::DATE) as overdue_days,
            STRING_AGG(DISTINCT pt.name, ', ') as patterns
          FROM problems p
          LEFT JOIN review_history rh ON p.id = rh.problem_id 
            AND rh.id = (SELECT id FROM review_history rh2 WHERE rh2.problem_id = p.id ORDER BY review_date DESC LIMIT 1)
          LEFT JOIN review_history rh2 ON p.id = rh2.problem_id
          LEFT JOIN intensive_recovery_cycles irc ON p.id = irc.problem_id AND irc.completed_date IS NULL
          LEFT JOIN problem_tags ptags ON p.id = ptags.problem_id  
          LEFT JOIN patterns pt ON ptags.pattern_id = pt.id
          WHERE p.solved = true  -- Only include solved problems
          GROUP BY p.id, p.title, p.difficulty, rh.scheduled_review_time, rh.review_date, irc.cycles_remaining
        )
        SELECT 
          rd.id,
          rd.title,
          rd.difficulty,
          rd.review_type,
          CASE rd.review_type
            WHEN 'INTENSIVE_RECOVERY' THEN 1  -- Highest priority
            WHEN 'NORMAL_REVIEW' THEN 
              CASE 
                WHEN rd.forgot_count >= 2 THEN 2  -- High priority for frequently forgotten
                WHEN rd.overdue_days > 3 THEN 3   -- Medium-high priority for overdue
                WHEN rd.overdue_days > 0 THEN 4   -- Medium priority for slightly overdue
                ELSE 5                            -- Normal priority for on-time
              END
            ELSE 6  -- Lowest priority for not due
          END as priority,
          rd.overdue_days::INTEGER,
          rd.last_reviewed,
          rd.forgot_count,
          rd.patterns
        FROM review_data rd
        WHERE rd.review_type IN ('INTENSIVE_RECOVERY', 'NORMAL_REVIEW')
        ORDER BY priority ASC, overdue_days DESC, rd.forgot_count DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ get_daily_review_queue function created');
    
    // 4. Schedule Initial Review Function
    console.log('📝 Creating schedule_initial_review function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION schedule_initial_review(p_problem_id BIGINT)
      RETURNS TABLE (
        scheduled_date DATE,
        review_stage INTEGER,
        message TEXT
      ) AS $$
      DECLARE
        next_review_date DATE;
      BEGIN
        -- Schedule first review for today (stage 1) - immediate review
        next_review_date := CURRENT_DATE;
        
        -- Insert initial review history entry
        INSERT INTO review_history (
          problem_id, 
          result, 
          review_stage, 
          scheduled_review_time, 
          review_notes,
          interval_days,
          next_review_date
        ) VALUES (
          p_problem_id,
          'remembered',  -- Initial solve counts as remembered
          1,
          next_review_date::TIMESTAMP,
          'Initial solve - scheduled for immediate review today',
          0,
          next_review_date
        );
        
        RETURN QUERY SELECT 
          next_review_date,
          1,
          format('Problem scheduled for first review on %s', next_review_date);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ schedule_initial_review function created');
    
    await client.query('COMMIT');
    console.log('✅ All spaced repetition functions created successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Function creation failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function verifySpacedRepetitionSetup() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Verifying spaced repetition setup...');
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('review_schedules', 'forgetting_patterns', 'intensive_recovery_cycles')
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Spaced Repetition Tables (${tables.rows.length}/3):`);
    tables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
    
    // Check functions
    const functions = await client.query(`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('handle_forgetting_event', 'process_daily_intensive_recovery', 'get_daily_review_queue', 'schedule_initial_review')
      ORDER BY routine_name
    `);
    
    console.log(`\n📊 Spaced Repetition Functions (${functions.rows.length}/4):`);
    functions.rows.forEach(row => console.log(`   ✓ ${row.routine_name}`));
    
    // Check data
    const scheduleCount = await client.query('SELECT COUNT(*) FROM review_schedules');
    const patternCount = await client.query('SELECT COUNT(*) FROM forgetting_patterns');
    
    console.log('\n📊 Data verification:');
    console.log(`   ✓ Review Schedules: ${scheduleCount.rows[0].count}`);
    console.log(`   ✓ Forgetting Patterns: ${patternCount.rows[0].count}`);
    
    // Test functions with sample data
    console.log('\n🧪 Testing functions...');
    
    // Test daily review queue (should be empty initially)
    const queueTest = await client.query('SELECT * FROM get_daily_review_queue()');
    console.log(`   ✓ Daily review queue: ${queueTest.rows.length} problems due`);
    
    console.log('\n🎉 Spaced Repetition System setup completed successfully!');
    console.log('\n🚀 Ready for next steps:');
    console.log('   1. ✅ Database schema and functions - COMPLETED');
    console.log('   2. 🔄 Backend API endpoints - READY TO START');
    console.log('   3. 🔄 Frontend components - READY TO START');
    
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Main execution
async function main() {
  try {
    await applySpacedRepetitionSchema();
    await createSpacedRepetitionFunctions();
    await verifySpacedRepetitionSetup();
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  }
}

main();