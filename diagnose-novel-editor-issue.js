// Diagnostic script for Novel editor rendering issue
console.log('🔍 Diagnosing Novel Editor Issue...');

function diagnoseNovelEditorIssue() {
    console.log('\n=== NOVEL EDITOR DIAGNOSTIC ===\n');

    // 1. Check if Novel dependencies are loaded
    console.log('1. Checking Novel dependencies...');
    const novelDeps = {
        React: typeof React !== 'undefined',
        ReactDOM: typeof ReactDOM !== 'undefined',
        NovelEditor: typeof window.NovelEditor !== 'undefined',
        // Check if Novel components are available in global scope
        EditorRoot: typeof window.EditorRoot !== 'undefined',
        EditorContent: typeof window.EditorContent !== 'undefined'
    };
    
    Object.entries(novelDeps).forEach(([dep, available]) => {
        console.log(`  ${available ? '✅' : '❌'} ${dep}: ${available}`);
    });

    // 2. Check if novel-notes-integration.js is loaded
    console.log('\n2. Checking integration script...');
    const integrationLoaded = typeof window.mountNovelNotesTab === 'function';
    console.log(`  ${integrationLoaded ? '✅' : '❌'} Integration script loaded: ${integrationLoaded}`);

    // 3. Check container state
    console.log('\n3. Checking container state...');
    const notesTab = document.getElementById('notes-tab');
    if (notesTab) {
        const containerState = {
            exists: true,
            display: window.getComputedStyle(notesTab).display,
            visibility: window.getComputedStyle(notesTab).visibility,
            height: window.getComputedStyle(notesTab).height,
            width: window.getComputedStyle(notesTab).width,
            classes: notesTab.className,
            childrenCount: notesTab.children.length,
            innerHTML: notesTab.innerHTML.substring(0, 200) + '...'
        };
        
        console.log('  Container state:', containerState);
        
        // Check if there are any React components rendered
        const hasReactRoot = notesTab.querySelector('[data-reactroot]') !== null;
        const hasReactContent = notesTab.innerHTML.includes('react') || notesTab.innerHTML.includes('React');
        console.log(`  ${hasReactRoot ? '✅' : '❌'} Has React root: ${hasReactRoot}`);
        console.log(`  ${hasReactContent ? '✅' : '❌'} Has React content: ${hasReactContent}`);
        
    } else {
        console.log('  ❌ Container not found');
    }

    // 4. Check for JavaScript errors
    console.log('\n4. Checking for errors...');
    
    // Set up error listener
    const originalError = window.onerror;
    const errors = [];
    
    window.onerror = function(message, source, lineno, colno, error) {
        errors.push({ message, source, lineno, colno, error });
        if (originalError) originalError.apply(this, arguments);
    };

    // 5. Try to mount a test component
    console.log('\n5. Testing component mounting...');
    
    if (notesTab && integrationLoaded) {
        const testProblem = {
            id: 999,
            title: 'Diagnostic Test Problem',
            difficulty: 'Easy',
            notes: JSON.stringify({
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Diagnostic test content' }]
                    }
                ]
            })
        };

        console.log('  Attempting to mount test component...');
        
        try {
            window.mountNovelNotesTab(testProblem, 'notes-tab');
            console.log('  ✅ Mount function executed without error');
            
            // Check after a delay
            setTimeout(() => {
                console.log('\n6. Post-mount analysis...');
                
                const postMountState = {
                    childrenCount: notesTab.children.length,
                    hasContent: notesTab.textContent.length > 0,
                    display: window.getComputedStyle(notesTab).display,
                    innerHTML: notesTab.innerHTML.substring(0, 300) + '...'
                };
                
                console.log('  Post-mount state:', postMountState);
                
                // Check for specific Novel editor elements
                const novelElements = {
                    proseMirror: notesTab.querySelector('.ProseMirror') !== null,
                    novelEditor: notesTab.querySelector('.novel-editor') !== null,
                    editorContent: notesTab.querySelector('[data-editor]') !== null,
                    anyEditor: notesTab.querySelector('[contenteditable]') !== null
                };
                
                console.log('  Novel editor elements:', novelElements);
                
                // Check for error messages in content
                const hasErrorContent = notesTab.textContent.includes('error') || 
                                      notesTab.textContent.includes('failed') ||
                                      notesTab.textContent.includes('unavailable');
                console.log(`  ${hasErrorContent ? '⚠️' : '✅'} Has error content: ${hasErrorContent}`);
                
                // Final diagnosis
                console.log('\n=== DIAGNOSIS SUMMARY ===');
                
                if (novelElements.proseMirror || novelElements.novelEditor) {
                    console.log('✅ Novel editor elements found - editor should be working');
                } else if (postMountState.hasContent && postMountState.childrenCount > 0) {
                    console.log('⚠️ React component mounted but Novel editor not initialized');
                    console.log('💡 Possible causes:');
                    console.log('   - Novel dependencies not loaded correctly');
                    console.log('   - CSS preventing editor display');
                    console.log('   - Editor initialization error');
                } else {
                    console.log('❌ Component not mounting properly');
                    console.log('💡 Possible causes:');
                    console.log('   - React rendering error');
                    console.log('   - Container display issues');
                    console.log('   - Integration script problems');
                }
                
                if (errors.length > 0) {
                    console.log('\n❌ JavaScript errors detected:');
                    errors.forEach((error, index) => {
                        console.log(`  ${index + 1}. ${error.message} (${error.source}:${error.lineno})`);
                    });
                }
                
                // Restore original error handler
                window.onerror = originalError;
                
            }, 1000);
            
        } catch (error) {
            console.log('  ❌ Mount function failed:', error);
        }
    } else {
        console.log('  ❌ Cannot test mounting - missing container or integration');
    }
}

// Run diagnosis
diagnoseNovelEditorIssue();

// Make available globally
window.diagnoseNovelEditorIssue = diagnoseNovelEditorIssue;