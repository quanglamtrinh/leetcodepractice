// Test the notes API endpoints
console.log('🧪 Testing Notes API...');

async function testNotesAPI() {
    try {
        // First, get a list of problems to test with
        console.log('📋 Fetching problems...');
        const problemsResponse = await fetch('http://localhost:3001/api/problems');
        if (!problemsResponse.ok) {
            throw new Error(`Failed to fetch problems: ${problemsResponse.status}`);
        }
        
        const problems = await problemsResponse.json();
        console.log(`✅ Found ${problems.length} problems`);
        
        if (problems.length === 0) {
            console.log('❌ No problems found to test with');
            return;
        }
        
        // Test with the first problem
        const testProblem = problems[0];
        console.log(`🎯 Testing with problem: ${testProblem.id} - ${testProblem.title}`);
        
        // Test saving notes
        const testNotes = '<h3>API Test Notes</h3><p>This is a test note created by the API test.</p><ul><li>Test point 1</li><li>Test point 2</li></ul>';
        
        console.log('💾 Testing save notes...');
        const saveResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: testNotes
            })
        });
        
        if (saveResponse.ok) {
            console.log('✅ Notes saved successfully');
            
            // Test loading notes back
            console.log('📖 Testing load notes...');
            const loadResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}`);
            if (loadResponse.ok) {
                const updatedProblem = await loadResponse.json();
                if (updatedProblem.notes === testNotes) {
                    console.log('✅ Notes loaded successfully and match saved content');
                } else {
                    console.log('⚠️ Notes loaded but content doesn\'t match');
                    console.log('Expected:', testNotes);
                    console.log('Got:', updatedProblem.notes);
                }
            } else {
                console.log('❌ Failed to load notes:', loadResponse.status);
            }
        } else {
            console.log('❌ Failed to save notes:', saveResponse.status);
            const errorText = await saveResponse.text();
            console.log('Error details:', errorText);
        }
        
        // Test with enhanced format
        console.log('🚀 Testing enhanced format...');
        const enhancedNotes = JSON.stringify([
            { id: 1, type: 'heading', content: 'API Test Enhanced Notes' },
            { id: 2, type: 'text', content: 'This is enhanced format content.' },
            { id: 3, type: 'bullet', content: 'Enhanced bullet point' },
            { id: 4, type: 'todo', content: 'Enhanced todo item', checked: false }
        ]);
        
        const enhancedSaveResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: enhancedNotes
            })
        });
        
        if (enhancedSaveResponse.ok) {
            console.log('✅ Enhanced format notes saved successfully');
            
            // Load back and verify
            const enhancedLoadResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}`);
            if (enhancedLoadResponse.ok) {
                const enhancedProblem = await enhancedLoadResponse.json();
                try {
                    const parsed = JSON.parse(enhancedProblem.notes);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log('✅ Enhanced format notes loaded and parsed successfully');
                        console.log('Loaded blocks:', parsed.length);
                    } else {
                        console.log('⚠️ Enhanced format notes loaded but not in expected format');
                    }
                } catch (error) {
                    console.log('⚠️ Enhanced format notes loaded but failed to parse as JSON');
                }
            }
        } else {
            console.log('❌ Failed to save enhanced format notes:', enhancedSaveResponse.status);
        }
        
        console.log('🎉 API test completed');
        
    } catch (error) {
        console.error('❌ API test failed:', error);
    }
}

// Run the test
testNotesAPI();