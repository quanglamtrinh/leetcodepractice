const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Usage: node restoreFromLocal.js <path-to-backup-file>');
  console.log('📝 Example: node restoreFromLocal.js "D:\\leetcode-backup.sql"');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ Backup file not found: ${backupFile}`);
  process.exit(1);
}

console.log('📦 Starting database restore from local file...');
console.log(`📁 From: ${backupFile}`);
console.log('⚠️  This will overwrite existing data in Docker container!');

// Copy file to container and restore
const containerPath = '/tmp/restore.sql';
const copyCommand = `docker cp "${backupFile}" leetcode-postgres:${containerPath}`;
const restoreCommand = `docker exec leetcode-postgres psql -U leetcodeuser -d leetcodepractice -f ${containerPath}`;

console.log('📋 Step 1: Copying backup file to container...');
exec(copyCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Copy failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ File copied to container');
  console.log('📋 Step 2: Restoring database...');
  
  exec(restoreCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Restore failed:', error.message);
      console.error('Details:', stderr);
      process.exit(1);
    }
    
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('SET')) {
      console.warn('⚠️  Warnings:', stderr);
    }
    
    console.log('✅ Database restored successfully!');
    console.log('🧹 Cleaning up temporary file...');
    
    exec(`docker exec leetcode-postgres rm ${containerPath}`, () => {
      console.log('✅ Done!');
    });
  });
});
