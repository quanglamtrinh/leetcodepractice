// Check if notes data exists in the database
console.log('🔍 Checking database for notes data...');

async function checkDatabaseNotes() {
    try {
        // First, get all problems
        console.log('📋 Fetching all problems...');
        const response = await fetch('http://localhost:3001/api/problems');
        if (!response.ok) {
            throw new Error(`Failed to fetch problems: ${response.status}`);
        }
        
        const problems = await response.json();
        console.log(`✅ Found ${problems.length} total problems`);
        
        // Filter problems that have notes
        const problemsWithNotes = problems.filter(p => p.notes && p.notes.trim());
        console.log(`📝 Found ${problemsWithNotes.length} problems with notes`);
        
        if (problemsWithNotes.length === 0) {
            console.log('❌ No problems with notes found in database!');
            console.log('This might explain why notes are not displaying.');
            return;
        }
        
        // Show details of first 10 problems with notes
        console.log('\n📊 Sample problems with notes:');
        problemsWithNotes.slice(0, 10).forEach((problem, index) => {
            console.log(`${index + 1}. Problem ${problem.id}: ${problem.title}`);
            console.log(`   Notes length: ${problem.notes.length} characters`);
            console.log(`   Notes preview: ${problem.notes.substring(0, 100)}...`);
            
            // Check if it's enhanced format
            try {
                const parsed = JSON.parse(problem.notes);
                if (Array.isArray(parsed)) {
                    console.log(`   Format: Enhanced (${parsed.length} blocks)`);
                } else {
                    console.log(`   Format: JSON but not enhanced`);
                }
            } catch (e) {
                console.log(`   Format: HTML/Text`);
            }
            console.log('');
        });
        
        // Test loading a specific problem
        if (problemsWithNotes.length > 0) {
            const testProblem = problemsWithNotes[0];
            console.log(`🧪 Testing individual problem fetch for ID ${testProblem.id}...`);
            
            const individualResponse = await fetch(`http://localhost:3001/api/problems/${testProblem.id}`);
            if (individualResponse.ok) {
                const individualProblem = await individualResponse.json();
                console.log(`✅ Individual fetch successful`);
                console.log(`   Notes match: ${individualProblem.notes === testProblem.notes}`);
                console.log(`   Individual notes length: ${individualProblem.notes?.length || 0}`);
            } else {
                console.log(`❌ Individual fetch failed: ${individualResponse.status}`);
            }
        }
        
        // Check for problems with empty or null notes
        const problemsWithoutNotes = problems.filter(p => !p.notes || !p.notes.trim());
        console.log(`\n📊 Problems without notes: ${problemsWithoutNotes.length}`);
        
        // Show statistics
        console.log('\n📈 Database Statistics:');
        console.log(`Total problems: ${problems.length}`);
        console.log(`Problems with notes: ${problemsWithNotes.length} (${(problemsWithNotes.length/problems.length*100).toFixed(1)}%)`);
        console.log(`Problems without notes: ${problemsWithoutNotes.length} (${(problemsWithoutNotes.length/problems.length*100).toFixed(1)}%)`);
        
        // Check for different note formats
        let htmlCount = 0;
        let enhancedCount = 0;
        let otherCount = 0;
        
        problemsWithNotes.forEach(problem => {
            try {
                const parsed = JSON.parse(problem.notes);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
                    enhancedCount++;
                } else {
                    otherCount++;
                }
            } catch (e) {
                if (problem.notes.includes('<') && problem.notes.includes('>')) {
                    htmlCount++;
                } else {
                    otherCount++;
                }
            }
        });
        
        console.log('\n📋 Note Formats:');
        console.log(`Enhanced format: ${enhancedCount}`);
        console.log(`HTML format: ${htmlCount}`);
        console.log(`Other format: ${otherCount}`);
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

// Also create a function to search for specific problems
async function searchProblemNotes(searchTerm) {
    try {
        const response = await fetch('http://localhost:3001/api/problems');
        const problems = await response.json();
        
        const matches = problems.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toString() === searchTerm
        );
        
        console.log(`🔍 Search results for "${searchTerm}":`);
        matches.forEach(problem => {
            console.log(`Problem ${problem.id}: ${problem.title}`);
            console.log(`Has notes: ${problem.notes ? 'Yes' : 'No'}`);
            if (problem.notes) {
                console.log(`Notes length: ${problem.notes.length}`);
                console.log(`Notes preview: ${problem.notes.substring(0, 150)}...`);
            }
            console.log('---');
        });
        
        return matches;
    } catch (error) {
        console.error('Error searching:', error);
        return [];
    }
}

// Run the check automatically
checkDatabaseNotes();

console.log('\n💡 To search for specific problems, modify the script and add:');
console.log('// searchProblemNotes("problem name or id");');