// Verification script for notes tab display fix
console.log('🔍 Verifying Notes Tab Display Fix...');

function verifyNotesTabFix() {
    const results = {
        containerExists: false,
        containerVisible: false,
        integrationAvailable: false,
        cssLoaded: false,
        mountingWorks: false,
        contentDisplays: false
    };

    try {
        // 1. Check if notes-tab container exists
        const notesTab = document.getElementById('notes-tab');
        results.containerExists = !!notesTab;
        console.log('✓ Container exists:', results.containerExists);

        if (notesTab) {
            // 2. Check if container is visible
            const computedStyle = window.getComputedStyle(notesTab);
            results.containerVisible = computedStyle.display !== 'none';
            console.log('✓ Container visible:', results.containerVisible, `(display: ${computedStyle.display})`);

            // 3. Check if integration functions are available
            results.integrationAvailable = typeof window.mountNovelNotesTab === 'function';
            console.log('✓ Integration available:', results.integrationAvailable);

            // 4. Check if CSS is loaded
            const testElement = document.createElement('div');
            testElement.className = 'novel-notes-integration';
            testElement.style.visibility = 'hidden';
            testElement.style.position = 'absolute';
            document.body.appendChild(testElement);
            
            const testStyle = window.getComputedStyle(testElement);
            results.cssLoaded = testStyle.display === 'flex';
            document.body.removeChild(testElement);
            console.log('✓ CSS loaded:', results.cssLoaded);

            // 5. Test mounting (if integration is available)
            if (results.integrationAvailable) {
                const testProblem = {
                    id: 999,
                    title: 'Test Problem',
                    difficulty: 'Easy',
                    notes: JSON.stringify({
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: 'Test content for verification' }]
                            }
                        ]
                    })
                };

                try {
                    window.mountNovelNotesTab(testProblem, 'notes-tab');
                    results.mountingWorks = true;
                    console.log('✓ Mounting works:', results.mountingWorks);

                    // 6. Check if content displays after a delay
                    setTimeout(() => {
                        const hasContent = notesTab.children.length > 0;
                        const isVisible = window.getComputedStyle(notesTab).display !== 'none';
                        results.contentDisplays = hasContent && isVisible;
                        console.log('✓ Content displays:', results.contentDisplays);

                        // Final report
                        console.log('\n📊 Verification Results:');
                        Object.entries(results).forEach(([key, value]) => {
                            console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
                        });

                        const allPassed = Object.values(results).every(result => result === true);
                        if (allPassed) {
                            console.log('\n🎉 All checks passed! Notes tab display fix is working correctly.');
                        } else {
                            console.log('\n⚠️ Some checks failed. The fix may need additional work.');
                        }
                    }, 500);

                } catch (error) {
                    console.error('❌ Error during mounting test:', error);
                    results.mountingWorks = false;
                }
            }
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    }

    return results;
}

// Auto-run verification if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyNotesTabFix);
} else {
    verifyNotesTabFix();
}

// Make function available globally for manual testing
window.verifyNotesTabFix = verifyNotesTabFix;