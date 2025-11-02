const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testCalendarAPI() {
  console.log('🧪 Testing Calendar API Endpoints...\n');
  
  try {
    // Test 1: Get calendar events
    console.log('1. Testing GET /api/calendar/events');
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
      const eventsResponse = await axios.get(`${BASE_URL}/calendar/events`, {
        params: { start_date: startDate, end_date: endDate }
      });
      console.log('   ✅ Calendar events:', eventsResponse.data.length, 'events found');
      if (eventsResponse.data.length > 0) {
        console.log('   📝 Sample event:', eventsResponse.data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 2: Get events for today
    console.log('\n2. Testing GET /api/calendar/day/:date');
    try {
      const dayResponse = await axios.get(`${BASE_URL}/calendar/day/${startDate}`);
      console.log('   ✅ Today\'s events:', dayResponse.data.length, 'events found');
      if (dayResponse.data.length > 0) {
        console.log('   📝 Sample today event:', dayResponse.data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 3: Get calendar stats
    console.log('\n3. Testing GET /api/calendar/stats');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/calendar/stats`, {
        params: { start_date: startDate, end_date: endDate }
      });
      console.log('   ✅ Calendar stats:', statsResponse.data);
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 4: Get overdue tasks
    console.log('\n4. Testing GET /api/calendar/overdue-tasks');
    try {
      const overdueResponse = await axios.get(`${BASE_URL}/calendar/overdue-tasks`);
      console.log('   ✅ Overdue tasks:', overdueResponse.data.length, 'tasks found');
      if (overdueResponse.data.length > 0) {
        console.log('   📝 Sample overdue task:', overdueResponse.data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 5: Get upcoming tasks
    console.log('\n5. Testing GET /api/calendar/upcoming-tasks');
    try {
      const upcomingResponse = await axios.get(`${BASE_URL}/calendar/upcoming-tasks`);
      console.log('   ✅ Upcoming tasks:', upcomingResponse.data.length, 'tasks found');
      if (upcomingResponse.data.length > 0) {
        console.log('   📝 Sample upcoming task:', upcomingResponse.data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 6: Get practice history
    console.log('\n6. Testing GET /api/calendar/practice-history');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/calendar/practice-history`);
      console.log('   ✅ Practice history:', historyResponse.data.length, 'sessions found');
      if (historyResponse.data.length > 0) {
        console.log('   📝 Sample practice session:', historyResponse.data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 7: Get monthly overview
    console.log('\n7. Testing GET /api/calendar/monthly-overview');
    try {
      const monthlyResponse = await axios.get(`${BASE_URL}/calendar/monthly-overview`);
      console.log('   ✅ Monthly overview:', monthlyResponse.data.length, 'months found');
      if (monthlyResponse.data.length > 0) {
        console.log('   📝 Sample month:', monthlyResponse.data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.data?.error || err.message);
    }
    
    // Test 8: Test error handling - invalid date format
    console.log('\n8. Testing error handling - invalid date format');
    try {
      await axios.get(`${BASE_URL}/calendar/day/invalid-date`);
      console.log('   ❌ Should have returned error for invalid date');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('   ✅ Correctly returned 400 error for invalid date');
        console.log('   📝 Error message:', err.response.data.error);
      } else {
        console.log('   ❌ Unexpected error:', err.message);
      }
    }
    
    // Test 9: Test error handling - missing parameters
    console.log('\n9. Testing error handling - missing parameters');
    try {
      await axios.get(`${BASE_URL}/calendar/events`);
      console.log('   ❌ Should have returned error for missing parameters');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('   ✅ Correctly returned 400 error for missing parameters');
        console.log('   📝 Error message:', err.response.data.error);
      } else {
        console.log('   ❌ Unexpected error:', err.message);
      }
    }
    
    console.log('\n✅ Calendar API testing completed!');
    
  } catch (err) {
    console.error('❌ Test setup error:', err.message);
    console.log('\n🔧 Make sure the server is running on http://localhost:3001');
  }
}

// Run tests if called directly
if (require.main === module) {
  testCalendarAPI()
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Tests failed:', err.message);
      process.exit(1);
    });
}

module.exports = { testCalendarAPI };