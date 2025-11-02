const http = require('http');

/**
 * Comprehensive Calendar API Test Suite
 * 
 * Complete test suite for calendar API endpoints covering:
 * - All endpoint functionality
 * - Request/response format validation
 * - Error scenarios and edge cases
 * - Performance and reliability testing
 * 
 * Requirements: 11.1, 11.2, 11.3
 */

// Test configuration
const TEST_CONFIG = {
  hostname: 'localhost',
  port: 3001,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Expected response schemas for validation
const RESPONSE_SCHEMAS = {
  calendarEvent: {
    required: ['id', 'event_type', 'title', 'event_date', 'created_at'],
    optional: ['description', 'event_time', 'duration_minutes', 'all_day', 'task_status', 
               'due_date', 'priority', 'note_content', 'is_pinned', 'problem_id', 
               'time_spent_minutes', 'was_successful', 'tags', 'color']
  },
  calendarStats: {
    required: ['total_events', 'events_by_type', 'events_by_status'],
    optional: ['date_range', 'most_active_day']
  },
  paginationInfo: {
    required: ['total', 'limit', 'offset', 'has_more'],
    optional: []
  },
  practiceStats: {
    required: ['overall_stats', 'time_breakdown', 'problem_stats'],
    optional: ['filters']
  }
};

// Utility functions
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
            body: jsonBody,
            rawBody: body
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
            parseError: err.message
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

function validateSchema(obj, schema) {
  const errors = [];
  
  // Check required fields
  for (const field of schema.required) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check for unexpected fields (optional validation)
  const allowedFields = [...schema.required, ...schema.optional];
  for (const field in obj) {
    if (!allowedFields.includes(field)) {
      // This is just a warning, not an error
      console.log(`   ⚠️ Unexpected field: ${field}`);
    }
  }
  
  return errors;
}

function validateDateFormat(dateString) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date.toISOString().split('T')[0] === dateString;
}

function validateTimeFormat(timeString) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(timeString);
}

// Test result tracking
let comprehensiveResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
  performance: [],
  coverage: {
    endpoints: [],
    methods: [],
    statusCodes: []
  }
};

function logTest(testName, passed, message = '', performance = null) {
  comprehensiveResults.total++;
  if (passed) {
    comprehensiveResults.passed++;
    console.log(`   ✅ ${testName}`);
  } else {
    comprehensiveResults.failed++;
    console.log(`   ❌ ${testName}: ${message}`);
  }
  
  comprehensiveResults.details.push({ testName, passed, message });
  
  if (performance) {
    comprehensiveResults.performance.push({ testName, ...performance });
  }
}

function trackCoverage(endpoint, method, statusCode) {
  if (!comprehensiveResults.coverage.endpoints.includes(endpoint)) {
    comprehensiveResults.coverage.endpoints.push(endpoint);
  }
  if (!comprehensiveResults.coverage.methods.includes(method)) {
    comprehensiveResults.coverage.methods.push(method);
  }
  if (!comprehensiveResults.coverage.statusCodes.includes(statusCode)) {
    comprehensiveResults.coverage.statusCodes.push(statusCode);
  }
}

// Comprehensive test suites
async function testAllCalendarEndpoints() {
  console.log('\n📋 Testing All Calendar Endpoints');
  
  const endpoints = [
    { path: '/api/calendar/events?start_date=2025-01-01&end_date=2025-01-31', method: 'GET', name: 'Calendar Events' },
    { path: '/api/calendar/day/2025-10-25', method: 'GET', name: 'Day Events' },
    { path: '/api/calendar/stats?start_date=2025-01-01&end_date=2025-01-31', method: 'GET', name: 'Calendar Stats' },
    { path: '/api/calendar/overdue-tasks', method: 'GET', name: 'Overdue Tasks' },
    { path: '/api/calendar/upcoming-tasks', method: 'GET', name: 'Upcoming Tasks' },
    { path: '/api/calendar/practice-history', method: 'GET', name: 'Practice History' },
    { path: '/api/calendar/monthly-overview', method: 'GET', name: 'Monthly Overview' },
    { path: '/api/calendar/events/filter?limit=10', method: 'GET', name: 'Event Filter' },
    { path: '/api/calendar/practice-stats?start_date=2025-01-01&end_date=2025-01-31', method: 'GET', name: 'Practice Stats' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const options = {
        ...TEST_CONFIG,
        path: endpoint.path,
        method: endpoint.method
      };
      
      const response = await makeRequest(options);
      const responseTime = Date.now() - startTime;
      
      trackCoverage(endpoint.path.split('?')[0], endpoint.method, response.statusCode);
      
      logTest(
        `${endpoint.name} endpoint`,
        response.statusCode === 200,
        `Status: ${response.statusCode}`,
        { responseTime, endpoint: endpoint.name }
      );
      
      // Validate response time (should be under 2 seconds per requirements)
      logTest(
        `${endpoint.name} response time`,
        responseTime < 2000,
        `${responseTime}ms (requirement: <2000ms)`
      );
      
      // Validate response format
      if (response.statusCode === 200) {
        logTest(
          `${endpoint.name} response format`,
          !response.parseError,
          response.parseError || 'Valid JSON'
        );
      }
      
    } catch (err) {
      logTest(`${endpoint.name} endpoint`, false, err.message);
    }
  }
}

