const { Pool } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function testSpacedRepetitionFix() {
  try {
    console.log('🧪 Testing Spaced Repetition Fix...\n');
    
    // Step 1: Get a solved problem to test with
    console.log('1️⃣ Getting a test problem...');
    const solvedResponse = await fetch('http://localhost:3001/api/solved');
    const solvedProblems = await solvedResponse.json();
    
    if (solvedProblems.length === 0) {
      console.log('❌ No solved problems found for testing');
      return;
    }
    
    const testProblem = solvedProblems[0];
    console.log(`📝 Using problem: "${testProblem.title}" (ID: ${testProblem.id})`);
    
    // Step 2: Clear any existing review history for this problem
    console.log('\n2️⃣ Clearing existing review history...');
    await pool.query('DELETE FROM review_history WHERE problem_id = $1', [testProblem.id]);
    console.log('✅ Review history cleared');
    
    // Step 3: Test first "remembered" review (should schedule for tomorrow)
    console.log('\n3️⃣ Testing first "remembered" review...');
    
    const firstReviewData = {
      problem_id: testProblem.id,
      result: 'remembered',
      time_spent: 5,
      notes: 'First review test'
    };
    
    const firstResponse = await fetch('http://localhost:3001/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firstReviewData)
    });
    
    if (firstResponse.ok) {
      const firstResult = await firstResponse.json();
      console.log('✅ First review submitted successfully');
      console.log(`📅 Next review date: ${firstResult.next_review_date}`);
      console.log(`🎯 Review stage: ${firstResult.next_stage}`);
      console.log(`⏱️ Interval days: ${firstResult.interval_days}`);
      
      // Check if it's scheduled for tomorrow (1 day)
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const expectedDate = tomorrow.toISOString().split('T')[0];
      
      if (firstResult.next_review_date === expectedDate) {
        console.log('✅ CORRECT: First review scheduled for tomorrow!');
      } else {
        console.log(`❌ WRONG: Expected ${expectedDate}, got ${firstResult.next_review_date}`);
      }
    } else {
      console.log('❌ First review failed');
      return;
    }
    
    // Step 4: Test second "remembered" review (should schedule for 3 days later)
    console.log('\n4️⃣ Testing second "remembered" review...');
    
    const secondReviewData = {
      problem_id: testProblem.id,
      result: 'remembered',
      time_spent: 4,
      notes: 'Second review test'
    };
    
    const secondResponse = await fetch('http://localhost:3001/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(secondReviewData)
    });
    
    if (secondResponse.ok) {
      const secondResult = await secondResponse.json();
      console.log('✅ Second review submitted successfully');
      console.log(`📅 Next review date: ${secondResult.next_review_date}`);
      console.log(`🎯 Review stage: ${secondResult.next_stage}`);
      console.log(`⏱️ Interval days: ${secondResult.interval_days}`);
      
      // Check if it's scheduled for 3 days from today
      const today = new Date();
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);
      const expectedDate = threeDaysLater.toISOString().split('T')[0];
      
      if (secondResult.next_review_date === expectedDate) {
        console.log('✅ CORRECT: Second review scheduled for 3 days later!');
      } else {
        console.log(`❌ WRONG: Expected ${expectedDate}, got ${secondResult.next_review_date}`);
      }
    } else {
      console.log('❌ Second review failed');
      return;
    }
    
    // Step 5: Check review history
    console.log('\n5️⃣ Checking review history...');
    const historyResult = await pool.query(`
      SELECT review_stage, interval_days, next_review_date, result, review_notes
      FROM review_history 
      WHERE problem_id = $1 
      ORDER BY id ASC
    `, [testProblem.id]);
    
    console.log('📋 Review history:');
    historyResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Stage ${row.review_stage}, ${row.interval_days} days, next: ${row.next_review_date}, result: ${row.result}`);
    });
    
    console.log('\n🎉 Spaced Repetition Test Complete!');
    console.log('\n📋 Expected behavior:');
    console.log('✅ First "remembered" → Schedule for tomorrow (1 day)');
    console.log('✅ Second "remembered" → Schedule for 3 days later');
    console.log('✅ Third "remembered" → Schedule for 7 days later');
    console.log('✅ And so on following the pattern: [0,1,3,7,14,30,60,120]');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testSpacedRepetitionFix();