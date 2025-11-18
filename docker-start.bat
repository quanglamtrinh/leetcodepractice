@echo off
REM Docker Quick Start Script for LeetCode Practice App
REM Run this after installing Docker Desktop

echo.
echo ====================================
echo   LeetCode Practice App - Docker
echo ====================================
echo.

REM Check if Docker is installed
echo Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not running!
    echo.
    echo Please install Docker Desktop:
    echo 1. Download from: https://www.docker.com/products/docker-desktop/
    echo 2. Install and restart your computer
    echo 3. Start Docker Desktop
    echo 4. Run this script again
    echo.
    echo See docs\DOCKER_SETUP_WINDOWS.md for detailed instructions
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose not found!
    pause
    exit /b 1
)
echo [OK] Docker Compose is available

echo.
echo Starting Docker containers...
echo.

REM Start Docker Compose
docker-compose up -d

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo [SUCCESS] Containers are starting!
    echo ====================================
    echo.
    echo Your app will be available at:
    echo   http://localhost:3001
    echo.
    echo Useful commands:
    echo   View logs:       docker-compose logs -f
    echo   Stop:            docker-compose down
    echo   Restart:         docker-compose restart
    echo   Rebuild:         docker-compose up -d --build
    echo.
    echo Waiting for services to start...
    timeout /t 10 /nobreak >nul
    echo.
    echo Check status with: docker-compose ps
    echo.
) else (
    echo.
    echo [ERROR] Failed to start containers
    echo Check the error messages above
    echo.
    pause
    exit /b 1
)

pause