async function testRequestResponseFormats() {
  console.log('\n📝 Testing Request/Response Formats');
  
  // Test 1: Create event with all fields
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events',
      method: 'POST'
    };
    
    const completeEvent = {
      event_type: 'task',
      title: 'Complete Format Test',
      description: 'Testing all possible fields',
      event_date: '2025-10-25',
      event_time: '14:30:00',
      duration_minutes: 60,
      all_day: false,
      task_status: 'pending',
      due_date: '2025-10-27',
      priority: 'high',
      is_pinned: true,
      tags: ['test', 'format'],
      color: '#FF5733',
      reminder_minutes_before: 30
    };
    
    const response = await makeRequest(options, completeEvent);
    trackCoverage('/api/calendar/events', 'POST', response.statusCode);
    
    logTest('Complete event creation', response.statusCode === 201, `Status: ${response.statusCode}`);
    
    if (response.statusCode === 201 && response.body.event) {
      const event = response.body.event;
      global.testEventId = event.id;
      
      // Validate response schema
      const schemaErrors = validateSchema(event, RESPONSE_SCHEMAS.calendarEvent);
      logTest('Event response schema', schemaErrors.length === 0, schemaErrors.join(', '));
      
      // Validate date format
      logTest('Event date format', validateDateFormat(event.event_date), `Date: ${event.event_date}`);
      
      // Validate time format if present
      if (event.event_time) {
        logTest('Event time format', validateTimeFormat(event.event_time), `Time: ${event.event_time}`);
      }
      
      // Validate enum values
      const validEventTypes = ['task', 'note', 'practice_session', 'reminder'];
      logTest('Valid event type', validEventTypes.includes(event.event_type), `Type: ${event.event_type}`);
      
      const validPriorities = ['low', 'medium', 'high'];
      if (event.priority) {
        logTest('Valid priority', validPriorities.includes(event.priority), `Priority: ${event.priority}`);
      }
      
      const validTaskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (event.task_status) {
        logTest('Valid task status', validTaskStatuses.includes(event.task_status), `Status: ${event.task_status}`);
      }
    }
    
  } catch (err) {
    logTest('Complete event creation', false, err.message);
  }
  
  // Test 2: Validate filter response format
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?event_type=task&limit=5',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      logTest('Filter response structure', 
        response.body.events && response.body.pagination,
        'Missing events or pagination'
      );
      
      if (response.body.pagination) {
        const paginationErrors = validateSchema(response.body.pagination, RESPONSE_SCHEMAS.paginationInfo);
        logTest('Pagination schema', paginationErrors.length === 0, paginationErrors.join(', '));
      }
      
      if (response.body.events && Array.isArray(response.body.events)) {
        logTest('Events array format', true, `${response.body.events.length} events`);
        
        // Validate first event if exists
        if (response.body.events.length > 0) {
          const firstEvent = response.body.events[0];
          const eventErrors = validateSchema(firstEvent, RESPONSE_SCHEMAS.calendarEvent);
          logTest('First event schema', eventErrors.length === 0, eventErrors.join(', '));
        }
      }
    }
    
  } catch (err) {
    logTest('Filter response format', false, err.message);
  }
  
  // Test 3: Validate stats response format
  try {
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/stats?start_date=2025-01-01&end_date=2025-01-31',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const statsErrors = validateSchema(response.body, RESPONSE_SCHEMAS.calendarStats);
      logTest('Stats response schema', statsErrors.length === 0, statsErrors.join(', '));
      
      // Validate numeric fields
      if (typeof response.body.total_events === 'number') {
        logTest('Stats numeric fields', response.body.total_events >= 0, `Total: ${response.body.total_events}`);
      }
    }
    
  } catch (err) {
    logTest('Stats response format', false, err.message);
  }
}

