// Verification script to check if NovelNotesTab integration is working
// Run this in the browser console on the main application

console.log('🔍 Verifying NovelNotesTab Integration...\n');

// Check 1: React and ReactDOM
console.log('📋 Checking Dependencies:');
if (typeof React !== 'undefined') {
    console.log('✅ React is loaded');
} else {
    console.error('❌ React is not loaded');
}

if (typeof ReactDOM !== 'undefined') {
    console.log('✅ ReactDOM is loaded');
} else {
    console.error('❌ ReactDOM is not loaded');
}

// Check 2: Novel integration functions
console.log('\n📋 Checking Novel Integration Functions:');
const requiredFunctions = [
    'mountNovelNotesTab',
    'unmountNovelNotesTab',
    'updateNovelNotesTabProblem'
];

requiredFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} is available`);
    } else {
        console.error(`❌ ${funcName} is not available`);
    }
});

// Check 3: Application integration
console.log('\n📋 Checking Application Integration:');
if (typeof window.loadNoteForProblem === 'function') {
    console.log('✅ loadNoteForProblem function exists');
} else {
    console.error('❌ loadNoteForProblem function not found');
}

if (typeof window.selectProblem === 'function') {
    console.log('✅ selectProblem function exists');
} else {
    console.error('❌ selectProblem function not found');
}

// Check 4: Container elements
console.log('\n📋 Checking Container Elements:');
const notesTab = document.getElementById('notes-tab');
if (notesTab) {
    console.log('✅ notes-tab container found');
} else {
    console.error('❌ notes-tab container not found');
}

const notesEditor = document.getElementById('notesEditor');
if (notesEditor) {
    console.log('✅ notesEditor container found');
} else {
    console.error('❌ notesEditor container not found');
}

// Check 5: Test mounting (if possible)
console.log('\n📋 Testing NovelNotesTab Mounting:');
if (typeof window.mountNovelNotesTab === 'function' && notesEditor) {
    try {
        // Create a test problem
        const testProblem = {
            id: 999,
            title: "Integration Test",
            concept: "Testing",
            difficulty: "Easy",
            notes: JSON.stringify({
                type: 'doc',
                content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Integration test successful! NovelNotesTab is working.' }]
                }]
            })
        };
        
        console.log('🚀 Attempting to mount NovelNotesTab...');
        window.mountNovelNotesTab(testProblem, 'notesEditor');
        
        // Check if content was rendered
        setTimeout(() => {
            if (notesEditor.children.length > 0) {
                console.log('✅ NovelNotesTab mounted and rendered content');
                console.log('🎉 Integration test PASSED - NovelNotesTab is working!');
            } else {
                console.warn('⚠️ NovelNotesTab mounted but no content rendered');
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error testing NovelNotesTab mounting:', error);
    }
} else {
    console.error('❌ Cannot test mounting - missing function or container');
}

console.log('\n📊 Integration verification complete. Check the results above.');
console.log('💡 To test manually: Navigate to a problem concept, select a problem, and check if the Novel editor appears in the notes tab.');