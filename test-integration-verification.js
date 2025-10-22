// Test script to verify Novel Notes Integration
console.log('🔍 Testing Novel Notes Integration...');

// Test 1: Check if React is loaded
if (typeof React !== 'undefined') {
    console.log('✅ React is loaded');
} else {
    console.error('❌ React is not loaded');
}

// Test 2: Check if ReactDOM is loaded
if (typeof ReactDOM !== 'undefined') {
    console.log('✅ ReactDOM is loaded');
} else {
    console.error('❌ ReactDOM is not loaded');
}

// Test 3: Check if Novel Notes Integration functions are available
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

// Test 4: Check backward compatibility functions
const backwardCompatFunctions = [
    'mountEnhancedNotesTab',
    'unmountEnhancedNotesTab',
    'updateEnhancedNotesTabProblem'
];

backwardCompatFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} (backward compatibility) is available`);
    } else {
        console.error(`❌ ${funcName} (backward compatibility) is not available`);
    }
});

// Test 5: Check if notes tab container exists
const notesTab = document.getElementById('notes-tab');
if (notesTab) {
    console.log('✅ Notes tab container found');
} else {
    console.error('❌ Notes tab container not found');
}

// Test 6: Test mounting a simple problem
const testProblem = {
    id: 999,
    title: "Test Problem",
    difficulty: "Easy",
    concept: "Testing",
    notes: "",
    solution: "",
    solved: false,
    leetcode_link: "https://leetcode.com/problems/test/"
};

try {
    if (window.mountNovelNotesTab && notesTab) {
        console.log('🚀 Testing Novel Notes Tab mounting...');
        window.mountNovelNotesTab(testProblem, 'notes-tab');
        
        // Check if something was rendered
        setTimeout(() => {
            if (notesTab.children.length > 0) {
                console.log('✅ Novel Notes Tab mounted successfully');
                console.log('📝 Rendered content:', notesTab.innerHTML.substring(0, 100) + '...');
            } else {
                console.error('❌ Novel Notes Tab did not render any content');
            }
        }, 500);
    }
} catch (error) {
    console.error('❌ Error testing Novel Notes Tab:', error);
}

console.log('🔍 Integration test completed. Check the console for results.');