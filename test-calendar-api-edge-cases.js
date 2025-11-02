const http = require('http');

/**
 * Calendar API Edge Cases and Error Scenarios Tests
 * 
 * Focused tests for edge cases, boundary conditions, and error scenarios
 * Validates robust error handling and data validation
 * Requirements: 11.1, 11.2, 11.3
 */

// Test configuration
const TEST_CONFIG = {
  hostname: 'localhost',
  port: 3001,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Utility function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(TEST_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test result tracking
let edgeTestResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logEdgeTest(testName, passed, message = '') {
  edgeTestResults.total++;
  if (passed) {
    edgeTestResults.passed++;
    console.log(`   ✅ ${testName}`);
  } else {
    edgeTestResults.failed++;
    console.log(`   ❌ ${testName}: ${message}`);
  }
  edgeTestResults.details.push({ testName, passed, message });
}

async function testDateBoundaryConditions() {
  console.log('\n📅 Testing Date Boundary Conditions');
  
  // Test 1: Leap year date
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2024-02-29',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Leap year date (2024-02-29)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Leap year date (2024-02-29)', false, err.message);
  }

  // Test 2: Non-leap year February 29th
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2023-02-29',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Non-leap year Feb 29 (2023-02-29)', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Non-leap year Feb 29 (2023-02-29)', false, err.message);
  }

  // Test 3: Year boundaries
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/1999-12-31',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Year boundary (1999-12-31)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Year boundary (1999-12-31)', false, err.message);
  }

  // Test 4: Future date (year 2100)
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2100-01-01',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Future date (2100-01-01)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Future date (2100-01-01)', false, err.message);
  }

  // Test 5: Invalid month
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2025-00-15',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Invalid month (00)', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Invalid month (00)', false, err.message);
  }

  // Test 6: Invalid day
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2025-04-31',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Invalid day (April 31st)', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Invalid day (April 31st)', false, err.message);
  }
}

async function testLargeDataHandling() {
  console.log('\n📊 Testing Large Data Handling');
  
  // Test 1: Very long date range
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events?start_date=2020-01-01&end_date=2030-12-31',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Very long date range (10 years)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Very long date range (10 years)', false, err.message);
  }

  // Test 2: Large limit parameter
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?limit=10000&offset=0',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Large limit parameter (10000)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Large limit parameter (10000)', false, err.message);
  }

  // Test 3: Very large offset
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?limit=10&offset=999999',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Large offset parameter (999999)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Large offset parameter (999999)', false, err.message);
  }

  // Test 4: Very long title
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const longTitle = 'A'.repeat(1000); // 1000 character title
    const eventData = {
      event_type: 'task',
      title: longTitle,
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, eventData);
    logEdgeTest('Very long title (1000 chars)', response.statusCode === 201 || response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Very long title (1000 chars)', false, err.message);
  }

  // Test 5: Very long description
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const longDescription = 'B'.repeat(5000); // 5000 character description
    const eventData = {
      event_type: 'task',
      title: 'Test Task',
      description: longDescription,
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, eventData);
    logEdgeTest('Very long description (5000 chars)', response.statusCode === 201 || response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Very long description (5000 chars)', false, err.message);
  }
}

