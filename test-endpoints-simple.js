const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

async function testEndpoints() {
  try {
    console.log('🧪 Testing reference data endpoints...\n');
    
    // Test health first
    console.log('0. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log('   Status:', health.status);
    console.log('   Response:', health.data);
    
    if (health.status !== 200) {
      console.log('❌ Server not responding correctly');
      return;
    }
    
    // Test concepts
    console.log('\n1. Testing GET /api/concepts');
    const concepts = await makeRequest('/concepts');
    console.log('   Status:', concepts.status);
    if (concepts.status === 200) {
      console.log('   ✅ Concepts fetched:', concepts.data.length, 'items');
      if (concepts.data.length > 0) {
        console.log('   📋 Sample:', concepts.data.slice(0, 3).map(c => c.name));
      }
    } else {
      console.log('   ❌ Error:', concepts.data);
    }
    
    // Test techniques
    console.log('\n2. Testing GET /api/techniques');
    const techniques = await makeRequest('/techniques');
    console.log('   Status:', techniques.status);
    if (techniques.status === 200) {
      console.log('   ✅ Techniques fetched:', techniques.data.length, 'items');
      if (techniques.data.length > 0) {
        console.log('   📋 Sample:', techniques.data.slice(0, 3).map(t => t.name));
      }
    } else {
      console.log('   ❌ Error:', techniques.data);
    }
    
    // Test goals
    console.log('\n3. Testing GET /api/goals');
    const goals = await makeRequest('/goals');
    console.log('   Status:', goals.status);
    if (goals.status === 200) {
      console.log('   ✅ Goals fetched:', goals.data.length, 'items');
      if (goals.data.length > 0) {
        console.log('   📋 Sample:', goals.data.slice(0, 3).map(g => g.name));
      }
    } else {
      console.log('   ❌ Error:', goals.data);
    }
    
    // Test template basics
    console.log('\n4. Testing GET /api/template-basics');
    const templates = await makeRequest('/template-basics');
    console.log('   Status:', templates.status);
    if (templates.status === 200) {
      console.log('   ✅ Templates fetched:', templates.data.length, 'items');
      if (templates.data.length > 0) {
        console.log('   📋 Sample:', templates.data.slice(0, 2).map(t => t.description));
      }
    } else {
      console.log('   ❌ Error:', templates.data);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();