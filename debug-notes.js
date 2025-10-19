// Debug script to test enhanced notes integration
console.log('🔍 Debug: Checking enhanced notes integration...');

// Check if all required functions are available
function checkIntegration() {
    console.log('📋 Integration Status:');
    console.log('- React:', typeof React !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- ReactDOM:', typeof ReactDOM !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- mountEnhancedNotesTab:', typeof window.mountEnhancedNotesTab !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- updateEnhancedNotesTabProblem:', typeof window.updateEnhancedNotesTabProblem !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- initEnhancedNotesEditor:', typeof window.initEnhancedNotesEditor !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- loadEnhancedNotes:', typeof window.loadEnhancedNotes !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- getEnhancedNotes:', typeof window.getEnhancedNotes !== 'undefined' ? '✅ Available' : '❌ Missing');
}

// Test mounting enhanced notes
function testEnhancedNotes() {
    console.log('🧪 Testing enhanced notes...');
    
    const testProblem = {
        id: 1,
        title: 'Test Problem',
        notes: JSON.stringify([
            { id: 1, type: 'heading', content: 'Enhanced Notes Test' },
            { id: 2, type: 'text', content: 'This is a test of the enhanced notes editor.' },
            { id: 3, type: 'bullet', content: 'Feature 1: Slash commands' },
            { id: 4, type: 'bullet', content: 'Feature 2: Auto-save' },
            { id: 5, type: 'todo', content: 'Test todo item', checked: false }
        ])
    };
    
    // Find notes tab container
    const notesTab = document.getElementById('notes-tab');
    if (!notesTab) {
        console.error('❌ Notes tab container not found');
        return;
    }
    
    console.log('✅ Notes tab container found');
    
    if (window.mountEnhancedNotesTab) {
        console.log('🚀 Mounting enhanced notes tab...');
        window.mountEnhancedNotesTab(testProblem, 'notes-tab');
        console.log('✅ Enhanced notes tab mounted');
    } else {
        console.error('❌ mountEnhancedNotesTab function not available');
    }
}

// Run checks
setTimeout(() => {
    checkIntegration();
    
    // Wait a bit more then test
    setTimeout(() => {
        testEnhancedNotes();
    }, 1000);
}, 2000);

// Make functions available globally for manual testing
window.debugNotes = {
    checkIntegration,
    testEnhancedNotes
};