# Automatic Daily Backup Script
# This script can be scheduled to run daily using Windows Task Scheduler
# Usage: .\scripts\backup-auto.ps1

$ErrorActionPreference = "Stop"

# Configuration
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_DIR = Split-Path -Parent $SCRIPT_DIR
$LOG_DIR = "$PROJECT_DIR\logs"
$LOG_FILE = "$LOG_DIR\backup_$(Get-Date -Format 'yyyyMMdd').log"

# Create log directory if not exists
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

# Function to log messages
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

Write-Log "=========================================="
Write-Log "Starting automatic backup process"
Write-Log "=========================================="

# Change to project directory
Set-Location $PROJECT_DIR
Write-Log "Working directory: $PROJECT_DIR"

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Log "✅ Docker is running"
} catch {
    Write-Log "❌ Docker is not running!"
    Write-Log "ERROR: Cannot perform backup without Docker"
    exit 1
}

# Run backup script
try {
    Write-Log "Executing backup script..."
    & "$SCRIPT_DIR\backup.ps1" 2>&1 | ForEach-Object { Write-Log $_ }
    Write-Log "✅ Backup completed successfully"
} catch {
    Write-Log "❌ Backup failed: $_"
    exit 1
}

Write-Log "=========================================="
Write-Log "Automatic backup process completed"
Write-Log "=========================================="
