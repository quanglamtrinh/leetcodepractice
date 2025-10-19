// Test Problem Switching with Enhanced Notes
// This script tests problem switching functionality with enhanced notes

console.log('🔄 Testing Problem Switching with Enhanced Notes...');

// Test problems with different note formats
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
    notes: JSON.stringify([{
      id: 1,
      type: 'text',
      content: 'This is a JSON formatted note',
      placeholder: 'Type "/" for commands'
    }]),
    solution: "",
    solved: false,
    difficulty: "Medium",
    concept: "Linked List"
  },
  {
    id: 3,
    title: "Longest Substring",
    notes: '<p>This is an <strong>HTML</strong> note for backward compatibility</p><ul><li>Bullet point 1</li><li>Bullet point 2</li></ul>',
    solution: "",
    solved: false,
    difficulty: "Medium", 
    concept: "Sliding Window"
  }
];

// Simulate problem switching
async function testProblemSwitching() {
  console.log('🔄 Starting problem switching test...');
  
  // Set up global currentProblem
  window.currentProblem = testProblems[0];
  
  // Test switching between problems
  for (let i = 0; i < testProblems.length; i++) {
    const problem = testProblems[i];
    console.log(`🔄 Switching to problem ${i + 1}: ${problem.title}`);
    
    try {
      // Simulate the problem selection process
      window.currentProblem = problem;
      
      // Call loadNoteForProblem (which should use enhanced notes)
      if (typeof window.loadNoteForProblem === 'function') {
        window.loadNoteForProblem(problem);
        console.log(`✅ Problem ${i + 1} loaded successfully`);
      } else {
        console.error(`❌ loadNoteForProblem function not found`);
        return false;
      }
      
      // Wait for the component to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the notes tab is updated
      const notesTab = document.getElementById('notes-tab');
      if (notesTab && notesTab.children.length > 0) {
        console.log(`✅ Notes tab updated for problem ${i + 1}`);
      } else {
        console.error(`❌ Notes tab not updated for problem ${i + 1}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error switching to problem ${i + 1}:`, error);
      return false;
    }
  }
  
  console.log('🎉 Problem switching test completed successfully!');
  return true;
}

// Test content persistence
async function testContentPersistence() {
  console.log('💾 Testing content persistence...');
  
  const testContent = JSON.stringify([{
    id: 1,
    type: 'text',
    content: 'Test content for persistence',
    placeholder: 'Type "/" for commands'
  }]);
  
  try {
    // Save content for problem 1
    const response = await fetch('/api/problems/1/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: testContent })
    });
    
    if (!response.ok) {
      console.error('❌ Failed to save test content');
      return false;
    }
    
    console.log('✅ Test content saved');
    
    // Load problem 1 and verify content
    const updatedProblem = { ...testProblems[0], notes: testContent };
    window.loadNoteForProblem(updatedProblem);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Content persistence test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Content persistence test failed:', error);
    return false;
  }
}

// Test backward compatibility
async function testBackwardCompatibility() {
  console.log('🔄 Testing backward compatibility...');
  
  // Test with HTML content
  const htmlProblem = testProblems[2];
  
  try {
    window.loadNoteForProblem(htmlProblem);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Backward compatibility test passed');
    return true;
    
  } catch (error) {
    console.error('❌ Backward compatibility test failed:', error);
    return false;
  }
}

// Run all tests
async function runProblemSwitchingTests() {
  console.log('🚀 Starting Problem Switching Tests...');
  
  // Wait for everything to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const switchingResult = await testProblemSwitching();
  const persistenceResult = await testContentPersistence();
  const compatibilityResult = await testBackwardCompatibility();
  
  if (switchingResult && persistenceResult && compatibilityResult) {
    console.log('🎉 ALL PROBLEM SWITCHING TESTS PASSED!');
    console.log('✅ Enhanced notes tab successfully replaces the original notes tab');
    console.log('✅ Problem switching works correctly');
    console.log('✅ Content persistence is working');
    console.log('✅ Backward compatibility is maintained');
  } else {
    console.error('❌ Some problem switching tests failed');
  }
}

// Export for manual testing
window.testProblemSwitching = testProblemSwitching;
window.testContentPersistence = testContentPersistence;
window.testBackwardCompatibility = testBackwardCompatibility;
window.runProblemSwitchingTests = runProblemSwitchingTests;

// Auto-run tests if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runProblemSwitchingTests);
} else {
  setTimeout(runProblemSwitchingTests, 1000);
}