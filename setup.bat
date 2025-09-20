@echo off
echo.
echo ========================================
echo LeetCode Practice - Database Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found
    echo Please create a .env file with your database credentials
    echo Example:
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=leetcode_practice
    echo DB_USER=postgres
    echo DB_PASSWORD=your_password
    pause
    exit /b 1
)

REM Check if required CSV files exist
if not exist "leetcode_divided_by_concepts.csv" (
    echo ERROR: leetcode_divided_by_concepts.csv not found
    pause
    exit /b 1
)

if not exist "all-leetcode-questions.csv" (
    echo ERROR: all-leetcode-questions.csv not found
    pause
    exit /b 1
)

if not exist "leetcode_with_concepts_and_links.csv" (
    echo ERROR: leetcode_with_concepts_and_links.csv not found
    pause
    exit /b 1
)

echo All requirements met! Starting setup...
echo.

REM Run the comprehensive setup
npm run setup

echo.
echo Setup completed! Press any key to exit...
pause >nul
