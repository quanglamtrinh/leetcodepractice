// Debug script to check integration status
console.log('🔍 Debug: Checking integration status...');

// Check if React is loaded
console.log('React available:', typeof React !== 'undefined');
console.log('ReactDOM available:', typeof ReactDOM !== 'undefined');

// Check if Novel integration functions are available
const functions = [
    'mountNovelNotesTab',
    'unmountNovelNotesTab', 
    'updateNovelNotesTabProblem'
];

functions.forEach(funcName => {
    const available = typeof window[funcName] === 'function';
    console.log(`${funcName} available:`, available);
    if (available) {
        console.log(`${funcName} function:`, window[funcName]);
    }
});

// Check if loadNoteForProblem exists
console.log('loadNoteForProblem available:', typeof window.loadNoteForProblem === 'function');

// Test the integration check
if (window.mountNovelNotesTab) {
    console.log('✅ Novel integration check would PASS');
} else {
    console.log('❌ Novel integration check would FAIL - falling back to original editor');
}

// Check what's in the window object related to novel
const novelKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('novel') || 
    key.toLowerCase().includes('mount') ||
    key.toLowerCase().includes('enhanced')
);
console.log('Novel-related window properties:', novelKeys);

// Check if there's a NovelNotesIntegration object
if (window.NovelNotesIntegration) {
    console.log('NovelNotesIntegration object found:', window.NovelNotesIntegration);
    console.log('NovelNotesIntegration keys:', Object.keys(window.NovelNotesIntegration));
}