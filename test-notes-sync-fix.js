// Test script to verify notes synchronization fix
// Run this in the browser console to test the fix

console.log('🧪 Testing Notes Synchronization Fix');

// Function to simulate problem switching
function testProblemSwitching() {
  console.log('📋 Test: Switching between problems');
  
  // Get the current problem from the debug info
  const debugInfo = document.querySelector('[style*="fontSize: 12px"][style*="color: #666"]');
  if (debugInfo) {
    const debugText = debugInfo.textContent;
    console.log('Current debug info:', debugText);
    
    // Extract problem info
    const problemIdMatch = debugText.match(/Problem ID = (\d+)/);
    const problemTitleMatch = debugText.match(/Problem Title = ([^,]+)/);
    
    if (problemIdMatch && problemTitleMatch) {
      const currentProblemId = problemIdMatch[1];
      const currentProblemTitle = problemTitleMatch[1];
      
      console.log(`Current problem: ${currentProblemTitle} (ID: ${currentProblemId})`);
      
      // Check if the content matches the problem
      const notesContent = document.querySelector('.novel-editor-container');
      if (notesContent) {
        const contentText = notesContent.textContent;
        console.log('Notes content preview:', contentText.substring(0, 100) + '...');
        
        // Check if content seems to match the problem
        const contentMatches = contentText.toLowerCase().includes(currentProblemTitle.toLowerCase()) ||
                              contentText.includes(currentProblemId);
        
        if (contentMatches) {
          console.log('✅ Content appears to match the selected problem');
        } else {
          console.log('❌ Content does not match the selected problem');
          console.log('Expected content related to:', currentProblemTitle);
          console.log('Actual content preview:', contentText.substring(0, 200));
        }
      }
    }
  }
}

// Function to check console logs for synchronization issues
function checkConsoleLogs() {
  console.log('🔍 Checking console logs for synchronization issues');
  
  // Look for specific log patterns
  const logs = [];
  
  // This would need to be run in the actual browser console
  // to access the console history
  console.log('Note: Run this in the browser console to check actual log history');
}

// Function to test the fix
function runSyncTest() {
  console.log('🚀 Running Notes Synchronization Test');
  
  // Test 1: Check current state
  testProblemSwitching();
  
  // Test 2: Check console logs
  checkConsoleLogs();
  
  console.log('📝 Test completed. Check the results above.');
  console.log('💡 If you see "❌ Content does not match", the fix needs more work.');
  console.log('💡 If you see "✅ Content appears to match", the fix is working!');
}

// Export the test function
window.testNotesSync = runSyncTest;

console.log('✅ Test script loaded. Run testNotesSync() to test the fix.');
