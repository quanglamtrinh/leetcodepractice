const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// Run Python scripts to prepare data
async function prepareData() {
  try {
    console.log('🐍 Preparing data with Python scripts...');
    
    // Check if Python is available
    try {
      execSync('python --version', { stdio: 'pipe' });
    } catch (err) {
      console.error('❌ Python not found. Please install Python to prepare data.');
      return false;
    }
    
    // Run the comprehensive database setup script
    console.log('📊 Merging CSV data...');
    execSync('python merge_comprehensive_csvs.py', { stdio: 'inherit' });
    
    console.log('🔧 Generating reference data...');
    execSync('python generate_reference_data.py', { stdio: 'inherit' });
    
    console.log('✅ Data preparation completed');
    return true;
  } catch (err) {
    console.error('❌ Error preparing data:', err.message);
    return false;
  }
}

// Create comprehensive schema
async function createComprehensiveSchema() {
  try {
    console.log('🏗️  Creating comprehensive database schema...');
    
    const schemaPath = path.join(__dirname, 'comprehensive-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('comprehensive-schema.sql file not found');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one statement to avoid parsing issues
    await pool.query(schema);
    console.log('✅ Comprehensive schema created successfully');
    return true;
  } catch (err) {
    console.error('❌ Error creating comprehensive schema:', err.message);
    return false;
  }
}

// Load reference data
async function loadReferenceData() {
  try {
    console.log('📚 Loading reference data...');
    
    const referenceDataPath = path.join(__dirname, 'reference_data.sql');
    if (!fs.existsSync(referenceDataPath)) {
      console.log('⚠️  reference_data.sql not found. Skipping reference data loading.');
      return true;
    }
    
    const referenceData = fs.readFileSync(referenceDataPath, 'utf8');
    
    // Execute the entire reference data as one statement
    try {
      await pool.query(referenceData);
      console.log('✅ Reference data loaded successfully');
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
        console.error('❌ Error loading reference data:', err.message);
        return false;
      }
      console.log('✅ Reference data loaded successfully (some conflicts ignored)');
    }
    return true;
  } catch (err) {
    console.error('❌ Error loading reference data:', err.message);
    return false;
  }
}

