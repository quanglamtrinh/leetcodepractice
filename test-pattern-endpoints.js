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

async function testPatternEndpoints() {
  try {
    console.log('🧪 Testing pattern management endpoints...\n');
    
    // Test health first
    console.log('0. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log('   Status:', health.status);
    
    if (health.status !== 200) {
      console.log('❌ Server not responding correctly');
      return;
    }
    
    // Test 1: Get all patterns
    console.log('\n1. Testing GET /api/patterns');
    const patterns = await makeRequest('/patterns');
    console.log('   Status:', patterns.status);
    if (patterns.status === 200) {
      console.log('   ✅ Patterns fetched:', patterns.data.length, 'items');
      if (patterns.data.length > 0) {
        console.log('   📋 Sample patterns:', patterns.data.slice(0, 2).map(p => ({
          name: p.name,
          concept: p.concept_name
        })));
      }
    } else {
      console.log('   ❌ Error:', patterns.data);
    }
    
    // Test 2: Create a new pattern
    console.log('\n2. Testing POST /api/patterns');
    const newPattern = {
      name: 'Test Pattern',
      description: 'A pattern for testing purposes',
      concept_id: 1 // Assuming first concept exists
    };
    
    const createPattern = await makeRequest('/patterns', 'POST', newPattern);
    console.log('   Status:', createPattern.status);
    if (createPattern.status === 201) {
      console.log('   ✅ Pattern created:', createPattern.data.name);
      
      const patternId = createPattern.data.id;
      
      // Test 3: Get specific pattern
      console.log('\n3. Testing GET /api/patterns/:id');
      const getPattern = await makeRequest(`/patterns/${patternId}`);
      console.log('   Status:', getPattern.status);
      if (getPattern.status === 200) {
        console.log('   ✅ Pattern retrieved:', getPattern.data.name);
      } else {
        console.log('   ❌ Error:', getPattern.data);
      }
      
      // Test 4: Update pattern
      console.log('\n4. Testing PUT /api/patterns/:id');
      const updateData = {
        name: 'Updated Test Pattern',
        description: 'Updated description'
      };
      const updatePattern = await makeRequest(`/patterns/${patternId}`, 'PUT', updateData);
      console.log('   Status:', updatePattern.status);
      if (updatePattern.status === 200) {
        console.log('   ✅ Pattern updated:', updatePattern.data.name);
      } else {
        console.log('   ❌ Error:', updatePattern.data);
      }
      
      // Test 5: Get variants for pattern
      console.log('\n5. Testing GET /api/patterns/:id/variants');
      const variants = await makeRequest(`/patterns/${patternId}/variants`);
      console.log('   Status:', variants.status);
      if (variants.status === 200) {
        console.log('   ✅ Variants fetched:', variants.data.length, 'items');
      } else {
        console.log('   ❌ Error:', variants.data);
      }
      
    } else {
      console.log('   ❌ Error creating pattern:', createPattern.data);
    }
    
    // Test 6: Test filtering patterns by concept
    console.log('\n6. Testing GET /api/patterns?concept_id=two-pointers');
    const filteredPatterns = await makeRequest('/patterns?concept_id=two-pointers');
    console.log('   Status:', filteredPatterns.status);
    if (filteredPatterns.status === 200) {
      console.log('   ✅ Filtered patterns:', filteredPatterns.data.length, 'items');
    } else {
      console.log('   ❌ Error:', filteredPatterns.data);
    }
    
    // Test 7: Test validation
    console.log('\n7. Testing validation (missing name)');
    const invalidPattern = { description: 'No name provided' };
    const invalidCreate = await makeRequest('/patterns', 'POST', invalidPattern);
    console.log('   Status:', invalidCreate.status);
    if (invalidCreate.status === 400) {
      console.log('   ✅ Validation error handled:', invalidCreate.data.error);
    } else {
      console.log('   ❌ Unexpected response:', invalidCreate.data);
    }
    
    console.log('\n✅ All pattern endpoint tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPatternEndpoints();