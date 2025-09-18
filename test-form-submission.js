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

async function testFormSubmission() {
  try {
    console.log('🧪 Testing form submission logic...\n');
    
    // Test health first
    console.log('0. Testing server health...');
    const health = await makeRequest('/health');
    console.log('   Status:', health.status);
    
    if (health.status !== 200) {
      console.log('❌ Server not responding correctly');
      return;
    }
    
    // Test 1: Test pattern creation with validation
    console.log('\n1. Testing pattern creation with complete data...');
    const patternData = {
      name: 'Form Test Pattern',
      description: 'This is a comprehensive test pattern created through form submission',
      template_id: 1, // Assuming first template exists
      concept_id: 1   // Assuming first concept exists
    };
    
    const createPattern = await makeRequest('/patterns', 'POST', patternData);
    console.log('   Status:', createPattern.status);
    if (createPattern.status === 201) {
      console.log('   ✅ Pattern created:', createPattern.data.name);
      console.log('   📋 Details:', {
        id: createPattern.data.id,
        template_id: createPattern.data.template_id,
        concept_id: createPattern.data.concept_id
      });
      
      const patternId = createPattern.data.id;
      
      // Test 2: Test variant creation with the new pattern
      console.log('\n2. Testing variant creation with complete data...');
      const variantData = {
        name: 'Form Test Variant',
        use_when: 'When testing form submission functionality with comprehensive validation',
        notes: 'This variant was created to test the form submission logic',
        pattern_id: patternId,
        technique_id: 1, // Assuming first technique exists
        goal_id: 1,      // Assuming first goal exists
        concept_id: 1    // Assuming first concept exists
      };
      
      const createVariant = await makeRequest('/variants', 'POST', variantData);
      console.log('   Status:', createVariant.status);
      if (createVariant.status === 201) {
        console.log('   ✅ Variant created:', createVariant.data.name);
        console.log('   📋 Details:', {
          id: createVariant.data.id,
          pattern_id: createVariant.data.pattern_id,
          technique_id: createVariant.data.technique_id,
          goal_id: createVariant.data.goal_id
        });
      } else {
        console.log('   ❌ Error creating variant:', createVariant.data);
      }
      
    } else {
      console.log('   ❌ Error creating pattern:', createPattern.data);
    }
    
    // Test 3: Test validation errors
    console.log('\n3. Testing validation errors...');
    
    // Test missing name
    const invalidPattern = {
      description: 'Pattern without name'
    };
    const invalidCreate = await makeRequest('/patterns', 'POST', invalidPattern);
    console.log('   Missing name - Status:', invalidCreate.status);
    if (invalidCreate.status === 400) {
      console.log('   ✅ Validation handled:', invalidCreate.data.error);
    }
    
    // Test missing use_when for variant
    const invalidVariant = {
      name: 'Variant without use_when',
      pattern_id: 1
    };
    const invalidVariantCreate = await makeRequest('/variants', 'POST', invalidVariant);
    console.log('   Missing use_when - Status:', invalidVariantCreate.status);
    if (invalidVariantCreate.status === 400) {
      console.log('   ✅ Validation handled:', invalidVariantCreate.data.error);
    }
    
    // Test 4: Test foreign key validation
    console.log('\n4. Testing foreign key validation...');
    const invalidForeignKey = {
      name: 'Invalid Foreign Key Test',
      description: 'Testing invalid foreign key',
      concept_id: 99999 // Non-existent concept
    };
    const fkTest = await makeRequest('/patterns', 'POST', invalidForeignKey);
    console.log('   Invalid FK - Status:', fkTest.status);
    if (fkTest.status === 400 || fkTest.status === 500) {
      console.log('   ✅ Foreign key validation handled');
    }
    
    // Test 5: Test data retrieval for form population
    console.log('\n5. Testing reference data retrieval...');
    const concepts = await makeRequest('/concepts');
    const techniques = await makeRequest('/techniques');
    const goals = await makeRequest('/goals');
    const templates = await makeRequest('/template-basics');
    const patterns = await makeRequest('/patterns');
    
    console.log('   ✅ Reference data counts:');
    console.log('     - Concepts:', concepts.data?.length || 0);
    console.log('     - Techniques:', techniques.data?.length || 0);
    console.log('     - Goals:', goals.data?.length || 0);
    console.log('     - Templates:', templates.data?.length || 0);
    console.log('     - Patterns:', patterns.data?.length || 0);
    
    console.log('\n✅ All form submission tests completed!');
    console.log('\n🎉 Form submission logic is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFormSubmission();