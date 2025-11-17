const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Usage: node restoreDatabase.js <backup-file>');
  console.log('📁 Available backups:');
  const backupDir = path.join(__dirname, '../../backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    files.forEach(f => console.log(`   - ${f}`));
  }
  process.exit(1);
}

const fullPath = path.isAbsolute(backupFile) 
  ? backupFile 
  : path.join(__dirname, '../../backups', backupFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Backup file not found: ${fullPath}`);
  process.exit(1);
}

console.log('📦 Starting database restore...');
console.log(`📁 From: ${fullPath}`);

const command = `docker exec -i leetcode-postgres psql -U leetcodeuser leetcodepractice < "${fullPath}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
  
  if (stderr && !stderr.includes('NOTICE')) {
    console.error('⚠️ Restore warnings:', stderr);
  }
  
  console.log('✅ Database restored successfully!');
});