async function testErrorResponseFormats() {
  console.log('\n❌ Testing Error Response Formats');
  
  const errorTests = [
    {
      name: 'Missing required parameters',
      options: { path: '/api/calendar/events', method: 'GET' },
      expectedStatus: 400
    },
    {
      name: 'Invalid date format',
      options: { path: '/api/calendar/day/invalid-date', method: 'GET' },
      expectedStatus: 400
    },
    {
      name: 'Non-existent event',
      options: { path: '/api/calendar/events/99999', method: 'GET' },
      expectedStatus: 404
    },
    {
      name: 'Invalid event type',
      options: { path: '/api/calendar/events', method: 'POST' },
      data: { event_type: 'invalid', title: 'Test', event_date: '2025-10-25' },
      expectedStatus: 400
    }
  ];
  
  for (const test of errorTests) {
    try {
      const options = {
        ...TEST_CONFIG,
        ...test.options
      };
      
      const response = await makeRequest(options, test.data);
      trackCoverage(test.options.path.split('?')[0], test.options.method, response.statusCode);
      
      logTest(
        `${test.name} - status code`,
        response.statusCode === test.expectedStatus,
        `Expected: ${test.expectedStatus}, Got: ${response.statusCode}`
      );
      
      // Validate error response format
      if (response.statusCode >= 400) {
        logTest(
          `${test.name} - error message`,
          response.body.error && typeof response.body.error === 'string',
          'Missing or invalid error message'
        );
      }
      
    } catch (err) {
      logTest(`${test.name}`, false, err.message);
    }
  }
}

async function testDataConsistency() {
  console.log('\n🔄 Testing Data Consistency');
  
  if (!global.testEventId) {
    console.log('   ⚠️ Skipping consistency tests - no test event available');
    return;
  }
  
  // Test 1: Update event and verify changes
  try {
    const updateOptions = {
      ...TEST_CONFIG,
      path: `/api/calendar/events/${global.testEventId}`,
      method: 'PUT'
    };
    
    const updateData = {
      title: 'Updated Title',
      task_status: 'completed',
      priority: 'low'
    };
    
    const updateResponse = await makeRequest(updateOptions, updateData);
    logTest('Event update', updateResponse.statusCode === 200, `Status: ${updateResponse.statusCode}`);
    
    if (updateResponse.statusCode === 200) {
      const updatedEvent = updateResponse.body.event;
      
      logTest('Title updated', updatedEvent.title === 'Updated Title', `Title: ${updatedEvent.title}`);
      logTest('Status updated', updatedEvent.task_status === 'completed', `Status: ${updatedEvent.task_status}`);
      logTest('Priority updated', updatedEvent.priority === 'low', `Priority: ${updatedEvent.priority}`);
      
      // Verify updated_at timestamp changed
      logTest('Updated timestamp', updatedEvent.updated_at !== updatedEvent.created_at, 'Timestamp not updated');
    }
    
  } catch (err) {
    logTest('Event update consistency', false, err.message);
  }
  
  // Test 2: Verify event appears in filtered results
  try {
    const filterOptions = {
      ...TEST_CONFIG,
      path: '/api/calendar/events/filter?task_status=completed&limit=100',
      method: 'GET'
    };
    
    const filterResponse = await makeRequest(filterOptions);
    
    if (filterResponse.statusCode === 200 && filterResponse.body.events) {
      const foundEvent = filterResponse.body.events.find(e => e.id === global.testEventId);
      logTest('Updated event in filter results', !!foundEvent, 'Event not found in filter results');
      
      if (foundEvent) {
        logTest('Filter consistency - status', foundEvent.task_status === 'completed', `Status: ${foundEvent.task_status}`);
      }
    }
    
  } catch (err) {
    logTest('Filter consistency', false, err.message);
  }
}

