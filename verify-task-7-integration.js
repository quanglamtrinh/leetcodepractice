// Task 7 Integration Verification Script
// This script verifies that the NovelNotesTab integration is working correctly

console.log('🔍 Starting Task 7 Integration Verification...');

// Test 1: Verify React and ReactDOM are available
function testReactAvailability() {
    console.log('\n📋 Test 1: React Availability');
    
    if (typeof React !== 'undefined') {
        console.log('✅ React is loaded');
    } else {
        console.error('❌ React is not loaded');
        return false;
    }
    
    if (typeof ReactDOM !== 'undefined') {
        console.log('✅ ReactDOM is loaded');
    } else {
        console.error('❌ ReactDOM is not loaded');
        return false;
    }
    
    return true;
}

// Test 2: Verify Novel Notes Integration functions are available
function testNovelIntegrationFunctions() {
    console.log('\n📋 Test 2: Novel Integration Functions');
    
    const requiredFunctions = [
        'mountNovelNotesTab',
        'unmountNovelNotesTab',
        'updateNovelNotesTabProblem'
    ];
    
    let allAvailable = true;
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} is available`);
        } else {
            console.error(`❌ ${funcName} is not available`);
            allAvailable = false;
        }
    });
    
    return allAvailable;
}

// Test 3: Verify backward compatibility functions
function testBackwardCompatibility() {
    console.log('\n📋 Test 3: Backward Compatibility');
    
    const backwardCompatFunctions = [
        'mountEnhancedNotesTab',
        'unmountEnhancedNotesTab',
        'updateEnhancedNotesTabProblem'
    ];
    
    let allAvailable = true;
    
    backwardCompatFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} is available (backward compatibility)`);
        } else {
            console.error(`❌ ${funcName} is not available`);
            allAvailable = false;
        }
    });
    
    return allAvailable;
}

// Test 4: Test NovelNotesTab mounting
function testNovelNotesTabMounting() {
    console.log('\n📋 Test 4: NovelNotesTab Mounting');
    
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-notes-container';
    testContainer.style.display = 'none'; // Hide it
    document.body.appendChild(testContainer);
    
    // Mock problem data
    const mockProblem = {
        id: 999,
        title: "Test Problem",
        concept: "Testing",
        difficulty: "Easy",
        notes: JSON.stringify({
            type: 'doc',
            content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Test notes content' }]
            }]
        })
    };
    
    try {
        // Test mounting
        window.mountNovelNotesTab(mockProblem, 'test-notes-container');
        console.log('✅ NovelNotesTab mounted successfully');
        
        // Check if content was rendered
        setTimeout(() => {
            if (testContainer.children.length > 0) {
                console.log('✅ NovelNotesTab rendered content');
            } else {
                console.warn('⚠️ NovelNotesTab mounted but no content rendered yet');
            }
            
            // Clean up
            try {
                window.unmountNovelNotesTab();
                document.body.removeChild(testContainer);
                console.log('✅ NovelNotesTab unmounted and cleaned up');
            } catch (cleanupError) {
                console.warn('⚠️ Cleanup warning:', cleanupError.message);
            }
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('❌ NovelNotesTab mounting failed:', error.message);
        // Clean up on error
        try {
            document.body.removeChild(testContainer);
        } catch (e) {
            // Ignore cleanup errors
        }
        return false;
    }
}

// Test 5: Verify integration with existing script.js logic
function testScriptIntegration() {
    console.log('\n📋 Test 5: Script.js Integration');
    
    // Check if loadNoteForProblem function exists
    if (typeof window.loadNoteForProblem === 'function') {
        console.log('✅ loadNoteForProblem function exists');
    } else {
        console.error('❌ loadNoteForProblem function not found');
        return false;
    }
    
    // Check if selectProblem function exists
    if (typeof window.selectProblem === 'function') {
        console.log('✅ selectProblem function exists');
    } else {
        console.error('❌ selectProblem function not found');
        return false;
    }
    
    return true;
}

// Test 6: Verify notes tab container exists
function testNotesTabContainer() {
    console.log('\n📋 Test 6: Notes Tab Container');
    
    const notesTab = document.getElementById('notes-tab');
    if (notesTab) {
        console.log('✅ Notes tab container found');
        return true;
    } else {
        console.error('❌ Notes tab container not found');
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running Task 7 Integration Tests...\n');
    
    const tests = [
        { name: 'React Availability', fn: testReactAvailability },
        { name: 'Novel Integration Functions', fn: testNovelIntegrationFunctions },
        { name: 'Backward Compatibility', fn: testBackwardCompatibility },
        { name: 'Notes Tab Container', fn: testNotesTabContainer },
        { name: 'Script Integration', fn: testScriptIntegration },
        { name: 'NovelNotesTab Mounting', fn: testNovelNotesTabMounting }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    tests.forEach(test => {
        try {
            const result = test.fn();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            console.error(`❌ Test "${test.name}" threw an error:`, error.message);
        }
    });
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Task 7 integration is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Please check the integration.');
    }
    
    return passedTests === totalTests;
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testReactAvailability,
        testNovelIntegrationFunctions,
        testBackwardCompatibility,
        testNovelNotesTabMounting,
        testScriptIntegration,
        testNotesTabContainer
    };
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    // Wait for everything to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runAllTests, 1000);
        });
    } else {
        setTimeout(runAllTests, 1000);
    }
}