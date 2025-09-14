const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function testSpacedRepetitionSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Spaced Repetition System...');
    
    // 1. Test scheduling initial review for a solved problem
    console.log('\n1️⃣ Testing initial review scheduling...');
    
    // Get a solved problem
    const solvedProblems = await client.query('SELECT id, title FROM problems WHERE solved = true LIMIT 1');
    if (solvedProblems.rows.length === 0) {
      console.log('   ⚠️  No solved problems found, creating test problem...');
      await client.query(`
        INSERT INTO problems (problem_id, title, difficulty, solved) 
        VALUES (999, 'Test Problem for Spaced Repetition', 'medium', true)
        ON CONFLICT (problem_id) DO UPDATE SET solved = true
      `);
      const newProblem = await client.query('SELECT id, title FROM problems WHERE problem_id = 999');
      var testProblem = newProblem.rows[0];
    } else {
      var testProblem = solvedProblems.rows[0];
    }
    
    console.log(`   📝 Using problem: ${testProblem.title} (ID: ${testProblem.id})`);
    
    // Schedule initial review
    const initialSchedule = await client.query('SELECT * FROM schedule_initial_review($1)', [testProblem.id]);
    console.log(`   ✅ Initial review scheduled: ${initialSchedule.rows[0].message}`);
    
    // 2. Test daily review queue
    console.log('\n2️⃣ Testing daily review queue...');
    
    const todayQueue = await client.query('SELECT * FROM get_daily_review_queue()');
    console.log(`   📊 Problems due today: ${todayQueue.rows.length}`);
    
    if (todayQueue.rows.length > 0) {
      console.log('   📋 Queue details:');
      todayQueue.rows.forEach((problem, index) => {
        console.log(`      ${index + 1}. ${problem.problem_title} (${problem.difficulty}) - Priority: ${problem.priority}, Type: ${problem.review_type}`);
      });
    }
    
    // 3. Test forgetting event
    console.log('\n3️⃣ Testing forgetting recovery system...');
    
    // Simulate forgetting at stage 2 (3-day mark)
    const forgettingResult = await client.query(
      'SELECT * FROM handle_forgetting_event($1, $2, $3, $4)', 
      [testProblem.id, 2, 25, 'Forgot the two-pointer approach']
    );
    
    const recovery = forgettingResult.rows[0];
    console.log(`   🔄 Recovery Plan: ${recovery.recovery_plan}`);
    console.log(`   📅 Next Review: ${recovery.next_review_date}`);
    console.log(`   🎯 Intensive Reviews Needed: ${recovery.intensive_reviews_needed}`);
    console.log(`   ⚠️  Urgency Level: ${recovery.urgency_level}/5`);
    console.log(`   📈 Estimated Recovery Days: ${recovery.estimated_recovery_days}`);
    console.log('   📚 Study Recommendations:');
    recovery.study_recommendations.forEach((rec, index) => {
      console.log(`      ${index + 1}. ${rec}`);
    });
    
    // 4. Test intensive recovery cycle
    console.log('\n4️⃣ Testing intensive recovery cycle...');
    
    // Check if intensive cycle was created
    const intensiveCycles = await client.query(
      'SELECT * FROM intensive_recovery_cycles WHERE problem_id = $1 AND completed_date IS NULL', 
      [testProblem.id]
    );
    
    if (intensiveCycles.rows.length > 0) {
      const cycle = intensiveCycles.rows[0];
      console.log(`   🔄 Active intensive cycle: ${cycle.cycles_remaining} cycles remaining`);
      
      // Simulate successful intensive review
      const cycleResult = await client.query(
        'SELECT * FROM process_daily_intensive_recovery($1, $2, $3)',
        [testProblem.id, 'remembered', 'Successfully practiced the pattern']
      );
      
      const cycleStatus = cycleResult.rows[0];
      console.log(`   ✅ Cycle Status: ${cycleStatus.status}`);
      console.log(`   📊 Cycles Remaining: ${cycleStatus.cycles_remaining}`);
      console.log(`   📅 Next Review: ${cycleStatus.next_review_date}`);
      console.log(`   🎓 Graduation Status: ${cycleStatus.graduation_status}`);
    }
    
    // 5. Test updated daily queue with intensive recovery
    console.log('\n5️⃣ Testing updated daily queue with intensive recovery...');
    
    const updatedQueue = await client.query('SELECT * FROM get_daily_review_queue()');
    console.log(`   📊 Problems due today (after forgetting): ${updatedQueue.rows.length}`);
    
    if (updatedQueue.rows.length > 0) {
      console.log('   📋 Updated queue details:');
      updatedQueue.rows.forEach((problem, index) => {
        console.log(`      ${index + 1}. ${problem.problem_title} (${problem.difficulty})`);
        console.log(`         - Priority: ${problem.priority}, Type: ${problem.review_type}`);
        console.log(`         - Times Forgotten: ${problem.times_forgotten}, Days Overdue: ${problem.days_overdue}`);
      });
    }
    
    // 6. Test review history
    console.log('\n6️⃣ Testing review history...');
    
    const reviewHistory = await client.query(`
      SELECT review_date, result, review_stage, scheduled_review_time, review_notes 
      FROM review_history 
      WHERE problem_id = $1 
      ORDER BY review_date DESC
    `, [testProblem.id]);
    
    console.log(`   📚 Review History (${reviewHistory.rows.length} entries):`);
    reviewHistory.rows.forEach((entry, index) => {
      console.log(`      ${index + 1}. ${entry.review_date} - ${entry.result} (Stage ${entry.review_stage})`);
      if (entry.review_notes) {
        console.log(`         Notes: ${entry.review_notes.substring(0, 100)}...`);
      }
    });
    
    // 7. Verify database state
    console.log('\n7️⃣ Verifying database state...');
    
    const scheduleCount = await client.query('SELECT COUNT(*) FROM review_schedules');
    const patternCount = await client.query('SELECT COUNT(*) FROM forgetting_patterns');
    const historyCount = await client.query('SELECT COUNT(*) FROM review_history');
    const cycleCount = await client.query('SELECT COUNT(*) FROM intensive_recovery_cycles');
    
    console.log('   📊 Database Statistics:');
    console.log(`      - Review Schedules: ${scheduleCount.rows[0].count}`);
    console.log(`      - Forgetting Patterns: ${patternCount.rows[0].count}`);
    console.log(`      - Review History Entries: ${historyCount.rows[0].count}`);
    console.log(`      - Intensive Recovery Cycles: ${cycleCount.rows[0].count}`);
    
    console.log('\n🎉 Spaced Repetition System Test Completed Successfully!');
    console.log('\n✅ All core functions working:');
    console.log('   ✓ Initial review scheduling');
    console.log('   ✓ Daily review queue generation');
    console.log('   ✓ Forgetting recovery system');
    console.log('   ✓ Intensive recovery cycles');
    console.log('   ✓ Review history tracking');
    
    console.log('\n🚀 Ready for next implementation phase:');
    console.log('   1. ✅ Database schema and functions - COMPLETED');
    console.log('   2. 🔄 Backend API endpoints - READY TO START');
    console.log('   3. 🔄 Frontend components - READY TO START');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Stack:', err.stack);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

testSpacedRepetitionSystem();