# Database Backup Script for Windows PowerShell
# Usage: .\scripts\backup.ps1

$ErrorActionPreference = "Stop"

# Configuration
$CONTAINER_NAME = "leetcode-postgres"
$DB_USER = "leetcodeuser"
$DB_NAME = "leetcodepractice"
$BACKUP_DIR = "backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "🔄 Starting database backup..."

# Check if container is running
$containerStatus = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}"
if (-not $containerStatus) {
    Write-Error "❌ Container $CONTAINER_NAME is not running!"
    exit 1
}

Write-Success "✅ Container is running: $containerStatus"

# Create backup directory if not exists
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Info "📁 Created backup directory: $BACKUP_DIR"
}

# Perform backup
Write-Info "💾 Creating backup: $BACKUP_FILE"
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $BACKUP_FILE).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Success "✅ Backup completed successfully!"
    Write-Info "📊 File: $BACKUP_FILE"
    Write-Info "📏 Size: $fileSizeMB MB"
    
    # Get database stats
    Write-Info "`n📈 Database Statistics:"
    $stats = docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) as total, COUNT(CASE WHEN solved = true THEN 1 END) as solved FROM problems;"
    $stats = $stats.Trim() -split '\|'
    $total = $stats[0].Trim()
    $solved = $stats[1].Trim()
    Write-Info "   Total Problems: $total"
    Write-Info "   Solved Problems: $solved"
    
    # Keep only last 10 backups
    Write-Info "`n🧹 Cleaning old backups (keeping last 10)..."
    $backups = Get-ChildItem $BACKUP_DIR -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending
    if ($backups.Count -gt 10) {
        $toDelete = $backups | Select-Object -Skip 10
        foreach ($file in $toDelete) {
            Remove-Item $file.FullName -Force
            Write-Info "   Deleted: $($file.Name)"
        }
    }
    
    Write-Success "`n🎉 Backup process completed!"
} else {
    Write-Error "❌ Backup failed!"
    exit 1
}
