const http = require('http');

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

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testPracticeSessionIntegration() {
  console.log('🧪 Testing Practice Session Auto-Creation Integration...\n');
  
  const baseOptions = {
    hostname: 'localhost',
    port: 3001,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    // Test 1: Get a problem to test with
    console.log('1. Getting a test problem...');
    const getProblemsOptions = {
      ...baseOptions,
      path: '/api/problems?limit=1',
      method: 'GET'
    };

    const problemsResponse = await makeRequest(getProblemsOptions);
    if (problemsResponse.statusCode !== 200 || !problemsResponse.body.length) {
      console.log('   ❌ No problems found in database');
      return;
    }

    const testProblem = problemsResponse.body[0];
    console.log('   ✅ Using test problem:', testProblem.title, `(ID: ${testProblem.id})`);

    // Test 2: Mark problem as solved (should auto-create practice session)
    console.log('\n2. Testing auto-creation when marking problem as solved...');
    const updateProgressOptions = {
      ...baseOptions,
      path: `/api/problems/${testProblem.id}/progress`,
      method: 'PUT'
    };

    const solveData = {
      solved: true,
      notes: 'Test solve for practice session auto-creation',
      solution: '123'
    };

    const solveResponse = await makeRequest(updateProgressOptions, solveData);
    console.log('   Status:', solveResponse.statusCode);
    if (solveResponse.statusCode === 200) {
      console.log('   ✅ Problem marked as solved successfully');
      console.log('   📝 Problem status:', solveResponse.body.solved);
    } else {
      console.log('   ❌ Error:', solveResponse.body);
    }

    // Test 3: Check if practice session was auto-created
    console.log('\n3. Checking if practice session was auto-created...');
    const today = new Date().toISOString().split('T')[0];
    const checkSessionsOptions = {
      ...baseOptions,
      path: `/api/calendar/events/filter?event_type=practice_session&problem_id=${testProblem.id}&start_date=${today}&end_date=${today}`,
      method: 'GET'
    };

    const sessionsResponse = await makeRequest(checkSessionsOptions);
    console.log('   Status:', sessionsResponse.statusCode);
    if (sessionsResponse.statusCode === 200) {
      const sessions = sessionsResponse.body.events || [];
      console.log('   📋 Practice sessions found:', sessions.length);
      if (sessions.length > 0) {
        console.log('   ✅ Practice session auto-created successfully!');
        console.log('   📝 Session details:', {
          id: sessions[0].id,
          title: sessions[0].title,
          event_date: sessions[0].event_date,
          was_successful: sessions[0].was_successful,
          problem_title: sessions[0].problem_title
        });
        var createdSessionId = sessions[0].id;
      } else {
        console.log('   ❌ No practice session was created');
      }
    } else {
      console.log('   ❌ Error checking sessions:', sessionsResponse.body);
    }

    // Test 4: Test manual practice session creation
    console.log('\n4. Testing manual practice session creation...');
    const manualSessionOptions = {
      ...baseOptions,
      path: '/api/calendar/practice-session',
      method: 'POST'
    };

    const manualSessionData = {
      problem_id: testProblem.id,
      event_date: today,
      time_spent_minutes: 45,
      was_successful: true,
      notes: 'Manual practice session with time tracking',
      start_time: '14:00',
      end_time: '14:45'
    };

    const manualSessionResponse = await makeRequest(manualSessionOptions, manualSessionData);
    console.log('   Status:', manualSessionResponse.statusCode);
    if (manualSessionResponse.statusCode === 201) {
      console.log('   ✅ Manual practice session created successfully');
      console.log('   📝 Session ID:', manualSessionResponse.body.event?.id);
      console.log('   ⏱️  Time tracking:', manualSessionResponse.body.time_tracking);
    } else {
      console.log('   ❌ Error:', manualSessionResponse.body);
    }

    // Test 5: Get practice statistics
    console.log('\n5. Testing practice statistics...');
    const statsOptions = {
      ...baseOptions,
      path: `/api/calendar/practice-stats?start_date=${today}&end_date=${today}&problem_id=${testProblem.id}`,
      method: 'GET'
    };

    const statsResponse = await makeRequest(statsOptions);
    console.log('   Status:', statsResponse.statusCode);
    if (statsResponse.statusCode === 200) {
      console.log('   ✅ Practice statistics retrieved successfully');
      console.log('   📊 Overall stats:', statsResponse.body.overall_stats);
      console.log('   📈 Problem stats:', statsResponse.body.problem_stats?.length || 0, 'problems');
    } else {
      console.log('   ❌ Error:', statsResponse.body);
    }

    // Test 6: Test marking problem as unsolved (should archive practice sessions)
    console.log('\n6. Testing practice session archival when marking as unsolved...');
    const unsolveData = {
      solved: false,
      notes: 'Testing unsolved behavior'
    };

    const unsolveResponse = await makeRequest(updateProgressOptions, unsolveData);
    console.log('   Status:', unsolveResponse.statusCode);
    if (unsolveResponse.statusCode === 200) {
      console.log('   ✅ Problem marked as unsolved successfully');
      console.log('   📝 Problem status:', unsolveResponse.body.solved);
    } else {
      console.log('   ❌ Error:', unsolveResponse.body);
    }

    // Test 7: Verify practice sessions were archived
    console.log('\n7. Verifying practice sessions were archived...');
    const archivedSessionsOptions = {
      ...baseOptions,
      path: `/api/calendar/events/filter?event_type=practice_session&problem_id=${testProblem.id}&is_archived=true`,
      method: 'GET'
    };

    const archivedResponse = await makeRequest(archivedSessionsOptions);
    console.log('   Status:', archivedResponse.statusCode);
    if (archivedResponse.statusCode === 200) {
      const archivedSessions = archivedResponse.body.events || [];
      console.log('   📋 Archived practice sessions:', archivedSessions.length);
      if (archivedSessions.length > 0) {
        console.log('   ✅ Practice sessions archived successfully when problem marked as unsolved');
      } else {
        console.log('   ⚠️  No archived sessions found (may be expected if sessions were deleted)');
      }
    } else {
      console.log('   ❌ Error checking archived sessions:', archivedResponse.body);
    }

    console.log('\n✅ Practice session integration testing completed!');

  } catch (err) {
    console.error('❌ Test error:', err.message);
    console.log('\n🔧 Make sure the server is running on http://localhost:3001');
  }
}

// Run tests if called directly
if (require.main === module) {
  testPracticeSessionIntegration()
    .then(() => {
      console.log('\n🎉 All integration tests completed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Tests failed:', err.message);
      process.exit(1);
    });
}

module.exports = { testPracticeSessionIntegration };