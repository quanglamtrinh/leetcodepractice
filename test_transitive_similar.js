const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testTransitiveSimilarProblems() {
  console.log('🧪 Testing Transitive Similar Problems Functionality\n');
  
  try {
    // First, let's get some test problems
    const problemsResult = await pool.query(`
      SELECT id, title, similar_problems 
      FROM problems 
      WHERE id IN (1, 2, 3, 4, 5)
      ORDER BY id
    `);
    
    console.log('📋 Initial state of test problems:');
    problemsResult.rows.forEach(problem => {
      console.log(`  Problem ${problem.id}: "${problem.title}" - Similar: [${problem.similar_problems.join(', ')}]`);
    });
    
    // Test 1: Add problem 2 to problem 1's similar problems
    console.log('\n🔗 Test 1: Adding problem 2 to problem 1 with transitive closure...');
    
    const response1 = await fetch('http://localhost:3001/api/problems/1/similar/transitive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ similarProblemId: 2 })
    });
    
    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ Success:', result1.message);
      console.log('📊 Problem 1 similar problems:', result1.problem1_similar_problems);
      console.log('📊 Problem 2 similar problems:', result1.problem2_similar_problems);
    } else {
      console.error('❌ Failed:', await response1.text());
    }
    
    // Test 2: Add problem 3 to problem 2's similar problems (should create transitive relationships)
    console.log('\n🔗 Test 2: Adding problem 3 to problem 2 with transitive closure...');
    
    const response2 = await fetch('http://localhost:3001/api/problems/2/similar/transitive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ similarProblemId: 3 })
    });
    
    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Success:', result2.message);
      console.log('📊 Problem 2 similar problems:', result2.problem1_similar_problems);
      console.log('📊 Problem 3 similar problems:', result2.problem2_similar_problems);
    } else {
      console.error('❌ Failed:', await response2.text());
    }
    
    // Check final state
    console.log('\n📋 Final state of test problems:');
    const finalResult = await pool.query(`
      SELECT id, title, similar_problems 
      FROM problems 
      WHERE id IN (1, 2, 3, 4, 5)
      ORDER BY id
    `);
    
    finalResult.rows.forEach(problem => {
      console.log(`  Problem ${problem.id}: "${problem.title}" - Similar: [${problem.similar_problems.join(', ')}]`);
    });
    
    // Verify transitive relationships
    console.log('\n🔍 Verifying transitive relationships:');
    console.log('  - Problem 1 should be similar to both 2 and 3');
    console.log('  - Problem 2 should be similar to both 1 and 3');
    console.log('  - Problem 3 should be similar to both 1 and 2');
    
    const problem1 = finalResult.rows.find(p => p.id === 1);
    const problem2 = finalResult.rows.find(p => p.id === 2);
    const problem3 = finalResult.rows.find(p => p.id === 3);
    
    console.log(`\n✅ Verification:`);
    console.log(`  Problem 1 similar to 2: ${problem1.similar_problems.includes(2) ? '✅' : '❌'}`);
    console.log(`  Problem 1 similar to 3: ${problem1.similar_problems.includes(3) ? '✅' : '❌'}`);
    console.log(`  Problem 2 similar to 1: ${problem2.similar_problems.includes(1) ? '✅' : '❌'}`);
    console.log(`  Problem 2 similar to 3: ${problem2.similar_problems.includes(3) ? '✅' : '❌'}`);
    console.log(`  Problem 3 similar to 1: ${problem3.similar_problems.includes(1) ? '✅' : '❌'}`);
    console.log(`  Problem 3 similar to 2: ${problem3.similar_problems.includes(2) ? '✅' : '❌'}`);
    
    // Test 3: Remove problem 2 from problem 1's similar problems (should break transitive relationships)
    console.log('\n🗑️ Test 3: Removing problem 2 from problem 1 with transitive closure...');
    
    const response3 = await fetch('http://localhost:3001/api/problems/1/similar/transitive/2', {
      method: 'DELETE'
    });
    
    if (response3.ok) {
      const result3 = await response3.json();
      console.log('✅ Success:', result3.message);
      console.log('📊 Problem 1 similar problems after removal:', result3.problem1_similar_problems);
      console.log('📊 Problem 2 similar problems after removal:', result3.problem2_similar_problems);
      console.log('📊 Transitive removals:', result3.removed_relationships.transitive_removals);
    } else {
      console.error('❌ Failed:', await response3.text());
    }
    
    // Check final state after removal
    console.log('\n📋 Final state after removal:');
    const afterRemovalResult = await pool.query(`
      SELECT id, title, similar_problems 
      FROM problems 
      WHERE id IN (1, 2, 3, 4, 5)
      ORDER BY id
    `);
    
    afterRemovalResult.rows.forEach(problem => {
      console.log(`  Problem ${problem.id}: "${problem.title}" - Similar: [${problem.similar_problems.join(', ')}]`);
    });
    
    // Verify that transitive relationships are broken
    console.log('\n🔍 Verifying transitive relationships are broken:');
    const problem1After = afterRemovalResult.rows.find(p => p.id === 1);
    const problem2After = afterRemovalResult.rows.find(p => p.id === 2);
    const problem3After = afterRemovalResult.rows.find(p => p.id === 3);
    
    console.log(`\n✅ After removal verification:`);
    console.log(`  Problem 1 similar to 2: ${problem1After.similar_problems.includes(2) ? '❌ (should be false)' : '✅ (correctly removed)'}`);
    console.log(`  Problem 1 similar to 3: ${problem1After.similar_problems.includes(3) ? '❌ (should be false - transitive broken)' : '✅ (correctly removed)'}`);
    console.log(`  Problem 2 similar to 1: ${problem2After.similar_problems.includes(1) ? '❌ (should be false)' : '✅ (correctly removed)'}`);
    console.log(`  Problem 2 similar to 3: ${problem2After.similar_problems.includes(3) ? '❌ (should be false - transitive broken)' : '✅ (correctly removed)'}`);
    console.log(`  Problem 3 similar to 1: ${problem3After.similar_problems.includes(1) ? '❌ (should be false - transitive broken)' : '✅ (correctly removed)'}`);
    console.log(`  Problem 3 similar to 2: ${problem3After.similar_problems.includes(2) ? '❌ (should be false - transitive broken)' : '✅ (correctly removed)'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testTransitiveSimilarProblems();