// Import problems from comprehensive CSV
async function importComprehensiveProblems() {
  try {
    const csvPath = path.join(__dirname, 'leetcode_comprehensive.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️  leetcode_comprehensive.csv not found. Skipping problem import.');
      console.log('Expected file: leetcode_comprehensive.csv');
      return true;
    }
    
    console.log('📥 Importing problems from comprehensive CSV...');
    
    // Use csv-parser if available, otherwise use simple parsing
    let problems = [];
    
    try {
      const csv = require('csv-parser');
      problems = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            results.push({
              problem_id: parseInt(row.problem_id) || null,
              title: row.title || '',
              concept: row.concept || '',
              difficulty: row.difficulty || 'easy',
              acceptance_rate: parseFloat(row.acceptance_rate) || null,
              popularity: parseInt(row.popularity) || null,
              leetcode_link: row.leetcode_link || ''
            });
          })
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } catch (err) {
      console.log('⚠️  csv-parser not available, using simple CSV parsing...');
      // Simple CSV parsing as fallback
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          problems.push({
            problem_id: parseInt(row.problem_id) || null,
            title: row.title || '',
            concept: row.concept || '',
            difficulty: row.difficulty || 'easy',
            acceptance_rate: parseFloat(row.acceptance_rate) || null,
            popularity: parseInt(row.popularity) || null,
            leetcode_link: row.leetcode_link || ''
          });
        }
      }
    }
    
    if (problems.length === 0) {
      console.log('❌ No problems found in CSV file');
      return false;
    }
    
    console.log(`📊 Found ${problems.length} problems to import`);
    
    // Clear existing problems and insert fresh data
    console.log('🗑️  Clearing existing problems...');
    await pool.query('DELETE FROM problems');
    
    // Insert problems in batches
    const batchSize = 100;
    for (let i = 0; i < problems.length; i += batchSize) {
      const batch = problems.slice(i, i + batchSize);
      
      for (const problem of batch) {
        try {
          await pool.query(`
            INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            problem.problem_id,
            problem.title,
            problem.concept,
            problem.difficulty,
            problem.acceptance_rate,
            problem.popularity,
            problem.leetcode_link
          ]);
        } catch (err) {
          console.error(`❌ Error importing problem "${problem.title}":`, err.message);
        }
      }
      
      const progress = Math.min(((i + batchSize) / problems.length) * 100, 100);
      process.stdout.write(`\r📥 Import progress: ${Math.round(progress)}%`);
    }
    
    console.log(`\n✅ Successfully imported ${problems.length} problems`);
    return true;
    
  } catch (err) {
    console.error('❌ Error importing problems:', err.message);
    return false;
  }
}

// Verify database setup
async function verifySetup() {
  try {
    console.log('🔍 Verifying database setup...');
    
    // Check tables exist
    const tables = [
      'problems', 'concepts', 'techniques', 'goals', 
      'template_basics', 'patterns', 'variants', 
      'review_history', 'review_attempts', 'mistakes'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        console.error(`❌ Table '${table}' not found`);
        return false;
      }
    }
    
    // Check data counts
    const problemCount = await pool.query('SELECT COUNT(*) as count FROM problems');
    const conceptCount = await pool.query('SELECT COUNT(*) as count FROM concepts');
    const techniqueCount = await pool.query('SELECT COUNT(*) as count FROM techniques');
    
    console.log('✅ Database verification completed');
    console.log(`📊 Problems: ${problemCount.rows[0].count}`);
    console.log(`📊 Concepts: ${conceptCount.rows[0].count}`);
    console.log(`📊 Techniques: ${techniqueCount.rows[0].count}`);
    
    return true;
  } catch (err) {
    console.error('❌ Error verifying setup:', err.message);
    return false;
  }
}

// Main setup function
async function setupComprehensiveDatabase() {
  console.log('🚀 Starting comprehensive database setup...\n');
  
  try {
    // Test connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('Database connection failed');
    }
    
    // Prepare data with Python scripts
    const dataPrepared = await prepareData();
    if (!dataPrepared) {
      throw new Error('Data preparation failed');
    }
    
    // Create comprehensive schema
    const schemaOk = await createComprehensiveSchema();
    if (!schemaOk) {
      throw new Error('Schema creation failed');
    }
    
    // Load reference data
    const referenceDataOk = await loadReferenceData();
    if (!referenceDataOk) {
      throw new Error('Reference data loading failed');
    }
    
    // Import problems
    const importOk = await importComprehensiveProblems();
    if (!importOk) {
      throw new Error('Problem import failed');
    }
    
    // Verify setup
    const verifyOk = await verifySetup();
    if (!verifyOk) {
      throw new Error('Database verification failed');
    }
    
    console.log('\n🎉 Comprehensive database setup completed successfully!');
    console.log('\n📝 Database Features:');
    console.log('✅ Enhanced problems table with LeetCode IDs');
    console.log('✅ Reference tables (concepts, techniques, goals)');
    console.log('✅ Pattern and variant system');
    console.log('✅ Advanced review tracking');
    console.log('✅ Mistake categorization');
    console.log('✅ Spaced repetition system');
    
    console.log('\n📝 Next steps:');
    console.log('1. Update your server.js to use the new schema');
    console.log('2. Start the server: npm run dev');
    console.log('3. Open http://localhost:3001 in your browser');
    console.log('4. Your comprehensive LeetCode practice system is ready!');
    
  } catch (err) {
    console.error('\n❌ Comprehensive database setup failed:', err.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check PostgreSQL is running');
    console.log('2. Verify .env file configuration');
    console.log('3. Ensure Python is installed for data preparation');
    console.log('4. Check that all required CSV files exist');
    throw err;
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupComprehensiveDatabase()
    .then(() => {
      console.log('\n✅ Comprehensive setup completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Setup failed:', err.message);
      process.exit(1);
    });
}

module.exports = { setupComprehensiveDatabase, testConnection };