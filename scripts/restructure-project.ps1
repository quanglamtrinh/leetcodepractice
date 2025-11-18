# Project Restructure Script
# This script will reorganize the project structure

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Project Restructure..." -ForegroundColor Cyan
Write-Host ""

# Colors
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }

# Confirm with user
Write-Warning "This will restructure your entire project!"
Write-Warning "Make sure you have:"
Write-Host "  1. Committed all changes" -ForegroundColor Yellow
Write-Host "  2. Created a backup" -ForegroundColor Yellow
Write-Host "  3. Created a new branch" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Type 'YES' to continue"

if ($confirm -ne "YES") {
    Write-Info "Cancelled. No changes made."
    exit 0
}

Write-Info "Starting restructure..."
Write-Host ""

# Create new folder structure
Write-Info "Creating new folder structure..."

$folders = @(
    "backend/src/controllers",
    "backend/src/routes", 
    "backend/src/middleware",
    "backend/src/config",
    "backend/src/utils",
    "backend/scripts",
    "frontend/src",
    "database/schema",
    "database/migrations",
    "database/seeds",
    "data/csv",
    "data/reference",
    "scripts/deployment",
    "scripts/backup",
    "scripts/data-processing",
    "docs/deployment",
    "docs/database",
    "docs/guides",
    "docs/api",
    "docker/nginx",
    "archive/leetcode-problems",
    "archive/old-frontend"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    Write-Success "Created: $folder"
}

Write-Host ""
Write-Info "Moving files..."
Write-Host ""

# Move backend files
Write-Info "Moving backend files..."
if (Test-Path "server") {
    Move-Item "server/*" "backend/src/" -Force -ErrorAction SilentlyContinue
    Write-Success "Moved server files"
}

if (Test-Path "server.js") {
    Move-Item "server.js" "backend/src/" -Force
    Write-Success "Moved server.js"
}

# Move frontend files
Write-Info "Moving frontend files..."
if (Test-Path "client") {
    Move-Item "client/*" "frontend/" -Force -ErrorAction SilentlyContinue
    Write-Success "Moved client files"
}

# Move database files
Write-Info "Moving database files..."
if (Test-Path "comprehensive-schema.sql") {
    Move-Item "comprehensive-schema.sql" "database/schema/" -Force
    Write-Success "Moved schema file"
}

if (Test-Path "reference_data.sql") {
    Move-Item "reference_data.sql" "database/schema/" -Force
    Write-Success "Moved reference data"
}

# Move CSV files
Write-Info "Moving CSV files..."
Get-ChildItem -Filter "*.csv" | ForEach-Object {
    Move-Item $_.FullName "data/csv/" -Force
    Write-Success "Moved: $($_.Name)"
}

# Move Python scripts
Write-Info "Moving Python scripts..."
Get-ChildItem -Filter "*.py" | ForEach-Object {
    Move-Item $_.FullName "scripts/data-processing/" -Force
    Write-Success "Moved: $($_.Name)"
}

# Move deployment scripts
Write-Info "Moving deployment scripts..."
if (Test-Path "scripts/deploy-ec2.sh") {
    Move-Item "scripts/deploy-ec2.sh" "scripts/deployment/" -Force
    Write-Success "Moved deploy-ec2.sh"
}

if (Test-Path "scripts/deploy-ec2-amazon-linux.sh") {
    Move-Item "scripts/deploy-ec2-amazon-linux.sh" "scripts/deployment/" -Force
    Write-Success "Moved deploy-ec2-amazon-linux.sh"
}

# Move backup scripts
Write-Info "Moving backup scripts..."
if (Test-Path "scripts/backup.ps1") {
    Move-Item "scripts/backup.ps1" "scripts/backup/" -Force
    Write-Success "Moved backup.ps1"
}

if (Test-Path "scripts/restore.ps1") {
    Move-Item "scripts/restore.ps1" "scripts/backup/" -Force
    Write-Success "Moved restore.ps1"
}

# Move Docker files
Write-Info "Moving Docker files..."
if (Test-Path "docker-compose.yml") {
    Move-Item "docker-compose.yml" "docker/" -Force
    Write-Success "Moved docker-compose.yml"
}

if (Test-Path "Dockerfile") {
    Move-Item "Dockerfile" "docker/Dockerfile.backend" -Force
    Write-Success "Moved Dockerfile"
}

if (Test-Path "Dockerfile.dev") {
    Move-Item "Dockerfile.dev" "docker/Dockerfile.backend.dev" -Force
    Write-Success "Moved Dockerfile.dev"
}

# Move documentation
Write-Info "Moving documentation..."

# Deployment docs
$deploymentDocs = @("AWS_EC2_DEPLOYMENT.md", "AWS_EC2_AMAZON_LINUX.md", "DOCKER_SETUP_WINDOWS.md", "UBUNTU_VS_AMAZON_LINUX.md")
foreach ($doc in $deploymentDocs) {
    if (Test-Path "docs/$doc") {
        Move-Item "docs/$doc" "docs/deployment/" -Force
        Write-Success "Moved: $doc"
    }
}

# Database docs
$databaseDocs = @("DATABASE_INITIALIZATION_PROCESS.md", "HOW_SOLVED_PROBLEMS_ARE_SAVED.md", "DATABASE_PERSISTENCE.md")
foreach ($doc in $databaseDocs) {
    if (Test-Path "docs/$doc") {
        Move-Item "docs/$doc" "docs/database/" -Force
        Write-Success "Moved: $doc"
    }
}

# Guides
$guides = @("BACKUP_RESTORE_GUIDE.md", "AWS_S3_INTEGRATION.md")
foreach ($guide in $guides) {
    if (Test-Path "docs/$guide") {
        Move-Item "docs/$guide" "docs/guides/" -Force
        Write-Success "Moved: $guide"
    }
}

# Archive old files
Write-Info "Archiving old files..."

# Archive LeetCode problem folders
$problemFolders = Get-ChildItem -Directory | Where-Object { 
    $_.Name -match "Dynamic Programming|Arrays|Backtracking|Binary Search|Bit Manipulation|Graphs|Greedy|Heap|Intervals|Linked List|Math|Sliding Window|Stack|Trees|Tries|Two Pointers|Misc"
}

foreach ($folder in $problemFolders) {
    Move-Item $folder.FullName "archive/leetcode-problems/" -Force
    Write-Success "Archived: $($folder.Name)"
}

# Archive old frontend files
$oldFrontend = @("index.html", "script.js", "styles.css")
foreach ($file in $oldFrontend) {
    if (Test-Path $file) {
        Move-Item $file "archive/old-frontend/" -Force
        Write-Success "Archived: $file"
    }
}

# Move main.*.css files
Get-ChildItem -Filter "main.*.css" | ForEach-Object {
    Move-Item $_.FullName "archive/old-frontend/" -Force
    Write-Success "Archived: $($_.Name)"
}

Write-Host ""
Write-Success "Restructure completed!"
Write-Host ""

Write-Warning "Next steps:"
Write-Host "  1. Update docker-compose.yml paths" -ForegroundColor Yellow
Write-Host "  2. Update package.json scripts" -ForegroundColor Yellow
Write-Host "  3. Update .gitignore" -ForegroundColor Yellow
Write-Host "  4. Test backend: cd backend && npm install && npm run dev" -ForegroundColor Yellow
Write-Host "  5. Test frontend: cd frontend && npm install && npm start" -ForegroundColor Yellow
Write-Host "  6. Update documentation links" -ForegroundColor Yellow
Write-Host ""

Write-Info "Review RESTRUCTURE_PLAN.md for detailed next steps"
