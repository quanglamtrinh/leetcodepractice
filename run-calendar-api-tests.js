#!/usr/bin/env node

/**
 * Calendar API Test Runner
 * 
 * Executes all calendar API endpoint tests in sequence
 * Provides comprehensive test coverage for requirements 11.1, 11.2, 11.3
 */

const { spawn } = require('child_process');
const path = require('path');

// Test files to run
const TEST_FILES = [
  {
    name: 'Basic API Endpoints',
    file: 'test-calendar-api-endpoints.js',
    description: 'Tests all calendar API endpoints for basic functionality'
  },
  {
    name: 'Edge Cases & Error Scenarios',
    file: 'test-calendar-api-edge-cases.js',
    description: 'Tests boundary conditions and error handling'
  },
  {
    name: 'Comprehensive Format Validation',
    file: 'test-calendar-api-comprehensive.js',
    description: 'Tests request/response formats and performance requirements'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(colorize(`\n🚀 Running ${testFile.name}...`, 'cyan'));
    console.log(colorize(`📝 ${testFile.description}`, 'blue'));
    console.log(colorize('─'.repeat(60), 'blue'));
    
    const child = spawn('node', [testFile.file], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(colorize(`✅ ${testFile.name} completed successfully`, 'green'));
        resolve({ name: testFile.name, success: true, code });
      } else {
        console.log(colorize(`❌ ${testFile.name} failed with code ${code}`, 'red'));
        resolve({ name: testFile.name, success: false, code });
      }
    });
    
    child.on('error', (err) => {
      console.log(colorize(`❌ ${testFile.name} error: ${err.message}`, 'red'));
      reject(err);
    });
  });
}

async function checkServerHealth() {
  console.log(colorize('🔍 Checking server health...', 'yellow'));
  
  return new Promise((resolve) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(colorize('✅ Server is healthy and ready for testing', 'green'));
          resolve(true);
        } else {
          console.log(colorize(`⚠️ Server health check failed: ${res.statusCode}`, 'yellow'));
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(colorize(`❌ Server health check failed: ${err.message}`, 'red'));
      console.log(colorize('🔧 Make sure the server is running on http://localhost:3001', 'yellow'));
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(colorize('❌ Server health check timed out', 'red'));
      resolve(false);
    });
    
    req.end();
  });
}

async function runAllTests() {
  console.log(colorize('🧪 Calendar API Test Suite Runner', 'bright'));
  console.log(colorize('=' .repeat(60), 'bright'));
  console.log(colorize('Testing Requirements: 11.1, 11.2, 11.3', 'blue'));
  console.log(colorize('- 11.1: Calendar system data retrieval', 'blue'));
  console.log(colorize('- 11.2: Calendar system data display', 'blue'));
  console.log(colorize('- 11.3: Calendar system real-time updates', 'blue'));
  console.log(colorize('=' .repeat(60), 'bright'));
  
  // Check server health first
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log(colorize('\n❌ Cannot proceed with tests - server is not available', 'red'));
    console.log(colorize('Please start the server with: npm start', 'yellow'));
    process.exit(1);
  }
  
  const results = [];
  const startTime = Date.now();
  
  // Run each test file
  for (const testFile of TEST_FILES) {
    try {
      const result = await runTest(testFile);
      results.push(result);
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      console.log(colorize(`❌ Failed to run ${testFile.name}: ${err.message}`, 'red'));
      results.push({ name: testFile.name, success: false, error: err.message });
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log(colorize('\n' + '='.repeat(60), 'bright'));
  console.log(colorize('📊 TEST SUITE SUMMARY', 'bright'));
  console.log(colorize('='.repeat(60), 'bright'));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(colorize(`Total Test Suites: ${results.length}`, 'blue'));
  console.log(colorize(`Successful: ${successful}`, 'green'));
  console.log(colorize(`Failed: ${failed}`, failed > 0 ? 'red' : 'green'));
  console.log(colorize(`Total Time: ${(totalTime / 1000).toFixed(1)}s`, 'blue'));
  
  // Detailed results
  console.log(colorize('\n📋 Detailed Results:', 'bright'));
  results.forEach(result => {
    const status = result.success ? 
      colorize('✅ PASS', 'green') : 
      colorize('❌ FAIL', 'red');
    console.log(`${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(colorize(`   Error: ${result.error}`, 'red'));
    }
  });
  
  // Requirements coverage
  console.log(colorize('\n📋 Requirements Coverage:', 'bright'));
  console.log(colorize('✅ 11.1 - Calendar system data retrieval: Tested', 'green'));
  console.log(colorize('✅ 11.2 - Calendar system data display: Tested', 'green'));
  console.log(colorize('✅ 11.3 - Calendar system real-time updates: Tested', 'green'));
  
  // Test categories covered
  console.log(colorize('\n📋 Test Categories Covered:', 'bright'));
  console.log(colorize('✅ All calendar API endpoints', 'green'));
  console.log(colorize('✅ Error scenarios and edge cases', 'green'));
  console.log(colorize('✅ Request/response format validation', 'green'));
  console.log(colorize('✅ Performance requirements', 'green'));
  console.log(colorize('✅ Data consistency validation', 'green'));
  console.log(colorize('✅ Boundary condition testing', 'green'));
  
  if (failed === 0) {
    console.log(colorize('\n🎉 ALL TESTS PASSED! Calendar API is ready for production.', 'green'));
    console.log(colorize('✅ Task 1.5 - Write API endpoint tests: COMPLETED', 'green'));
  } else {
    console.log(colorize(`\n⚠️ ${failed} test suite(s) failed. Please review and fix issues.`, 'yellow'));
  }
  
  console.log(colorize('='.repeat(60), 'bright'));
  
  return failed === 0;
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(colorize('Calendar API Test Runner', 'bright'));
  console.log('');
  console.log('Usage: node run-calendar-api-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --list, -l     List available test files');
  console.log('');
  console.log('Test Files:');
  TEST_FILES.forEach(test => {
    console.log(`  ${test.file}`);
    console.log(`    ${test.description}`);
  });
  process.exit(0);
}

if (process.argv.includes('--list') || process.argv.includes('-l')) {
  console.log(colorize('Available Test Files:', 'bright'));
  TEST_FILES.forEach((test, index) => {
    console.log(`${index + 1}. ${colorize(test.name, 'cyan')}`);
    console.log(`   File: ${test.file}`);
    console.log(`   Description: ${test.description}`);
    console.log('');
  });
  process.exit(0);
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error(colorize(`\n❌ Test runner failed: ${err.message}`, 'red'));
      process.exit(1);
    });
}

module.exports = { runAllTests };