# Database Restore Script for Windows PowerShell
# Usage: .\scripts\restore.ps1 [backup_file]
# Example: .\scripts\restore.ps1 backups/backup_20251116_185953.sql

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# Configuration
$CONTAINER_NAME = "leetcode-postgres"
$DB_USER = "leetcodeuser"
$DB_NAME = "leetcodepractice"
$BACKUP_DIR = "backups"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

Write-Info "🔄 Database Restore Tool"
Write-Info "========================`n"

# Check if container is running
$containerStatus = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}"
if (-not $containerStatus) {
    Write-Error "❌ Container $CONTAINER_NAME is not running!"
    Write-Info "💡 Start it with: docker-compose up -d"
    exit 1
}

Write-Success "✅ Container is running: $containerStatus`n"

# If no backup file specified, show list and prompt
if (-not $BackupFile) {
    Write-Info "📁 Available backups:"
    $backups = Get-ChildItem $BACKUP_DIR -Filter "backup_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Error "❌ No backup files found in $BACKUP_DIR"
        exit 1
    }
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $file = $backups[$i]
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "   [$($i+1)] $($file.Name) - $sizeMB MB - $($file.LastWriteTime)"
    }
    
    Write-Host "`n"
    $selection = Read-Host "Select backup number (1-$($backups.Count)) or press Enter to cancel"
    
    if ([string]::IsNullOrWhiteSpace($selection)) {
        Write-Info "Cancelled."
        exit 0
    }
    
    $index = [int]$selection - 1
    if ($index -lt 0 -or $index -ge $backups.Count) {
        Write-Error "❌ Invalid selection!"
        exit 1
    }
    
    $BackupFile = $backups[$index].FullName
}

# Validate backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Error "❌ Backup file not found: $BackupFile"
    exit 1
}

$fileInfo = Get-Item $BackupFile
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)

Write-Warning "`n⚠️  WARNING: This will REPLACE all current database data!"
Write-Info "📄 Backup file: $($fileInfo.Name)"
Write-Info "📏 Size: $fileSizeMB MB"
Write-Info "📅 Created: $($fileInfo.LastWriteTime)"

# Get current database stats
Write-Info "`n📊 Current Database:"
$currentStats = docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) as total, COUNT(CASE WHEN solved = true THEN 1 END) as solved FROM problems;" 2>$null
if ($currentStats) {
    $stats = $currentStats.Trim() -split '\|'
    $total = $stats[0].Trim()
    $solved = $stats[1].Trim()
    Write-Info "   Total Problems: $total"
    Write-Info "   Solved Problems: $solved"
}

Write-Host "`n"
$confirm = Read-Host "Type 'YES' to confirm restore"

if ($confirm -ne "YES") {
    Write-Info "Cancelled."
    exit 0
}

Write-Info "`n🔄 Starting restore process..."

# Restore database
Write-Info "💾 Restoring from: $BackupFile"
Get-Content $BackupFile | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME

if ($LASTEXITCODE -eq 0) {
    Write-Success "`n✅ Restore completed successfully!"
    
    # Get restored database stats
    Write-Info "`n📈 Restored Database Statistics:"
    $restoredStats = docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) as total, COUNT(CASE WHEN solved = true THEN 1 END) as solved FROM problems;"
    $stats = $restoredStats.Trim() -split '\|'
    $total = $stats[0].Trim()
    $solved = $stats[1].Trim()
    Write-Info "   Total Problems: $total"
    Write-Info "   Solved Problems: $solved"
    
    Write-Success "`n🎉 Database restored successfully!"
    Write-Info "💡 Refresh your browser to see the changes"
} else {
    Write-Error "`n❌ Restore failed!"
    exit 1
}
