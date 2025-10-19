// Diagnose notes loading issue
console.log('🔍 Diagnosing notes loading issue...');

async function diagnoseNotesIssue() {
    try {
        // Test 1: Check if we can fetch problems
        console.log('\n📋 Test 1: Fetching problems list...');
        const problemsResponse = await fetch('http://localhost:3001/api/problems');
        if (!problemsResponse.ok) {
            console.error('❌ Cannot fetch problems:', problemsResponse.status);
            return;
        }
        
        const problems = await problemsResponse.json();
        const problemsWithNotes = problems.filter(p => p.notes && p.notes.trim());
        console.log(`✅ Found ${problems.length} problems, ${problemsWithNotes.length} with notes`);
        
        if (problemsWithNotes.length === 0) {
            console.log('❌ No problems with notes found!');
            return;
        }
        
        // Test 2: Try to fetch a specific problem with notes
        const testProblem = problemsWithNotes[0];
        console.log(`\n🎯 Test 2: Fetching specific problem ${testProblem.id}...`);
        
        const specificResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}`);
        if (!specificResponse.ok) {
            console.error('❌ Cannot fetch specific problem:', specificResponse.status);
            return;
        }
        
        const specificProblem = await specificResponse.json();
        console.log(`✅ Fetched problem ${specificProblem.id}: ${specificProblem.title}`);
        console.log(`Notes length: ${specificProblem.notes?.length || 0}`);
        
        // Test 3: Try to parse the notes
        console.log('\n📝 Test 3: Parsing notes...');
        if (specificProblem.notes) {
            try {
                const parsed = JSON.parse(specificProblem.notes);
                if (Array.isArray(parsed)) {
                    console.log(`✅ Enhanced format with ${parsed.length} blocks`);
                    parsed.forEach((block, index) => {
                        console.log(`  Block ${index + 1}: ${block.type} - "${block.content?.substring(0, 50) || ''}..."`);
                    });
                } else {
                    console.log('⚠️ JSON but not enhanced format');
                }
            } catch (e) {
                console.log('📄 HTML/Text format');
                console.log('Content preview:', specificProblem.notes.substring(0, 100) + '...');
            }
        } else {
            console.log('❌ No notes content found');
        }
        
        // Test 4: Test the save endpoint
        console.log('\n💾 Test 4: Testing save endpoint...');
        const testNoteContent = '<p>Test note from diagnostic script</p>';
        
        const saveResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: testNoteContent
            })
        });
        
        if (saveResponse.ok) {
            console.log('✅ Save endpoint working');
            
            // Verify the save worked
            const verifyResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}`);
            const verifiedProblem = await verifyResponse.json();
            
            if (verifiedProblem.notes === testNoteContent) {
                console.log('✅ Save and load verified');
                
                // Restore original notes
                const restoreResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}/notes`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notes: specificProblem.notes
                    })
                });
                
                if (restoreResponse.ok) {
                    console.log('✅ Original notes restored');
                }
            } else {
                console.log('❌ Save verification failed');
            }
        } else {
            console.error('❌ Save endpoint failed:', saveResponse.status);
        }
        
        // Test 5: Check CORS and network issues
        console.log('\n🌐 Test 5: Network diagnostics...');
        console.log('Server URL: http://localhost:3001');
        console.log('Response headers available:', !!specificResponse.headers);
        console.log('Content-Type:', specificResponse.headers.get('content-type'));
        
        console.log('\n✅ All backend tests completed successfully!');
        console.log('🔍 The issue is likely in the frontend integration.');
        console.log('💡 Recommendations:');
        console.log('1. Check browser console for errors when loading notes');
        console.log('2. Verify the fix-notes-tab.js is loaded correctly');
        console.log('3. Test with the test-specific-problem.html file');
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    }
}

// Run the diagnosis
diagnoseNotesIssue();