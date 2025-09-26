const http = require('http');

async function testHttpEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
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
        } catch (err) {
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

async function testAssociationEndpoints() {
  console.log('🧪 Testing problem-pattern-variant association endpoints...');
  
  try {
    // First, get some test data
    console.log('\n📊 Getting test data...');
    
    const problems = await testHttpEndpoint('/api/problems');
    const patterns = await testHttpEndpoint('/api/patterns');
    const variants = await testHttpEndpoint('/api/variants');
    
    console.log(`   ✓ Found ${problems.data?.length || 0} problems`);
    console.log(`   ✓ Found ${patterns.data?.length || 0} patterns`);
    console.log(`   ✓ Found ${variants.data?.length || 0} variants`);
    
    if (!problems.data?.length || !patterns.data?.length) {
      console.log('❌ Need problems and patterns to test associations');
      return;
    }
    
    const testProblem = problems.data[0];
    const testPattern = patterns.data[0];
    const testVariant = variants.data?.find(v => v.pattern_id === testPattern.id);
    
    console.log(`   Using problem: "${testProblem.title}" (ID: ${testProblem.id})`);
    console.log(`   Using pattern: "${testPattern.name}" (ID: ${testPattern.id})`);
    if (testVariant) {
      console.log(`   Using variant: "${testVariant.name}" (ID: ${testVariant.id})`);
    }
    
    // Test GET /api/problems/:id/associations (should be empty initially)
    console.log('\n📋 Testing GET /api/problems/:id/associations:');
    const initialAssociations = await testHttpEndpoint(`/api/problems/${testProblem.id}/associations`);
    console.log(`   Status: ${initialAssociations.status}`);
    if (initialAssociations.status === 200) {
      console.log(`   ✓ Found ${initialAssociations.data.length} existing associations`);
    }
    
    // Test POST /api/problems/:id/associations
    console.log('\n➕ Testing POST /api/problems/:id/associations:');
    const newAssociation = await testHttpEndpoint(`/api/problems/${testProblem.id}/associations`, 'POST', {
      pattern_id: testPattern.id,
      variant_id: testVariant?.id,
      scenario_notes: 'Use this pattern when the array is sorted and you need to find a target',
      application_notes: 'Remember to handle edge cases at array boundaries',
      is_primary: true
    });
    
    console.log(`   Status: ${newAssociation.status}`);
    if (newAssociation.status === 201) {
      console.log(`   ✅ Created association: ${newAssociation.data.pattern_name}${testVariant ? ` (${newAssociation.data.variant_name})` : ''}`);
      console.log(`   Association ID: ${newAssociation.data.id}`);
      
      // Test GET associations again (should now have 1)
      console.log('\n📋 Testing GET associations after creation:');
      const updatedAssociations = await testHttpEndpoint(`/api/problems/${testProblem.id}/associations`);
      console.log(`   Status: ${updatedAssociations.status}`);
      if (updatedAssociations.status === 200) {
        console.log(`   ✓ Found ${updatedAssociations.data.length} associations`);
        updatedAssociations.data.forEach(assoc => {
          console.log(`     - ${assoc.pattern_name}${assoc.variant_name ? ` (${assoc.variant_name})` : ''}`);
          console.log(`       Scenario: ${assoc.scenario_notes || 'No notes'}`);
        });
      }
      
      // Test PUT /api/associations/:id
      console.log('\n✏️  Testing PUT /api/associations/:id:');
      const updatedAssociation = await testHttpEndpoint(`/api/associations/${newAssociation.data.id}`, 'PUT', {
        pattern_id: testPattern.id,
        variant_id: testVariant?.id,
        scenario_notes: 'Updated: Use this pattern for binary search problems',
        application_notes: 'Updated: Always check for empty arrays first',
        is_primary: true
      });
      
      console.log(`   Status: ${updatedAssociation.status}`);
      if (updatedAssociation.status === 200) {
        console.log(`   ✅ Updated association successfully`);
        console.log(`   Updated scenario: ${updatedAssociation.data.scenario_notes}`);
      }
      
      // Test GET /api/patterns/:id/variants-for-association
      console.log('\n🔄 Testing GET /api/patterns/:id/variants-for-association:');
      const patternVariants = await testHttpEndpoint(`/api/patterns/${testPattern.id}/variants-for-association`);
      console.log(`   Status: ${patternVariants.status}`);
      if (patternVariants.status === 200) {
        console.log(`   ✓ Found ${patternVariants.data.length} variants for pattern`);
        patternVariants.data.forEach(variant => {
          console.log(`     - ${variant.name}: ${variant.use_when || 'No use case specified'}`);
        });
      }
      
      // Test DELETE /api/associations/:id
      console.log('\n🗑️  Testing DELETE /api/associations/:id:');
      const deleteResult = await testHttpEndpoint(`/api/associations/${newAssociation.data.id}`, 'DELETE');
      console.log(`   Status: ${deleteResult.status}`);
      if (deleteResult.status === 200) {
        console.log(`   ✅ Deleted association successfully`);
      }
      
    } else {
      console.log(`   ❌ Failed to create association: ${JSON.stringify(newAssociation.data)}`);
    }
    
    // Test GET /api/associations/summary
    console.log('\n📊 Testing GET /api/associations/summary:');
    const summary = await testHttpEndpoint('/api/associations/summary');
    console.log(`   Status: ${summary.status}`);
    if (summary.status === 200) {
      console.log(`   ✓ Association summary:`);
      console.log(`     - Total associations: ${summary.data.summary.total_associations}`);
      console.log(`     - Problems with associations: ${summary.data.summary.problems_with_associations}`);
      console.log(`     - Unique patterns used: ${summary.data.summary.unique_patterns_used}`);
      console.log(`     - Top patterns: ${summary.data.top_patterns.slice(0, 3).map(p => `${p.pattern_name} (${p.usage_count})`).join(', ')}`);
    }
    
    console.log('\n🎉 Association endpoint testing completed!');

  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start the server first:');
      console.log('   npm run dev  or  node server.js');
    } else {
      console.error('❌ Test error:', err.message);
    }
  }
}

testAssociationEndpoints();