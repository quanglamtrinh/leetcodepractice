const pool = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * This script migrates existing data to the multi-user schema.
 * It creates a default user and associates all existing progress with that user.
 */

async function migrateExistingData() {
  console.log('Starting data migration for existing records...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Check if there's existing data to migrate
    const problemsResult = await client.query('SELECT COUNT(*) FROM problems');
    const problemCount = parseInt(problemsResult.rows[0].count);

    if (problemCount === 0) {
      console.log('No existing problems found. Skipping data migration.');
      await client.query('COMMIT');
      return;
    }

    console.log(`Found ${problemCount} problems in database.`);

    // Step 2: Create a default user account
    console.log('\nCreating default user account...');
    
    const defaultEmail = 'default@leetcode-practice.local';
    const defaultUsername = 'default_user';
    const defaultPassword = 'changeme123'; // User should change this
    
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const userResult = await client.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [defaultEmail, defaultUsername, passwordHash]
    );

    const defaultUserId = userResult.rows[0].id;
    console.log(`✓ Default user created with ID: ${defaultUserId}`);
    console.log(`  Email: ${defaultEmail}`);
    console.log(`  Password: ${defaultPassword}`);
    console.log(`  ⚠️  IMPORTANT: Change this password after logging in!`);

    // Step 3: Check if problems table still has solved/notes columns
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'problems' 
        AND column_name IN ('solved', 'notes')
    `);

    const hasOldColumns = columnsResult.rows.length > 0;

    if (hasOldColumns) {
      console.log('\n⚠️  Warning: problems table still has solved/notes columns.');
      console.log('This data needs to be migrated to user_progress table.');
      
      // Step 4: Migrate problem progress data
      console.log('\nMigrating problem progress to user_progress table...');
      
      const migrateResult = await client.query(`
        INSERT INTO user_progress (user_id, problem_id, solved, notes, created_at, updated_at)
        SELECT 
          $1 as user_id,
          id as problem_id,
          COALESCE(solved, false) as solved,
          notes,
          created_at,
          updated_at
        FROM problems
        WHERE solved = true OR notes IS NOT NULL
        ON CONFLICT (user_id, problem_id) DO NOTHING
      `, [defaultUserId]);

      console.log(`✓ Migrated ${migrateResult.rowCount} problem progress records`);
    } else {
      console.log('\n✓ Problems table already migrated (no solved/notes columns)');
    }

    // Step 5: Update review_history records
    console.log('\nUpdating review_history records...');
    
    const reviewHistoryResult = await client.query(
      `UPDATE review_history 
       SET user_id = $1 
       WHERE user_id IS NULL`,
      [defaultUserId]
    );

    console.log(`✓ Updated ${reviewHistoryResult.rowCount} review_history records`);

    // Step 6: Update review_attempts records
    console.log('\nUpdating review_attempts records...');
    
    const reviewAttemptsResult = await client.query(
      `UPDATE review_attempts 
       SET user_id = $1 
       WHERE user_id IS NULL`,
      [defaultUserId]
    );

    console.log(`✓ Updated ${reviewAttemptsResult.rowCount} review_attempts records`);

    // Step 7: Update mistakes records
    console.log('\nUpdating mistakes records...');
    
    const mistakesResult = await client.query(
      `UPDATE mistakes 
       SET user_id = $1 
       WHERE user_id IS NULL`,
      [defaultUserId]
    );

    console.log(`✓ Updated ${mistakesResult.rowCount} mistakes records`);

    // Commit the transaction
    await client.query('COMMIT');

    console.log('\n✅ Data migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Log in with the default user credentials');
    console.log('2. Change the default password immediately');
    console.log('3. Create additional user accounts as needed');
    console.log('4. Test that all data is accessible and isolated per user');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Data migration failed:', error.message);
    console.error('\nError details:', error);
    console.error('\nThe transaction has been rolled back.');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Check if bcrypt is installed
try {
  require.resolve('bcrypt');
} catch (e) {
  console.error('Error: bcrypt is not installed.');
  console.error('Please run: npm install bcrypt');
  process.exit(1);
}

// Run data migration
migrateExistingData();