async function testSpecialCharacterHandling() {
  console.log('\n🔤 Testing Special Character Handling');
  
  // Test 1: Unicode characters in title
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const eventData = {
      event_type: 'task',
      title: '测试任务 🚀 émojis & spéciàl chars',
      description: 'Testing unicode: 中文, العربية, русский, 日本語',
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, eventData);
    logEdgeTest('Unicode characters in title', response.statusCode === 201, `Status: ${response.statusCode}`);
    
    if (response.statusCode === 201 && response.body.event) {
      global.unicodeEventId = response.body.event.id;
    }
  } catch (err) {
    logEdgeTest('Unicode characters in title', false, err.message);
  }

  // Test 2: SQL injection attempt in title
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const eventData = {
      event_type: 'task',
      title: "'; DROP TABLE calendar_events; --",
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, eventData);
    logEdgeTest('SQL injection in title', response.statusCode === 201, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('SQL injection in title', false, err.message);
  }

  // Test 3: HTML/XSS attempt in description
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const eventData = {
      event_type: 'task',
      title: 'XSS Test',
      description: '<script>alert("xss")</script><img src="x" onerror="alert(1)">',
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, eventData);
    logEdgeTest('HTML/XSS in description', response.statusCode === 201, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('HTML/XSS in description', false, err.message);
  }

  // Test 4: Null bytes in content
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const eventData = {
      event_type: 'note',
      title: 'Null Byte Test',
      note_content: 'Content with null byte: \x00 embedded',
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, eventData);
    logEdgeTest('Null bytes in content', response.statusCode === 201 || response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Null bytes in content', false, err.message);
  }
}

async function testNumericBoundaries() {
  console.log('\n🔢 Testing Numeric Boundaries');
  
  // Test 1: Negative problem ID
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      problem_id: -1,
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, sessionData);
    logEdgeTest('Negative problem ID', response.statusCode === 400 || response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Negative problem ID', false, err.message);
  }

  // Test 2: Zero problem ID
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      problem_id: 0,
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, sessionData);
    logEdgeTest('Zero problem ID', response.statusCode === 400 || response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Zero problem ID', false, err.message);
  }

  // Test 3: Very large problem ID
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      problem_id: 2147483647, // Max 32-bit integer
      event_date: '2025-10-25'
    };
    
    const response = await makeRequest(options, sessionData);
    logEdgeTest('Very large problem ID', response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Very large problem ID', false, err.message);
  }

  // Test 4: Negative time spent
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      problem_id: 1,
      event_date: '2025-10-25',
      time_spent_minutes: -30
    };
    
    const response = await makeRequest(options, sessionData);
    logEdgeTest('Negative time spent', response.statusCode === 400 || response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Negative time spent', false, err.message);
  }

  // Test 5: Extremely large time spent
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      problem_id: 1,
      event_date: '2025-10-25',
      time_spent_minutes: 999999
    };
    
    const response = await makeRequest(options, sessionData);
    logEdgeTest('Extremely large time spent', response.statusCode === 201 || response.statusCode === 400 || response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Extremely large time spent', false, err.message);
  }
}

async function testMalformedRequests() {
  console.log('\n🔧 Testing Malformed Requests');
  
  // Test 1: Invalid JSON
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        logEdgeTest('Invalid JSON request', res.statusCode === 400, `Status: ${res.statusCode}`);
      });
    });
    
    req.write('{ invalid json }');
    req.end();
  } catch (err) {
    logEdgeTest('Invalid JSON request', false, err.message);
  }

  // Test 2: Empty request body
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const response = await makeRequest(options, '');
    logEdgeTest('Empty request body', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Empty request body', false, err.message);
  }

  // Test 3: Wrong content type
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      }
    };
    
    const response = await makeRequest(options, 'plain text data');
    logEdgeTest('Wrong content type', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Wrong content type', false, err.message);
  }

  // Test 4: Missing content type
  try {
    const options = {
      hostname: TEST_CONFIG.hostname,
      port: TEST_CONFIG.port,
      path: '/api/calendar/events',
      method: 'POST'
      // No headers
    };
    
    const response = await makeRequest(options, JSON.stringify({
      event_type: 'task',
      title: 'Test',
      event_date: '2025-10-25'
    }));
    logEdgeTest('Missing content type', response.statusCode === 201 || response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Missing content type', false, err.message);
  }
}

