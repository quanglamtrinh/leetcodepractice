const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupDir = path.join(__dirname, '../../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `leetcode-backup-${timestamp}.sql`);

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('📦 Starting database backup...');

const command = `docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
  
  if (stderr) {
    console.error('⚠️ Backup warnings:', stderr);
  }
  
  console.log(`✅ Backup completed: ${backupFile}`);
  console.log(`📊 File size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
});
