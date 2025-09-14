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

async function applySchemaIncremental() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Applying schema incrementally (handling existing objects)...');
    
    // Backup existing problems data if any
    console.log('💾 Backing up existing data...');
    let existingProblems = [];
    try {
      const result = await client.query('SELECT * FROM problems');
      existingProblems = result.rows;
      console.log(`   ✓ Backed up ${existingProblems.length} existing problems`);
    } catch (err) {
      console.log('   ℹ️  No existing problems to backup');
    }
    
    await client.query('BEGIN');
    
    // 1. Create ENUM types (with IF NOT EXISTS equivalent)
    console.log('📋 Creating ENUM types...');
    
    const enumQueries = [
      {
        name: 'difficulty_level',
        query: `DO $$ BEGIN
          CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'review_result',
        query: `DO $$ BEGIN
          CREATE TYPE review_result AS ENUM ('remembered', 'forgot');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'mistake_type',
        query: `DO $$ BEGIN
          CREATE TYPE mistake_type AS ENUM (
            'logic_error', 
            'syntax_error', 
            'edge_case', 
            'time_complexity',
            'space_complexity', 
            'algorithm_choice', 
            'implementation_detail',
            'off_by_one',
            'boundary_condition',
            'data_structure_choice',
            'optimization',
            'other'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      }
    ];
    
    for (const enumDef of enumQueries) {
      try {
        await client.query(enumDef.query);
        console.log(`   ✓ ${enumDef.name}`);
      } catch (err) {
        console.log(`   ⚠️  ${enumDef.name}: ${err.message}`);
      }
    }
    
    // 2. Create tables (with CASCADE drops for clean slate)
    console.log('🏗️  Creating tables...');
    
    // Drop tables in reverse dependency order if they exist
    const dropTables = [
      'mistakes', 'review_attempts', 'review_history', 'review_patterns',
      'problem_tags', 'template_variants', 'variants', 'problems', 
      'patterns', 'template_basics', 'concepts', 'techniques', 'goals'
    ];
    
    for (const table of dropTables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      } catch (err) {
        console.log(`   ⚠️  Could not drop ${table}: ${err.message}`);
      }
    }
    
    // Create all tables
    const createTableQueries = [
      `CREATE TABLE goals (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE techniques (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE concepts (
        id BIGSERIAL PRIMARY KEY,
        concept_id VARCHAR(50) UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE template_basics (
        id BIGSERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        template_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE patterns (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_id BIGINT REFERENCES template_basics(id),
        concept_id BIGINT REFERENCES concepts(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE problems (
        id BIGSERIAL PRIMARY KEY,
        problem_id BIGINT UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        concept VARCHAR(100),
        difficulty difficulty_level NOT NULL,
        acceptance_rate DECIMAL(5,2),
        popularity BIGINT,
        solved BOOLEAN DEFAULT FALSE,
        notes TEXT,
        leetcode_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        solution BIGINT
      )`,
      
      `CREATE TABLE variants (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        use_when TEXT,
        notes TEXT,
        pattern_id BIGINT REFERENCES patterns(id),
        technique_id BIGINT REFERENCES techniques(id),
        goal_id BIGINT REFERENCES goals(id),
        concept_id BIGINT REFERENCES concepts(id),
        template_pattern_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE template_variants (
        id BIGSERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        template_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE problem_tags (
        id BIGSERIAL PRIMARY KEY,
        problem_id BIGINT REFERENCES problems(id) ON DELETE CASCADE,
        variant_id BIGINT REFERENCES variants(id) ON DELETE CASCADE,
        pattern_id BIGINT REFERENCES patterns(id) ON DELETE CASCADE,
        goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
        technique_id BIGINT REFERENCES techniques(id) ON DELETE CASCADE,
        concept_id BIGINT REFERENCES concepts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (problem_id IS NOT NULL)::int + 
          (variant_id IS NOT NULL)::int + 
          (pattern_id IS NOT NULL)::int + 
          (goal_id IS NOT NULL)::int + 
          (technique_id IS NOT NULL)::int + 
          (concept_id IS NOT NULL)::int >= 2
        )
      )`,
      
      `CREATE TABLE review_history (
        id BIGSERIAL PRIMARY KEY,
        problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        review_date DATE NOT NULL DEFAULT CURRENT_DATE,
        result review_result NOT NULL,
        interval_days INTEGER NOT NULL,
        next_review_date DATE NOT NULL,
        review_notes TEXT,
        time_spent_minutes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE review_attempts (
        id BIGSERIAL PRIMARY KEY,
        problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        review_attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
        review_result review_result NOT NULL,
        new_column INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE review_patterns (
        id BIGSERIAL PRIMARY KEY,
        difficulty difficulty_level NOT NULL,
        pattern TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE mistakes (
        id BIGSERIAL PRIMARY KEY,
        problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        mistake_type mistake_type NOT NULL DEFAULT 'other',
        code_snippet TEXT,
        correction TEXT,
        review_session_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const query of createTableQueries) {
      try {
        await client.query(query);
        const tableName = query.match(/CREATE TABLE (\w+)/)[1];
        console.log(`   ✓ ${tableName}`);
      } catch (err) {
        console.log(`   ❌ Table creation error: ${err.message}`);
      }
    }
    
    // 3. Create indexes
    console.log('📊 Creating indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty)',
      'CREATE INDEX IF NOT EXISTS idx_problems_solved ON problems(solved)',
      'CREATE INDEX IF NOT EXISTS idx_problems_problem_id ON problems(problem_id)',
      'CREATE INDEX IF NOT EXISTS idx_review_history_problem ON review_history(problem_id)',
      'CREATE INDEX IF NOT EXISTS idx_review_history_next_date ON review_history(next_review_date)',
      'CREATE INDEX IF NOT EXISTS idx_variants_pattern ON variants(pattern_id)',
      'CREATE INDEX IF NOT EXISTS idx_problem_tags_problem ON problem_tags(problem_id)',
      'CREATE INDEX IF NOT EXISTS idx_next_review_date ON review_history(next_review_date)',
      'CREATE INDEX IF NOT EXISTS idx_problem_review_date ON review_history(problem_id, review_date)',
      'CREATE INDEX IF NOT EXISTS idx_problem_attempt_date ON review_attempts(problem_id, review_attempt_date)',
      'CREATE INDEX IF NOT EXISTS idx_mistake_type ON mistakes(mistake_type)',
      'CREATE INDEX IF NOT EXISTS idx_problem_mistakes ON mistakes(problem_id)'
    ];
    
    for (const query of indexQueries) {
      try {
        await client.query(query);
        console.log(`   ✓ Index created`);
      } catch (err) {
        console.log(`   ⚠️  Index: ${err.message}`);
      }
    }
    
    // 4. Insert sample data
    console.log('📝 Inserting sample data...');
    
    const sampleDataQueries = [
      `INSERT INTO goals (name, description) VALUES 
        ('Master Arrays', 'Become proficient with array manipulation problems'),
        ('Dynamic Programming', 'Master DP concepts and patterns'),
        ('Graph Algorithms', 'Learn BFS, DFS, and advanced graph algorithms'),
        ('System Design', 'Prepare for system design interviews')
        ON CONFLICT (name) DO NOTHING`,
      
      `INSERT INTO techniques (name, description) VALUES 
        ('Two Pointers', 'Use two pointers to solve problems efficiently'),
        ('Sliding Window', 'Maintain a window of elements'),
        ('Binary Search', 'Divide and conquer search technique'),
        ('Dynamic Programming', 'Break down problems into subproblems')
        ON CONFLICT (name) DO NOTHING`,
      
      `INSERT INTO concepts (concept_id, name) VALUES 
        ('two-pointers', 'Two Pointers Technique'),
        ('sliding-window', 'Sliding Window'),
        ('binary-search', 'Binary Search'),
        ('dp', 'Dynamic Programming'),
        ('graph-traversal', 'Graph Traversal')
        ON CONFLICT (concept_id) DO NOTHING`,
      
      `INSERT INTO template_basics (description, template_code) VALUES 
        ('Two Pointers Template', 'def two_pointers(arr):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        # process\n        left += 1\n        right -= 1'),
        ('Binary Search Template', 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1')`,
      
      `INSERT INTO problems (problem_id, title, difficulty, acceptance_rate, solved) VALUES 
        (1, 'Two Sum', 'easy', 49.5, true),
        (15, '3Sum', 'medium', 32.1, false),
        (200, 'Number of Islands', 'medium', 56.8, true),
        (70, 'Climbing Stairs', 'easy', 51.2, true)
        ON CONFLICT (problem_id) DO NOTHING`
    ];
    
    for (const query of sampleDataQueries) {
      try {
        await client.query(query);
        console.log(`   ✓ Sample data inserted`);
      } catch (err) {
        console.log(`   ⚠️  Sample data: ${err.message}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Schema applied successfully!');
    
    // Verify the structure
    console.log('🧪 Verifying database structure...');
    
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Tables created (${tables.rows.length}):`);
    tables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
    
    // Check sample data
    const conceptsCount = await client.query('SELECT COUNT(*) FROM concepts');
    const techniquesCount = await client.query('SELECT COUNT(*) FROM techniques');
    const goalsCount = await client.query('SELECT COUNT(*) FROM goals');
    const problemsCount = await client.query('SELECT COUNT(*) FROM problems');
    
    console.log('\n📊 Data verification:');
    console.log(`   ✓ Concepts: ${conceptsCount.rows[0].count}`);
    console.log(`   ✓ Techniques: ${techniquesCount.rows[0].count}`);
    console.log(`   ✓ Goals: ${goalsCount.rows[0].count}`);
    console.log(`   ✓ Problems: ${problemsCount.rows[0].count}`);
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n🚀 Ready for implementation:');
    console.log('   1. ✅ Database schema - COMPLETED');
    console.log('   2. 🔄 API endpoints - READY TO START');
    console.log('   3. 🔄 UI form components - READY TO START');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema application failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

applySchemaIncremental().catch(err => {
  console.error('Schema application failed:', err.message);
  process.exit(1);
});