async function testPerformanceRequirements() {
  console.log('\n⚡ Testing Performance Requirements');
  
  // Test 1: Calendar load time (requirement: <2 seconds)
  try {
    const startTime = Date.now();
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/events?start_date=2025-01-01&end_date=2025-12-31',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    const loadTime = Date.now() - startTime;
    
    logTest('Calendar load time', loadTime < 2000, `${loadTime}ms (requirement: <2000ms)`);
    logTest('Calendar load success', response.statusCode === 200, `Status: ${response.statusCode}`);
    
  } catch (err) {
    logTest('Calendar load performance', false, err.message);
  }
  
  // Test 2: Day detail load time (requirement: <2 seconds)
  try {
    const startTime = Date.now();
    const options = {
      ...TEST_CONFIG,
      path: '/api/calendar/day/2025-10-25',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    const loadTime = Date.now() - startTime;
    
    logTest('Day detail load time', loadTime < 2000, `${loadTime}ms (requirement: <2000ms)`);
    logTest('Day detail load success', response.statusCode === 200, `Status: ${response.statusCode}`);
    
  } catch (err) {
    logTest('Day detail load performance', false, err.message);
  }
  
  // Test 3: Response time consistency (multiple requests)
  try {
    const responseTimes = [];
    const testCount = 5;
    
    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      const options = {
        ...TEST_CONFIG,
        path: '/api/calendar/overdue-tasks',
        method: 'GET'
      };
      
      await makeRequest(options);
      responseTimes.push(Date.now() - startTime);
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / testCount;
    const maxResponseTime = Math.max(...responseTimes);
    
    logTest('Average response time', avgResponseTime < 500, `${avgResponseTime.toFixed(0)}ms (target: <500ms)`);
    logTest('Max response time', maxResponseTime < 1000, `${maxResponseTime}ms (target: <1000ms)`);
    
  } catch (err) {
    logTest('Response time consistency', false, err.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data');
  
  if (global.testEventId) {
    try {
      const options = {
        ...TEST_CONFIG,
        path: `/api/calendar/events/${global.testEventId}`,
        method: 'DELETE'
      };
      
      await makeRequest(options);
      console.log('   ✅ Cleaned up test event');
    } catch (err) {
      console.log('   ⚠️ Failed to cleanup test event:', err.message);
    }
  }
}

// Main comprehensive test runner
async function runComprehensiveTests() {
  console.log('🧪 Comprehensive Calendar API Test Suite');
  console.log('=========================================');
  console.log('Testing all endpoints, formats, and requirements');
  console.log('Requirements: 11.1, 11.2, 11.3');
  console.log('=========================================\n');

  try {
    // Run all test suites
    await testAllCalendarEndpoints();
    await testRequestResponseFormats();
    await testErrorResponseFormats();
    await testDataConsistency();
    await testPerformanceRequirements();
    
    // Cleanup
    await cleanupTestData();

    // Print comprehensive summary
    console.log('\n=========================================');
    console.log('📊 Comprehensive Test Results');
    console.log('=========================================');
    console.log(`Total Tests: ${comprehensiveResults.total}`);
    console.log(`Passed: ${comprehensiveResults.passed} ✅`);
    console.log(`Failed: ${comprehensiveResults.failed} ❌`);
    console.log(`Success Rate: ${((comprehensiveResults.passed / comprehensiveResults.total) * 100).toFixed(1)}%`);
    
    // Coverage report
    console.log('\n📋 Coverage Report:');
    console.log(`Endpoints Tested: ${comprehensiveResults.coverage.endpoints.length}`);
    console.log(`HTTP Methods: ${comprehensiveResults.coverage.methods.join(', ')}`);
    console.log(`Status Codes: ${comprehensiveResults.coverage.statusCodes.join(', ')}`);
    
    // Performance summary
    if (comprehensiveResults.performance.length > 0) {
      console.log('\n⚡ Performance Summary:');
      const avgResponseTime = comprehensiveResults.performance
        .reduce((sum, p) => sum + p.responseTime, 0) / comprehensiveResults.performance.length;
      console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
      
      const slowTests = comprehensiveResults.performance.filter(p => p.responseTime > 1000);
      if (slowTests.length > 0) {
        console.log('⚠️ Slow Endpoints (>1s):');
        slowTests.forEach(test => console.log(`   - ${test.endpoint}: ${test.responseTime}ms`));
      }
    }
    
    if (comprehensiveResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      comprehensiveResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.testName}: ${test.message}`));
    }

    console.log('\n=========================================');
    console.log('✅ Comprehensive calendar API testing completed!');
    console.log('=========================================');

    return comprehensiveResults.failed === 0;

  } catch (err) {
    console.error('❌ Comprehensive test runner error:', err.message);
    console.log('\n🔧 Make sure the server is running on http://localhost:3001');
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n❌ Comprehensive tests failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests, comprehensiveResults };