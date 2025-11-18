# Sync Local Data to EC2
# Usage: .\scripts\sync-data-to-ec2.ps1

param(
    [string]$KeyPath = "C:\users\admin\keys\leetcodepractice.pem",
    [string]$EC2Host = "ec2-user@3.131.128.224",
    [switch]$UseCSV = $false
)

Write-Host "🚀 Syncing local data to EC2..." -ForegroundColor Cyan

if ($UseCSV) {
    # Method 1: Upload CSV and import
    Write-Host "📦 Using CSV import method..." -ForegroundColor Yellow
    
    $csvPath = "data\csv\leetcode_comprehensive.csv"
    if (-not (Test-Path $csvPath)) {
        Write-Host "❌ CSV file not found: $csvPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📤 Uploading CSV to EC2..." -ForegroundColor Yellow
    scp -i $KeyPath $csvPath "${EC2Host}:~/leetcodepractice/leetcode_comprehensive.csv"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Upload failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔄 Copying CSV into container..." -ForegroundColor Yellow
    $copyCommand = "docker cp ~/leetcodepractice/leetcode_comprehensive.csv leetcode-backend-prod:/app/leetcode_comprehensive.csv"
    ssh -i $KeyPath $EC2Host $copyCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Copy to container failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔄 Running import script on EC2..." -ForegroundColor Yellow
    $importCommand = "docker exec leetcode-backend-prod node scripts/importProblems.js"
    ssh -i $KeyPath $EC2Host $importCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Import failed" -ForegroundColor Red
        exit 1
    }
    
} else {
    # Method 2: Backup and restore
    Write-Host "📦 Using backup/restore method..." -ForegroundColor Yellow
    
    Write-Host "  Creating local backup..." -ForegroundColor Gray
    .\scripts\backup.ps1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backup failed" -ForegroundColor Red
        exit 1
    }
    
    $latestBackup = Get-ChildItem -Path "backups\leetcode_backup_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $latestBackup) {
        Write-Host "❌ No backup file found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  Using backup: $($latestBackup.Name)" -ForegroundColor Gray
    
    Write-Host "📤 Uploading backup to EC2..." -ForegroundColor Yellow
    ssh -i $KeyPath $EC2Host "mkdir -p ~/leetcodepractice/server/backups"
    scp -i $KeyPath $latestBackup.FullName "${EC2Host}:~/leetcodepractice/server/backups/"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Upload failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔄 Restoring database on EC2..." -ForegroundColor Yellow
    $restoreCommand = @"
cd ~/leetcodepractice/server && \
docker exec -i leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice < backups/$($latestBackup.Name)
"@
    
    ssh -i $KeyPath $EC2Host $restoreCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Restore failed" -ForegroundColor Red
        exit 1
    }
}

# Verify
Write-Host "✅ Verifying data..." -ForegroundColor Yellow
$verifyCommand = @"
docker exec leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice -c 'SELECT COUNT(*) FROM problems;'
"@

Write-Host ""
ssh -i $KeyPath $EC2Host $verifyCommand

Write-Host ""
Write-Host "✅ Data sync completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Test API:" -ForegroundColor Cyan
Write-Host "  curl http://3.131.128.224:3001/api/problems" -ForegroundColor White
