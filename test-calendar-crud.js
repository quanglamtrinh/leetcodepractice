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

async function testCalendarCRUD() {
  console.log('🧪 Testing Calendar CRUD API Endpoints...\n');
  
  const baseOptions = {
    hostname: 'localhost',
    port: 3001,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    // Test 1: Create a new task
    console.log('1. Testing POST /api/calendar/events (Create Task)');
    const createTaskOptions = {
      ...baseOptions,
      path: '/api/calendar/events',
      method: 'POST'
    };

    const newTask = {
      event_type: 'task',
      title: 'Test API Task',
      description: 'Testing the calendar API',
      event_date: '2025-10-25',
      due_date: '2025-10-27',
      priority: 'high',
      task_status: 'pending'
    };

    const createResponse = await makeRequest(createTaskOptions, newTask);
    console.log('   Status:', createResponse.statusCode);
    if (createResponse.statusCode === 201) {
      console.log('   ✅ Task created successfully');
      console.log('   📝 Created task ID:', createResponse.body.event?.id);
      var createdTaskId = createResponse.body.event?.id;
    } else {
      console.log('   ❌ Error:', createResponse.body);
    }

    // Test 2: Create a new note
    console.log('\n2. Testing POST /api/calendar/events (Create Note)');
    const newNote = {
      event_type: 'note',
      title: 'Test API Note',
      note_content: 'This is a test note created via API',
      event_date: '2025-10-25',
      is_pinned: true
    };

    const createNoteResponse = await makeRequest(createTaskOptions, newNote);
    console.log('   Status:', createNoteResponse.statusCode);
    if (createNoteResponse.statusCode === 201) {
      console.log('   ✅ Note created successfully');
      console.log('   📝 Created note ID:', createNoteResponse.body.event?.id);
      var createdNoteId = createNoteResponse.body.event?.id;
    } else {
      console.log('   ❌ Error:', createNoteResponse.body);
    }

    // Test 3: Update the created task
    if (createdTaskId) {
      console.log('\n3. Testing PUT /api/calendar/events/:id (Update Task)');
      const updateOptions = {
        ...baseOptions,
        path: `/api/calendar/events/${createdTaskId}`,
        method: 'PUT'
      };

      const updateData = {
        task_status: 'completed',
        priority: 'medium'
      };

      const updateResponse = await makeRequest(updateOptions, updateData);
      console.log('   Status:', updateResponse.statusCode);
      if (updateResponse.statusCode === 200) {
        console.log('   ✅ Task updated successfully');
        console.log('   📝 Updated status:', updateResponse.body.event?.task_status);
      } else {
        console.log('   ❌ Error:', updateResponse.body);
      }
    }

    // Test 4: Test filtering
    console.log('\n4. Testing GET /api/calendar/events/filter');
    const filterOptions = {
      ...baseOptions,
      path: '/api/calendar/events/filter?event_type=task&limit=5',
      method: 'GET'
    };

    const filterResponse = await makeRequest(filterOptions);
    console.log('   Status:', filterResponse.statusCode);
    if (filterResponse.statusCode === 200) {
      console.log('   ✅ Filter query successful');
      console.log('   📝 Found tasks:', filterResponse.body.events?.length);
      console.log('   📊 Pagination:', filterResponse.body.pagination);
    } else {
      console.log('   ❌ Error:', filterResponse.body);
    }

    // Test 5: Test bulk operations
    if (createdTaskId && createdNoteId) {
      console.log('\n5. Testing POST /api/calendar/events/bulk (Archive)');
      const bulkOptions = {
        ...baseOptions,
        path: '/api/calendar/events/bulk',
        method: 'POST'
      };

      const bulkData = {
        action: 'archive',
        event_ids: [createdTaskId, createdNoteId]
      };

      const bulkResponse = await makeRequest(bulkOptions, bulkData);
      console.log('   Status:', bulkResponse.statusCode);
      if (bulkResponse.statusCode === 200) {
        console.log('   ✅ Bulk archive successful');
        console.log('   📝 Affected events:', bulkResponse.body.count);
      } else {
        console.log('   ❌ Error:', bulkResponse.body);
      }
    }

    // Test 6: Test soft delete
    if (createdTaskId) {
      console.log('\n6. Testing DELETE /api/calendar/events/:id (Soft Delete)');
      const softDeleteOptions = {
        ...baseOptions,
        path: `/api/calendar/events/${createdTaskId}?soft_delete=true`,
        method: 'DELETE'
      };

      const softDeleteResponse = await makeRequest(softDeleteOptions);
      console.log('   Status:', softDeleteResponse.statusCode);
      if (softDeleteResponse.statusCode === 200) {
        console.log('   ✅ Soft delete successful');
        console.log('   📝 Archived event:', softDeleteResponse.body.event?.title);
      } else {
        console.log('   ❌ Error:', softDeleteResponse.body);
      }
    }

    // Test 7: Test error handling - invalid event type
    console.log('\n7. Testing error handling - invalid event type');
    const invalidTask = {
      event_type: 'invalid_type',
      title: 'Invalid Task',
      event_date: '2025-10-25'
    };

    const invalidResponse = await makeRequest(createTaskOptions, invalidTask);
    console.log('   Status:', invalidResponse.statusCode);
    if (invalidResponse.statusCode === 400) {
      console.log('   ✅ Correctly returned 400 error for invalid event type');
      console.log('   📝 Error message:', invalidResponse.body.error);
    } else {
      console.log('   ❌ Unexpected response:', invalidResponse.body);
    }

    // Test 8: Test error handling - missing required fields
    console.log('\n8. Testing error handling - missing required fields');
    const incompleteTask = {
      event_type: 'task'
      // Missing title and event_date
    };

    const incompleteResponse = await makeRequest(createTaskOptions, incompleteTask);
    console.log('   Status:', incompleteResponse.statusCode);
    if (incompleteResponse.statusCode === 400) {
      console.log('   ✅ Correctly returned 400 error for missing fields');
      console.log('   📝 Error message:', incompleteResponse.body.error);
    } else {
      console.log('   ❌ Unexpected response:', incompleteResponse.body);
    }

    console.log('\n✅ Calendar CRUD API testing completed!');

  } catch (err) {
    console.error('❌ Test error:', err.message);
    console.log('\n🔧 Make sure the server is running on http://localhost:3001');
  }
}

// Run tests if called directly
if (require.main === module) {
  testCalendarCRUD()
    .then(() => {
      console.log('\n🎉 All CRUD tests completed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Tests failed:', err.message);
      process.exit(1);
    });
}

module.exports = { testCalendarCRUD };