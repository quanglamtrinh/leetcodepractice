// Test Enhanced Notes Integration
// This script tests the enhanced notes tab functionality

console.log('🧪 Starting Enhanced Notes Integration Tests...');

// Test data
const testProblems = [
  {
    id: 1,
    title: "Two Sum",
    notes: "",
    solution: "",
    solved: false,
    difficulty: "Easy",
    concept: "Arrays & Hashing"
  },
  {
    id: 2,
    title: "Add Two Numbers",
    notes: '{"blocks":[{"id":1,"type":"text","content":"This is a test note with JSON format"}]}',
    solution: "",
    solved: false,
    difficulty: "Medium",
    concept: "Linked List"
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    notes: '<p>This is an <strong>HTML</strong> note for backward compatibility</p>',
    solution: "",
    solved: false,
    difficulty: "Medium",
    concept: "Sliding Window"
  }
];

// Test functions
async function testEnhancedNotesIntegration() {
  console.log('📝 Testing Enhanced Notes Integration...');
  
  // Test 1: Check if functions are available
  console.log('🔍 Test 1: Checking if integration functions are available...');
  if (typeof window.mountEnhancedNotesTab === 'function') {
    console.log('✅ mountEnhancedNotesTab function found');
  } else {
    console.error('❌ mountEnhancedNotesTab function not found');
    return false;
  }
  
  if (typeof window.updateEnhancedNotesTabProblem === 'function') {
    console.log('✅ updateEnhancedNotesTabProblem function found');
  } else {
    console.error('❌ updateEnhancedNotesTabProblem function not found');
    return false;
  }
  
  if (typeof window.unmountEnhancedNotesTab === 'function') {
    console.log('✅ unmountEnhancedNotesTab function found');
  } else {
    console.error('❌ unmountEnhancedNotesTab function not found');
    return false;
  }
  
  // Test 2: Mount enhanced notes tab
  console.log('🔍 Test 2: Mounting enhanced notes tab...');
  try {
    window.mountEnhancedNotesTab(testProblems[0], 'notes-tab');
    console.log('✅ Enhanced notes tab mounted successfully');
  } catch (error) {
    console.error('❌ Failed to mount enhanced notes tab:', error);
    return false;
  }
  
  // Test 3: Update problem
  console.log('🔍 Test 3: Updating problem...');
  try {
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for mount
    window.updateEnhancedNotesTabProblem(testProblems[1]);
    console.log('✅ Problem updated successfully');
  } catch (error) {
    console.error('❌ Failed to update problem:', error);
    return false;
  }
  
  // Test 4: Test backward compatibility
  console.log('🔍 Test 4: Testing backward compatibility...');
  try {
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for update
    window.updateEnhancedNotesTabProblem(testProblems[2]);
    console.log('✅ Backward compatibility test passed');
  } catch (error) {
    console.error('❌ Backward compatibility test failed:', error);
    return false;
  }
  
  // Test 5: Test API integration
  console.log('🔍 Test 5: Testing API integration...');
  try {
    const response = await fetch('/api/problems/1/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: JSON.stringify([{
          id: 1,
          type: 'text',
          content: 'Test note from integration test',
          placeholder: 'Type "/" for commands'
        }])
      })
    });
    
    if (response.ok) {
      console.log('✅ API integration test passed');
    } else {
      console.error('❌ API integration test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ API integration test failed:', error);
    return false;
  }
  
  console.log('🎉 All Enhanced Notes Integration Tests Passed!');
  return true;
}

// Test script.js integration
async function testScriptJsIntegration() {
  console.log('📜 Testing script.js integration...');
  
  // Test loadNoteForProblem function
  console.log('🔍 Testing loadNoteForProblem function...');
  if (typeof window.loadNoteForProblem === 'function') {
    console.log('✅ loadNoteForProblem function found');
    
    try {
      window.loadNoteForProblem(testProblems[0]);
      console.log('✅ loadNoteForProblem executed successfully');
    } catch (error) {
      console.error('❌ loadNoteForProblem failed:', error);
      return false;
    }
  } else {
    console.error('❌ loadNoteForProblem function not found');
    return false;
  }
  
  // Test saveNoteForProblem function
  console.log('🔍 Testing saveNoteForProblem function...');
  if (typeof window.saveNoteForProblem === 'function') {
    console.log('✅ saveNoteForProblem function found');
    
    try {
      window.saveNoteForProblem(testProblems[0]);
      console.log('✅ saveNoteForProblem executed successfully');
    } catch (error) {
      console.error('❌ saveNoteForProblem failed:', error);
      return false;
    }
  } else {
    console.error('❌ saveNoteForProblem function not found');
    return false;
  }
  
  console.log('🎉 script.js integration tests passed!');
  return true;
}

// Run tests when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

async function runTests() {
  console.log('🚀 Starting all tests...');
  
  // Wait for React and integration to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const enhancedNotesResult = await testEnhancedNotesIntegration();
  const scriptJsResult = await testScriptJsIntegration();
  
  if (enhancedNotesResult && scriptJsResult) {
    console.log('🎉 ALL TESTS PASSED! Enhanced Notes Integration is working correctly.');
  } else {
    console.error('❌ Some tests failed. Please check the implementation.');
  }
}

// Export for manual testing
window.testEnhancedNotesIntegration = testEnhancedNotesIntegration;
window.testScriptJsIntegration = testScriptJsIntegration;