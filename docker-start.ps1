# Docker Quick Start Script for LeetCode Practice App
# Run this after installing Docker Desktop

Write-Host "🐳 LeetCode Practice App - Docker Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "2. Install and restart your computer" -ForegroundColor White
    Write-Host "3. Start Docker Desktop" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "See docs/DOCKER_SETUP_WINDOWS.md for detailed instructions" -ForegroundColor Cyan
    exit 1
}

# Check if Docker Compose is available
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if .env file exists
if (Test-Path .env) {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, creating from defaults..." -ForegroundColor Yellow
    @"
DB_HOST=postgres
DB_PORT=5432
DB_NAME=leetcode_practice
DB_USER=leetcodeuser
DB_PASSWORD=changeme
PORT=3001
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
Write-Host ""

# Start Docker Compose
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Success! Containers are starting..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Container Status:" -ForegroundColor Cyan
    docker-compose ps
    Write-Host ""
    Write-Host "🌐 Your app will be available at:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Useful commands:" -ForegroundColor Cyan
    Write-Host "   View logs:        docker-compose logs -f" -ForegroundColor White
    Write-Host "   Stop containers:  docker-compose down" -ForegroundColor White
    Write-Host "   Restart:          docker-compose restart" -ForegroundColor White
    Write-Host "   Rebuild:          docker-compose up -d --build" -ForegroundColor White
    Write-Host ""
    Write-Host "⏳ Waiting for services to be ready (this may take 30-60 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "Testing health endpoint..." -ForegroundColor Yellow
    $maxAttempts = 12
    $attempt = 0
    $success = $false
    
    while ($attempt -lt $maxAttempts -and -not $success) {
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ App is healthy and ready!" -ForegroundColor Green
                $success = $true
            }
        } catch {
            Write-Host "⏳ Attempt $attempt/$maxAttempts - Still starting..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
    
    if (-not $success) {
        Write-Host ""
        Write-Host "⚠️  App is taking longer than expected to start" -ForegroundColor Yellow
        Write-Host "   Check logs with: docker-compose logs -f app" -ForegroundColor White
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Cyan
    Write-Host "1. Docker Desktop not running - Start it from Start menu" -ForegroundColor White
    Write-Host "2. Port 3001 or 5432 already in use - Stop other services" -ForegroundColor White
    Write-Host "3. Insufficient resources - Check Docker Desktop settings" -ForegroundColor White
    exit 1
}
