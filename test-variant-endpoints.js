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

async function testVariantEndpoints() {
  try {
    console.log('🧪 Testing variant management endpoints...\n');
    
    // Test health first
    console.log('0. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log('   Status:', health.status);
    
    if (health.status !== 200) {
      console.log('❌ Server not responding correctly');
      return;
    }
    
    // Get a pattern ID to use for testing
    console.log('\n0.1. Getting pattern ID for testing...');
    const patterns = await makeRequest('/patterns');
    if (patterns.status !== 200 || patterns.data.length === 0) {
      console.log('❌ No patterns available for testing');
      return;
    }
    const patternId = patterns.data[0].id;
    console.log('   Using pattern ID:', patternId, '(' + patterns.data[0].name + ')');
    
    // Test 1: Get all variants
    console.log('\n1. Testing GET /api/variants');
    const variants = await makeRequest('/variants');
    console.log('   Status:', variants.status);
    if (variants.status === 200) {
      console.log('   ✅ Variants fetched:', variants.data.length, 'items');
      if (variants.data.length > 0) {
        console.log('   📋 Sample variants:', variants.data.slice(0, 2).map(v => ({
          name: v.name,
          pattern: v.pattern_name
        })));
      }
    } else {
      console.log('   ❌ Error:', variants.data);
    }
    
    // Test 2: Create a new variant
    console.log('\n2. Testing POST /api/variants');
    const newVariant = {
      name: 'Test Variant',
      use_when: 'When testing the API endpoints',
      notes: 'This is a test variant',
      pattern_id: patternId
    };
    
    const createVariant = await makeRequest('/variants', 'POST', newVariant);
    console.log('   Status:', createVariant.status);
    if (createVariant.status === 201) {
      console.log('   ✅ Variant created:', createVariant.data.name);
      
      const variantId = createVariant.data.id;
      
      // Test 3: Get specific variant
      console.log('\n3. Testing GET /api/variants/:id');
      const getVariant = await makeRequest(`/variants/${variantId}`);
      console.log('   Status:', getVariant.status);
      if (getVariant.status === 200) {
        console.log('   ✅ Variant retrieved:', getVariant.data.name);
        console.log('   📋 Details:', {
          use_when: getVariant.data.use_when,
          pattern: getVariant.data.pattern_name
        });
      } else {
        console.log('   ❌ Error:', getVariant.data);
      }
      
      // Test 4: Update variant
      console.log('\n4. Testing PUT /api/variants/:id');
      const updateData = {
        name: 'Updated Test Variant',
        use_when: 'When testing updated functionality',
        notes: 'Updated notes for testing'
      };
      const updateVariant = await makeRequest(`/variants/${variantId}`, 'PUT', updateData);
      console.log('   Status:', updateVariant.status);
      if (updateVariant.status === 200) {
        console.log('   ✅ Variant updated:', updateVariant.data.name);
      } else {
        console.log('   ❌ Error:', updateVariant.data);
      }
      
      // Test 5: Get variants filtered by pattern
      console.log('\n5. Testing GET /api/variants?pattern_id=' + patternId);
      const filteredVariants = await makeRequest(`/variants?pattern_id=${patternId}`);
      console.log('   Status:', filteredVariants.status);
      if (filteredVariants.status === 200) {
        console.log('   ✅ Filtered variants:', filteredVariants.data.length, 'items');
      } else {
        console.log('   ❌ Error:', filteredVariants.data);
      }
      
      // Test 6: Delete variant
      console.log('\n6. Testing DELETE /api/variants/:id');
      const deleteVariant = await makeRequest(`/variants/${variantId}`, 'DELETE');
      console.log('   Status:', deleteVariant.status);
      if (deleteVariant.status === 200) {
        console.log('   ✅ Variant deleted:', deleteVariant.data.deleted.name);
      } else {
        console.log('   ❌ Error:', deleteVariant.data);
      }
      
    } else {
      console.log('   ❌ Error creating variant:', createVariant.data);
    }
    
    // Test 7: Test validation
    console.log('\n7. Testing validation (missing name)');
    const invalidVariant = { use_when: 'No name provided' };
    const invalidCreate = await makeRequest('/variants', 'POST', invalidVariant);
    console.log('   Status:', invalidCreate.status);
    if (invalidCreate.status === 400) {
      console.log('   ✅ Validation error handled:', invalidCreate.data.error);
    } else {
      console.log('   ❌ Unexpected response:', invalidCreate.data);
    }
    
    // Test 8: Test getting variants for a pattern (using pattern endpoint)
    console.log('\n8. Testing GET /api/patterns/:id/variants');
    const patternVariants = await makeRequest(`/patterns/${patternId}/variants`);
    console.log('   Status:', patternVariants.status);
    if (patternVariants.status === 200) {
      console.log('   ✅ Pattern variants:', patternVariants.data.length, 'items');
    } else {
      console.log('   ❌ Error:', patternVariants.data);
    }
    
    console.log('\n✅ All variant endpoint tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVariantEndpoints();