const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testReferenceEndpoints() {
  try {
    console.log('🧪 Testing reference data endpoints...\n');
    
    // Test 1: Get all concepts
    console.log('1. Testing GET /api/concepts');
    const conceptsResponse = await axios.get(`${BASE_URL}/concepts`);
    console.log('   ✅ Concepts fetched:', conceptsResponse.data.length, 'items');
    console.log('   📋 Sample concepts:', conceptsResponse.data.slice(0, 3).map(c => c.name));
    
    // Test 2: Get all techniques
    console.log('\n2. Testing GET /api/techniques');
    const techniquesResponse = await axios.get(`${BASE_URL}/techniques`);
    console.log('   ✅ Techniques fetched:', techniquesResponse.data.length, 'items');
    console.log('   📋 Sample techniques:', techniquesResponse.data.slice(0, 3).map(t => t.name));
    
    // Test 3: Get all goals
    console.log('\n3. Testing GET /api/goals');
    const goalsResponse = await axios.get(`${BASE_URL}/goals`);
    console.log('   ✅ Goals fetched:', goalsResponse.data.length, 'items');
    console.log('   📋 Sample goals:', goalsResponse.data.slice(0, 3).map(g => g.name));
    
    // Test 4: Get all template basics
    console.log('\n4. Testing GET /api/template-basics');
    const templatesResponse = await axios.get(`${BASE_URL}/template-basics`);
    console.log('   ✅ Templates fetched:', templatesResponse.data.length, 'items');
    console.log('   📋 Sample templates:', templatesResponse.data.slice(0, 2).map(t => t.description));
    
    // Test 5: Create a new concept
    console.log('\n5. Testing POST /api/concepts');
    try {
      const newConcept = {
        concept_id: 'test-concept',
        name: 'Test Concept'
      };
      const createConceptResponse = await axios.post(`${BASE_URL}/concepts`, newConcept);
      console.log('   ✅ Concept created:', createConceptResponse.data.name);
      
      // Clean up - delete the test concept
      // Note: We don't have a delete endpoint yet, so we'll leave it for now
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('   ℹ️  Test concept already exists (expected)');
      } else {
        throw error;
      }
    }
    
    // Test 6: Create a new technique
    console.log('\n6. Testing POST /api/techniques');
    try {
      const newTechnique = {
        name: 'Test Technique',
        description: 'A technique for testing purposes'
      };
      const createTechniqueResponse = await axios.post(`${BASE_URL}/techniques`, newTechnique);
      console.log('   ✅ Technique created:', createTechniqueResponse.data.name);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('   ℹ️  Test technique already exists (expected)');
      } else {
        throw error;
      }
    }
    
    // Test 7: Create a new goal
    console.log('\n7. Testing POST /api/goals');
    try {
      const newGoal = {
        name: 'Test Goal',
        description: 'A goal for testing purposes'
      };
      const createGoalResponse = await axios.post(`${BASE_URL}/goals`, newGoal);
      console.log('   ✅ Goal created:', createGoalResponse.data.name);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('   ℹ️  Test goal already exists (expected)');
      } else {
        throw error;
      }
    }
    
    // Test 8: Test validation errors
    console.log('\n8. Testing validation errors');
    try {
      await axios.post(`${BASE_URL}/concepts`, { concept_id: 'test' }); // Missing name
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ Validation error handled correctly:', error.response.data.error);
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }
    
    // Test 9: Test health endpoint
    console.log('\n9. Testing health endpoint');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Health check:', healthResponse.data.status);
    
    console.log('\n✅ All reference endpoint tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the server first with: node server.js');
    process.exit(1);
  }
  
  await testReferenceEndpoints();
}

main();