async function testConcurrencyAndRaceConditions() {
  console.log('\n🏃 Testing Concurrency Scenarios');
  
  // Test 1: Simultaneous event creation
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      const options = {
        ...TEST_CONFIG,
        path: '/api/calendar/events',
        method: 'POST'
      };
      
      const eventData = {
        event_type: 'task',
        title: `Concurrent Task ${i}`,
        event_date: '2025-10-25'
      };
      
      promises.push(makeRequest(options, eventData));
    }
    
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.statusCode === 201).length;
    logEdgeTest('Simultaneous event creation', successCount === 5, `${successCount}/5 succeeded`);
  } catch (err) {
    logEdgeTest('Simultaneous event creation', false, err.message);
  }

  // Test 2: Rapid sequential requests
  try {
    let successCount = 0;
    for (let i = 0; i < 10; i++) {
      const options = {
        ...TEST_CONFIG,
        path: '/api/calendar/overdue-tasks',
        method: 'GET'
      };
      
      const response = await makeRequest(options);
      if (response.statusCode === 200) successCount++;
    }
    
    logEdgeTest('Rapid sequential requests', successCount === 10, `${successCount}/10 succeeded`);
  } catch (err) {
    logEdgeTest('Rapid sequential requests', false, err.message);
  }
}

async function testResourceLimits() {
  console.log('\n💾 Testing Resource Limits');
  
  // Test 1: Very large bulk operation
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/bulk',
      method: 'POST'
    };
    
    const largeEventIds = Array.from({ length: 1000 }, (_, i) => i + 1);
    const bulkData = {
      action: 'archive',
      event_ids: largeEventIds
    };
    
    const response = await makeRequest(options, bulkData);
    logEdgeTest('Large bulk operation (1000 IDs)', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Large bulk operation (1000 IDs)', false, err.message);
  }

  // Test 2: Multiple event types filter
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events?start_date=2025-01-01&end_date=2025-12-31&event_types=task,note,practice_session,reminder',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logEdgeTest('Multiple event types filter', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logEdgeTest('Multiple event types filter', false, err.message);
  }
}

// Cleanup function
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data');
  
  if (global.unicodeEventId) {
    try {
      const options = {
        ...TEST_CONFIG,
        path: `/api/calendar/events/${global.unicodeEventId}`,
        method: 'DELETE'
      };
      
      await makeRequest(options);
      console.log('   ✅ Cleaned up unicode test event');
    } catch (err) {
      console.log('   ⚠️ Failed to cleanup unicode test event:', err.message);
    }
  }
}

// Main test runner for edge cases
async function runEdgeCaseTests() {
  console.log('🧪 Calendar API Edge Cases and Error Scenarios Tests');
  console.log('=====================================================');
  console.log('Testing boundary conditions, error handling, and edge cases');
  console.log('=====================================================\n');

  try {
    // Run all edge case test suites
    await testDateBoundaryConditions();
    await testLargeDataHandling();
    await testSpecialCharacterHandling();
    await testNumericBoundaries();
    await testMalformedRequests();
    await testConcurrencyAndRaceConditions();
    await testResourceLimits();
    
    // Cleanup
    await cleanupTestData();

    // Print summary
    console.log('\n=====================================================');
    console.log('📊 Edge Case Test Results Summary');
    console.log('=====================================================');
    console.log(`Total Tests: ${edgeTestResults.total}`);
    console.log(`Passed: ${edgeTestResults.passed} ✅`);
    console.log(`Failed: ${edgeTestResults.failed} ❌`);
    console.log(`Success Rate: ${((edgeTestResults.passed / edgeTestResults.total) * 100).toFixed(1)}%`);
    
    if (edgeTestResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      edgeTestResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.testName}: ${test.message}`));
    }

    console.log('\n=====================================================');
    console.log('✅ Calendar API edge case testing completed!');
    console.log('=====================================================');

    return edgeTestResults.failed === 0;

  } catch (err) {
    console.error('❌ Edge case test runner error:', err.message);
    console.log('\n🔧 Make sure the server is running on http://localhost:3001');
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runEdgeCaseTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n❌ Edge case tests failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runEdgeCaseTests, edgeTestResults };