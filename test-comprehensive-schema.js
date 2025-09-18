const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'leetcode_practice',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function testSchema() {
  try {
    console.log('🧪 Testing comprehensive schema functions...\n');
    
    // Test 1: Insert a test problem (or use existing one)
    console.log('1. Inserting test problem...');
    let problemResult;
    try {
      problemResult = await pool.query(`
        INSERT INTO problems (problem_id, title, difficulty, concept)
        VALUES (9999, 'Test Problem', 'easy', 'hash-table')
        RETURNING id, title, difficulty
      `);
    } catch (error) {
      if (error.code === '23505') {
        // Problem already exists, get it
        problemResult = await pool.query(`
          SELECT id, title, difficulty FROM problems WHERE problem_id = 9999
        `);
        console.log('   ℹ️  Using existing test problem');
      } else {
        throw error;
      }
    }
    const problemId = problemResult.rows[0].id;
    console.log('   ✅ Problem inserted:', problemResult.rows[0]);
    
    // Test 2: Test get_due_problems_today function
    console.log('\n2. Testing get_due_problems_today function...');
    const dueProblems = await pool.query('SELECT * FROM get_due_problems_today()');
    console.log('   📋 Due problems count:', dueProblems.rows.length);
    
    // Test 3: Test add_review_session function
    console.log('\n3. Testing add_review_session function...');
    await pool.query(`
      SELECT add_review_session($1, 'remembered', 'First attempt - solved correctly', 15)
    `, [problemId]);
    console.log('   ✅ Review session added successfully');
    
    // Test 4: Check review history
    console.log('\n4. Checking review history...');
    const reviewHistory = await pool.query(`
      SELECT * FROM review_history WHERE problem_id = $1
    `, [problemId]);
    console.log('   📊 Review history entries:', reviewHistory.rows.length);
    if (reviewHistory.rows.length > 0) {
      console.log('   📅 Latest review:', {
        result: reviewHistory.rows[0].result,
        interval_days: reviewHistory.rows[0].interval_days,
        next_review_date: reviewHistory.rows[0].next_review_date
      });
    }
    
    // Test 5: Test process_review_session with mistakes
    console.log('\n5. Testing process_review_session with mistakes...');
    await pool.query(`
      SELECT process_review_session(
        $1, 
        'forgot', 
        'Made some mistakes this time', 
        25,
        ARRAY['Forgot to handle edge case', 'Wrong time complexity'],
        ARRAY['edge_case', 'time_complexity']::mistake_type[]
      )
    `, [problemId]);
    console.log('   ✅ Review session with mistakes processed');
    
    // Test 6: Check mistakes table
    console.log('\n6. Checking mistakes table...');
    const mistakes = await pool.query(`
      SELECT * FROM mistakes WHERE problem_id = $1
    `, [problemId]);
    console.log('   🐛 Mistakes recorded:', mistakes.rows.length);
    mistakes.rows.forEach((mistake, index) => {
      console.log(`   ${index + 1}. ${mistake.mistake_type}: ${mistake.description}`);
    });
    
    // Test 7: Test views
    console.log('\n7. Testing views...');
    
    // Test problem_stats view
    const problemStats = await pool.query(`
      SELECT * FROM problem_stats WHERE id = $1
    `, [problemId]);
    if (problemStats.rows.length > 0) {
      const stats = problemStats.rows[0];
      console.log('   📈 Problem stats:', {
        title: stats.title,
        total_reviews: stats.total_reviews,
        successful_reviews: stats.successful_reviews,
        failed_reviews: stats.failed_reviews,
        success_rate: stats.success_rate + '%'
      });
    }
    
    // Test mistake_analysis view
    const mistakeAnalysis = await pool.query(`
      SELECT * FROM mistake_analysis WHERE title = 'Two Sum'
    `);
    console.log('   🔍 Mistake analysis entries:', mistakeAnalysis.rows.length);
    mistakeAnalysis.rows.forEach(analysis => {
      console.log(`   - ${analysis.mistake_type}: ${analysis.mistake_count} occurrences`);
    });
    
    // Test 8: Test pattern and variant system
    console.log('\n8. Testing pattern and variant system...');
    
    // Insert a pattern
    const patternResult = await pool.query(`
      INSERT INTO patterns (name, description, concept_id)
      VALUES ('Two Pointers', 'Use two pointers to solve array problems', 
              (SELECT id FROM concepts WHERE concept_id = 'two-pointers'))
      RETURNING id, name
    `);
    const patternId = patternResult.rows[0].id;
    console.log('   ✅ Pattern inserted:', patternResult.rows[0]);
    
    // Insert a variant
    const variantResult = await pool.query(`
      INSERT INTO variants (name, use_when, pattern_id, technique_id, goal_id)
      VALUES (
        'Fast and Slow Pointers', 
        'When detecting cycles or finding middle element',
        $1,
        (SELECT id FROM techniques WHERE name = 'Fast and Slow Pointers'),
        (SELECT id FROM goals WHERE name = 'Detect Cycle')
      )
      RETURNING id, name
    `, [patternId]);
    console.log('   ✅ Variant inserted:', variantResult.rows[0]);
    
    // Test 9: Test problem_tags associations
    console.log('\n9. Testing problem_tags associations...');
    await pool.query(`
      INSERT INTO problem_tags (problem_id, pattern_id, concept_id)
      VALUES ($1, $2, (SELECT id FROM concepts WHERE concept_id = 'two-pointers'))
    `, [problemId, patternId]);
    console.log('   ✅ Problem tagged with pattern and concept');
    
    // Test 10: Query associated data
    console.log('\n10. Testing complex queries...');
    const complexQuery = await pool.query(`
      SELECT 
        p.title,
        p.difficulty,
        pat.name as pattern_name,
        c.name as concept_name,
        COUNT(rh.id) as review_count
      FROM problems p
      LEFT JOIN problem_tags pt ON p.id = pt.problem_id
      LEFT JOIN patterns pat ON pt.pattern_id = pat.id
      LEFT JOIN concepts c ON pt.concept_id = c.id
      LEFT JOIN review_history rh ON p.id = rh.problem_id
      WHERE p.id = $1
      GROUP BY p.id, p.title, p.difficulty, pat.name, c.name
    `, [problemId]);
    
    if (complexQuery.rows.length > 0) {
      const result = complexQuery.rows[0];
      console.log('   🔗 Complex query result:', {
        title: result.title,
        difficulty: result.difficulty,
        pattern: result.pattern_name,
        concept: result.concept_name,
        reviews: result.review_count
      });
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n🎉 Comprehensive schema is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testSchema();