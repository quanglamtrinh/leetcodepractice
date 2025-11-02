const http = require('http');

/**
 * Calendar API Endpoint Tests
 * 
 * Comprehensive unit tests for all calendar API endpoints
 * Tests cover success scenarios, error handling, and edge cases
 * Validates request/response formats according to requirements 11.1, 11.2, 11.3
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

// Test data
const TEST_DATA = {
  validTask: {
    event_type: 'task',
    title: 'Unit Test Task',
    description: 'Testing calendar API endpoints',
    event_date: '2025-10-25',
    due_date: '2025-10-27',
    priority: 'high',
    task_status: 'pending'
  },
  validNote: {
    event_type: 'note',
    title: 'Unit Test Note',
    note_content: 'This is a test note for API validation',
    event_date: '2025-10-25',
    is_pinned: true
  },
  validPracticeSession: {
    event_type: 'practice_session',
    title: 'Practice Session Test',
    event_date: '2025-10-25',
    problem_id: 1, // Assuming problem ID 1 exists
    time_spent_minutes: 30,
    was_successful: true
  },
  dateRange: {
    start_date: '2025-10-01',
    end_date: '2025-10-31'
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
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`   ✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`   ❌ ${testName}: ${message}`);
  }
  testResults.details.push({ testName, passed, message });
}

// Test suites
async function testCalendarEventsEndpoint() {
  console.log('\n📅 Testing GET /api/calendar/events');
  
  // Test 1: Valid date range
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/events?start_date=${TEST_DATA.dateRange.start_date}&end_date=${TEST_DATA.dateRange.end_date}`,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Valid date range request', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Response is array', Array.isArray(response.body), 'Expected array response');
  } catch (err) {
    logTest('Valid date range request', false, err.message);
  }

  // Test 2: Missing parameters
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Missing parameters error', response.statusCode === 400, `Status: ${response.statusCode}`);
    logTest('Error message present', response.body.error && response.body.error.includes('required'), 'Missing error message');
  } catch (err) {
    logTest('Missing parameters error', false, err.message);
  }

  // Test 3: Event type filtering
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/events?start_date=${TEST_DATA.dateRange.start_date}&end_date=${TEST_DATA.dateRange.end_date}&event_types=task,note`,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Event type filtering', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Event type filtering', false, err.message);
  }

  // Test 4: Include archived parameter
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/events?start_date=${TEST_DATA.dateRange.start_date}&end_date=${TEST_DATA.dateRange.end_date}&include_archived=true`,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Include archived parameter', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Include archived parameter', false, err.message);
  }
}

async function testCalendarDayEndpoint() {
  console.log('\n📅 Testing GET /api/calendar/day/:date');
  
  // Test 1: Valid date
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2025-10-25',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Valid date request', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Response is array', Array.isArray(response.body), 'Expected array response');
  } catch (err) {
    logTest('Valid date request', false, err.message);
  }

  // Test 2: Invalid date format
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/invalid-date',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Invalid date format error', response.statusCode === 400, `Status: ${response.statusCode}`);
    logTest('Date format error message', response.body.error && response.body.error.includes('format'), 'Missing format error message');
  } catch (err) {
    logTest('Invalid date format error', false, err.message);
  }

  // Test 3: Invalid date values
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2025-13-45',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Invalid date values', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Invalid date values', false, err.message);
  }
}

async function testCalendarStatsEndpoint() {
  console.log('\n📊 Testing GET /api/calendar/stats');
  
  // Test 1: Valid date range
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/stats?start_date=${TEST_DATA.dateRange.start_date}&end_date=${TEST_DATA.dateRange.end_date}`,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Valid stats request', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Stats object structure', typeof response.body === 'object' && !Array.isArray(response.body), 'Expected object response');
  } catch (err) {
    logTest('Valid stats request', false, err.message);
  }

  // Test 2: Missing parameters
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/stats',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Missing stats parameters error', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Missing stats parameters error', false, err.message);
  }
}

async function testCalendarTaskEndpoints() {
  console.log('\n📋 Testing task-related endpoints');
  
  // Test overdue tasks
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/overdue-tasks',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Overdue tasks endpoint', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Overdue tasks array', Array.isArray(response.body), 'Expected array response');
  } catch (err) {
    logTest('Overdue tasks endpoint', false, err.message);
  }

  // Test upcoming tasks
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/upcoming-tasks',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Upcoming tasks endpoint', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Upcoming tasks array', Array.isArray(response.body), 'Expected array response');
  } catch (err) {
    logTest('Upcoming tasks endpoint', false, err.message);
  }
}

async function testPracticeEndpoints() {
  console.log('\n🏃 Testing practice-related endpoints');
  
  // Test practice history
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-history?limit=10',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Practice history endpoint', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Practice history array', Array.isArray(response.body), 'Expected array response');
  } catch (err) {
    logTest('Practice history endpoint', false, err.message);
  }

  // Test practice stats
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/practice-stats?start_date=${TEST_DATA.dateRange.start_date}&end_date=${TEST_DATA.dateRange.end_date}`,
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Practice stats endpoint', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Practice stats structure', response.body.overall_stats && response.body.time_breakdown, 'Missing expected stats structure');
  } catch (err) {
    logTest('Practice stats endpoint', false, err.message);
  }
}

async function testMonthlyOverviewEndpoint() {
  console.log('\n📅 Testing GET /api/calendar/monthly-overview');
  
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/monthly-overview?months=6',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Monthly overview endpoint', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Monthly overview array', Array.isArray(response.body), 'Expected array response');
  } catch (err) {
    logTest('Monthly overview endpoint', false, err.message);
  }
}

async function testCreateEventEndpoint() {
  console.log('\n➕ Testing POST /api/calendar/events');
  
  // Test 1: Create valid task
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const response = await makeRequest(options, TEST_DATA.validTask);
    logTest('Create valid task', response.statusCode === 201, `Status: ${response.statusCode}`);
    logTest('Task creation response', response.body.event && response.body.event.id, 'Missing event ID in response');
    
    // Store created task ID for cleanup
    if (response.body.event && response.body.event.id) {
      global.createdTaskId = response.body.event.id;
    }
  } catch (err) {
    logTest('Create valid task', false, err.message);
  }

  // Test 2: Create valid note
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const response = await makeRequest(options, TEST_DATA.validNote);
    logTest('Create valid note', response.statusCode === 201, `Status: ${response.statusCode}`);
    logTest('Note creation response', response.body.event && response.body.event.id, 'Missing event ID in response');
    
    // Store created note ID for cleanup
    if (response.body.event && response.body.event.id) {
      global.createdNoteId = response.body.event.id;
    }
  } catch (err) {
    logTest('Create valid note', false, err.message);
  }

  // Test 3: Missing required fields
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const invalidData = { event_type: 'task' }; // Missing title and event_date
    const response = await makeRequest(options, invalidData);
    logTest('Missing required fields error', response.statusCode === 400, `Status: ${response.statusCode}`);
    logTest('Required fields error message', response.body.error && response.body.error.includes('required'), 'Missing required fields error message');
  } catch (err) {
    logTest('Missing required fields error', false, err.message);
  }

  // Test 4: Invalid event type
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const invalidData = {
      event_type: 'invalid_type',
      title: 'Test',
      event_date: '2025-10-25'
    };
    const response = await makeRequest(options, invalidData);
    logTest('Invalid event type error', response.statusCode === 400, `Status: ${response.statusCode}`);
    logTest('Event type error message', response.body.error && response.body.error.includes('event_type'), 'Missing event type error message');
  } catch (err) {
    logTest('Invalid event type error', false, err.message);
  }

  // Test 5: Invalid date format
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const invalidData = {
      event_type: 'task',
      title: 'Test',
      event_date: 'invalid-date'
    };
    const response = await makeRequest(options, invalidData);
    logTest('Invalid date format in creation', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Invalid date format in creation', false, err.message);
  }

  // Test 6: Note without content
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const invalidData = {
      event_type: 'note',
      title: 'Test Note',
      event_date: '2025-10-25'
      // Missing note_content
    };
    const response = await makeRequest(options, invalidData);
    logTest('Note without content error', response.statusCode === 400, `Status: ${response.statusCode}`);
    logTest('Note content error message', response.body.error && response.body.error.includes('note_content'), 'Missing note content error message');
  } catch (err) {
    logTest('Note without content error', false, err.message);
  }
}

async function testUpdateEventEndpoint() {
  console.log('\n✏️ Testing PUT /api/calendar/events/:id');
  
  if (!global.createdTaskId) {
    console.log('   ⚠️ Skipping update tests - no task ID available');
    return;
  }

  // Test 1: Valid update
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/events/${global.createdTaskId}`,
      method: 'PUT'
    };
    
    const updateData = {
      task_status: 'completed',
      priority: 'medium',
      description: 'Updated description'
    };
    
    const response = await makeRequest(options, updateData);
    logTest('Valid event update', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Update response structure', response.body.event && response.body.event.id, 'Missing event in response');
  } catch (err) {
    logTest('Valid event update', false, err.message);
  }

  // Test 2: Update non-existent event
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/99999',
      method: 'PUT'
    };
    
    const updateData = { title: 'Updated' };
    const response = await makeRequest(options, updateData);
    logTest('Update non-existent event', response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Update non-existent event', false, err.message);
  }

  // Test 3: Invalid event type in update
  try {
    const options = {
      ...TEST_CONFIG,
      path: `/api/calendar/events/${global.createdTaskId}`,
      method: 'PUT'
    };
    
    const updateData = { event_type: 'invalid_type' };
    const response = await makeRequest(options, updateData);
    logTest('Invalid event type in update', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Invalid event type in update', false, err.message);
  }
}

async function testDeleteEventEndpoint() {
  console.log('\n🗑️ Testing DELETE /api/calendar/events/:id');
  
  // Test 1: Soft delete
  if (global.createdTaskId) {
    try {
      const options = {
        ...TEST_CONFIG,
        path: `/api/calendar/events/${global.createdTaskId}?soft_delete=true`,
        method: 'DELETE'
      };
      
      const response = await makeRequest(options);
      logTest('Soft delete event', response.statusCode === 200, `Status: ${response.statusCode}`);
      logTest('Soft delete response', response.body.event && response.body.event.is_archived, 'Event not marked as archived');
    } catch (err) {
      logTest('Soft delete event', false, err.message);
    }
  }

  // Test 2: Hard delete
  if (global.createdNoteId) {
    try {
      const options = {
        ...TEST_CONFIG,
        path: `/api/calendar/events/${global.createdNoteId}`,
        method: 'DELETE'
      };
      
      const response = await makeRequest(options);
      logTest('Hard delete event', response.statusCode === 200, `Status: ${response.statusCode}`);
      logTest('Hard delete response', response.body.deleted_id === global.createdNoteId, 'Incorrect deleted ID');
    } catch (err) {
      logTest('Hard delete event', false, err.message);
    }
  }

  // Test 3: Delete non-existent event
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/99999',
      method: 'DELETE'
    };
    
    const response = await makeRequest(options);
    logTest('Delete non-existent event', response.statusCode === 404, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Delete non-existent event', false, err.message);
  }
}

async function testFilterEndpoint() {
  console.log('\n🔍 Testing GET /api/calendar/events/filter');
  
  // Test 1: Filter by event type
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?event_type=task&limit=5',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Filter by event type', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Filter response structure', response.body.events && response.body.pagination, 'Missing events or pagination');
  } catch (err) {
    logTest('Filter by event type', false, err.message);
  }

  // Test 2: Filter with multiple parameters
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?event_type=task&task_status=pending&priority=high&limit=10&offset=0',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Multiple filter parameters', response.statusCode === 200, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Multiple filter parameters', false, err.message);
  }

  // Test 3: Pagination parameters
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?limit=5&offset=0',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    logTest('Pagination parameters', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Pagination info', response.body.pagination && typeof response.body.pagination.total === 'number', 'Missing pagination info');
  } catch (err) {
    logTest('Pagination parameters', false, err.message);
  }
}

async function testPracticeSessionEndpoint() {
  console.log('\n🏃 Testing POST /api/calendar/practice-session');
  
  // Test 1: Valid practice session (assuming problem ID 1 exists)
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      problem_id: 1,
      event_date: '2025-10-25',
      time_spent_minutes: 30,
      was_successful: true,
      notes: 'Test practice session'
    };
    
    const response = await makeRequest(options, sessionData);
    logTest('Create practice session', response.statusCode === 201 || response.statusCode === 404, `Status: ${response.statusCode}`);
    
    if (response.statusCode === 404) {
      logTest('Practice session - problem not found', true, 'Expected when problem ID 1 does not exist');
    } else {
      logTest('Practice session response', response.body.event && response.body.event.id, 'Missing event in response');
    }
  } catch (err) {
    logTest('Create practice session', false, err.message);
  }

  // Test 2: Missing problem ID
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };
    
    const sessionData = {
      event_date: '2025-10-25',
      time_spent_minutes: 30
    };
    
    const response = await makeRequest(options, sessionData);
    logTest('Practice session missing problem ID', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Practice session missing problem ID', false, err.message);
  }
}

async function testBulkOperationsEndpoint() {
  console.log('\n📦 Testing POST /api/calendar/events/bulk');
  
  // Test 1: Invalid action
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/bulk',
      method: 'POST'
    };
    
    const bulkData = {
      action: 'invalid_action',
      event_ids: [1, 2, 3]
    };
    
    const response = await makeRequest(options, bulkData);
    logTest('Invalid bulk action', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Invalid bulk action', false, err.message);
  }

  // Test 2: Missing parameters
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/bulk',
      method: 'POST'
    };
    
    const bulkData = {
      action: 'archive'
      // Missing event_ids
    };
    
    const response = await makeRequest(options, bulkData);
    logTest('Missing bulk parameters', response.statusCode === 400, `Status: ${response.statusCode}`);
  } catch (err) {
    logTest('Missing bulk parameters', false, err.message);
  }

  // Test 3: Empty event IDs array
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/bulk',
      method: 'POST'
    };
    
    const bulkData = {
      action: 'archive',
      event_ids: []
    };
    
    const response = await makeRequest(options, bulkData);
    logTest('Empty event IDs array', response.statusCode === 200, `Status: ${response.statusCode}`);
    logTest('Empty bulk operation count', response.body.count === 0, 'Expected 0 affected events');
  } catch (err) {
    logTest('Empty event IDs array', false, err.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Calendar API Endpoint Tests');
  console.log('=====================================');
  console.log('Testing all calendar API endpoints for:');
  console.log('- Success scenarios');
  console.log('- Error handling');
  console.log('- Edge cases');
  console.log('- Request/response validation');
  console.log('=====================================\n');

  try {
    // Run all test suites
    await testCalendarEventsEndpoint();
    await testCalendarDayEndpoint();
    await testCalendarStatsEndpoint();
    await testCalendarTaskEndpoints();
    await testPracticeEndpoints();
    await testMonthlyOverviewEndpoint();
    await testCreateEventEndpoint();
    await testUpdateEventEndpoint();
    await testDeleteEventEndpoint();
    await testFilterEndpoint();
    await testPracticeSessionEndpoint();
    await testBulkOperationsEndpoint();

    // Print summary
    console.log('\n=====================================');
    console.log('📊 Test Results Summary');
    console.log('=====================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.testName}: ${test.message}`));
    }

    console.log('\n=====================================');
    console.log('✅ Calendar API endpoint testing completed!');
    console.log('=====================================');

    return testResults.failed === 0;

  } catch (err) {
    console.error('❌ Test runner error:', err.message);
    console.log('\n🔧 Make sure the server is running on http://localhost:3001');
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n❌ Tests failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };