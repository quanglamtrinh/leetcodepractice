# Import Data to EC2 Database
# Usage: .\scripts\import-data-ec2.ps1

param(
    [string]$KeyPath = "C:\users\admin\keys\leetcodepractice.pem",
    [string]$EC2Host = "ec2-user@3.131.128.224"
)

Write-Host "🚀 Importing data to EC2 database..." -ForegroundColor Cyan

# Step 1: Upload updated import script
Write-Host "📤 Uploading import script..." -ForegroundColor Yellow
scp -i $KeyPath "server\scripts\importProblems.js" "${EC2Host}:~/leetcodepractice/server/scripts/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    exit 1
}

# Step 2: Upload CSV file
Write-Host "📤 Uploading CSV file..." -ForegroundColor Yellow
scp -i $KeyPath "data\csv\leetcode_comprehensive.csv" "${EC2Host}:~/leetcodepractice/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CSV upload failed" -ForegroundColor Red
    exit 1
}

# Step 3: Copy CSV into container
Write-Host "📋 Copying CSV into container..." -ForegroundColor Yellow
ssh -i $KeyPath $EC2Host "docker cp ~/leetcodepractice/leetcode_comprehensive.csv leetcode-backend-prod:/app/leetcode_comprehensive.csv"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Copy to container failed" -ForegroundColor Red
    exit 1
}

# Step 4: Copy import script into container
Write-Host "📋 Copying import script into container..." -ForegroundColor Yellow
ssh -i $KeyPath $EC2Host "docker cp ~/leetcodepractice/server/scripts/importProblems.js leetcode-backend-prod:/app/scripts/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Script copy failed" -ForegroundColor Red
    exit 1
}

# Step 5: Run import
Write-Host "🔄 Running import script..." -ForegroundColor Yellow
Write-Host ""
ssh -i $KeyPath $EC2Host "docker exec leetcode-backend-prod node scripts/importProblems.js"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Import failed" -ForegroundColor Red
    exit 1
}

# Step 6: Verify
Write-Host ""
Write-Host "✅ Verifying data..." -ForegroundColor Yellow
ssh -i $KeyPath $EC2Host "docker exec leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice -c 'SELECT COUNT(*) FROM problems;'"

Write-Host ""
Write-Host "✅ Data import completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Test API:" -ForegroundColor Cyan
Write-Host "  http://3.131.128.224:3001/api/problems" -ForegroundColor White
