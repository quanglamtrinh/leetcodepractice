// Test script to verify solved problem events are only created on first solve
const http = require('http');

// Simple fetch implementation using Node.js built-in modules
function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = http;
        
        const req = client.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data)
                });
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

const BASE_URL = 'http://localhost:3001';

async function testFirstTimeSolveOnly() {
    console.log('🧪 Testing First-Time Solve Only Behavior\n');
    
    const tests = [
        {
            name: 'Find Unsolved Problem for Testing',
            test: async () => {
                const response = await fetch(`${BASE_URL}/api/problems`);
                const problems = await response.json();
                
                if (!response.ok || !Array.isArray(problems)) {
                    console.log('   Failed to fetch problems');
                    return false;
                }
                
                const unsolvedProblems = problems.filter(p => !p.solved);
                console.log(`   Total problems: ${problems.length}`);
                console.log(`   Unsolved problems: ${unsolvedProblems.length}`);
                
                if (unsolvedProblems.length === 0) {
                    console.log('   No unsolved problems found for testing');
                    return false;
                }
                
                // Store test problem for other tests
                window.testProblem = unsolvedProblems[0];
                console.log(`   Selected test problem: "${window.testProblem.title}" (ID: ${window.testProblem.id})`);
                
                return true;
            }
        },
        {
            name: 'Count Initial Calendar Events',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                const today = new Date().toISOString().split('T')[0];
                const response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                const events = await response.json();
                
                if (!response.ok) {
                    console.log('   Failed to fetch calendar events');
                    return false;
                }
                
                const solvedProblemEvents = events.filter(e => 
                    e.event_type === 'solved_problem' && e.title.includes(window.testProblem.title)
                );
                
                window.initialEventCount = solvedProblemEvents.length;
                console.log(`   Initial solved problem events for test problem: ${window.initialEventCount}`);
                
                return true;
            }
        },
        {
            name: 'Mark Problem as Solved (First Time)',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                const response = await fetch(`${BASE_URL}/api/problems/${window.testProblem.id}/progress`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        solved: true, 
                        notes: 'First time solve test',
                        solved_date: new Date().toISOString()
                    })
                });
                
                if (!response.ok) {
                    console.log(`   Failed to mark problem as solved: ${response.status}`);
                    return false;
                }
                
                const result = await response.json();
                console.log(`   Problem marked as solved: ${result.title}`);
                
                return true;
            }
        },
        {
            name: 'Verify Calendar Event Created (First Time)',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                // Wait a moment for the event to be created
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const today = new Date().toISOString().split('T')[0];
                const response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                const events = await response.json();
                
                if (!response.ok) {
                    console.log('   Failed to fetch calendar events');
                    return false;
                }
                
                const solvedProblemEvents = events.filter(e => 
                    e.event_type === 'solved_problem' && e.problem_id === window.testProblem.id
                );
                
                const expectedCount = window.initialEventCount + 1;
                console.log(`   Expected events: ${expectedCount}, Actual events: ${solvedProblemEvents.length}`);
                
                if (solvedProblemEvents.length === expectedCount) {
                    console.log('   ✅ Calendar event created for first-time solve');
                    return true;
                } else {
                    console.log('   ❌ Calendar event count mismatch');
                    return false;
                }
            }
        },
        {
            name: 'Mark Problem as Unsolved',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                const response = await fetch(`${BASE_URL}/api/problems/${window.testProblem.id}/progress`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        solved: false, 
                        notes: 'Unmarking as solved for test'
                    })
                });
                
                if (!response.ok) {
                    console.log(`   Failed to mark problem as unsolved: ${response.status}`);
                    return false;
                }
                
                const result = await response.json();
                console.log(`   Problem marked as unsolved: ${result.title}`);
                
                return true;
            }
        },
        {
            name: 'Mark Problem as Solved Again (Second Time)',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                const response = await fetch(`${BASE_URL}/api/problems/${window.testProblem.id}/progress`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        solved: true, 
                        notes: 'Second time solve test - should NOT create new event',
                        solved_date: new Date().toISOString()
                    })
                });
                
                if (!response.ok) {
                    console.log(`   Failed to mark problem as solved again: ${response.status}`);
                    return false;
                }
                
                const result = await response.json();
                console.log(`   Problem marked as solved again: ${result.title}`);
                
                return true;
            }
        },
        {
            name: 'Verify No New Calendar Event Created (Second Time)',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                // Wait a moment for any potential event creation
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const today = new Date().toISOString().split('T')[0];
                const response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                const events = await response.json();
                
                if (!response.ok) {
                    console.log('   Failed to fetch calendar events');
                    return false;
                }
                
                const solvedProblemEvents = events.filter(e => 
                    e.event_type === 'solved_problem' && e.problem_id === window.testProblem.id
                );
                
                const expectedCount = window.initialEventCount + 1; // Should still be same as after first solve
                console.log(`   Expected events: ${expectedCount}, Actual events: ${solvedProblemEvents.length}`);
                
                if (solvedProblemEvents.length === expectedCount) {
                    console.log('   ✅ No new calendar event created for second-time solve');
                    return true;
                } else {
                    console.log('   ❌ Unexpected calendar event count - new event may have been created');
                    return false;
                }
            }
        },
        {
            name: 'Test Multiple Toggle Cycles',
            test: async () => {
                if (!window.testProblem) {
                    console.log('   No test problem available');
                    return false;
                }
                
                console.log('   Testing multiple solve/unsolve cycles...');
                
                // Record initial count
                const today = new Date().toISOString().split('T')[0];
                let response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                let events = await response.json();
                let initialCount = events.filter(e => 
                    e.event_type === 'solved_problem' && e.problem_id === window.testProblem.id
                ).length;
                
                // Cycle through solve/unsolve multiple times
                for (let i = 0; i < 3; i++) {
                    console.log(`     Cycle ${i + 1}: Unsolving...`);
                    await fetch(`${BASE_URL}/api/problems/${window.testProblem.id}/progress`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ solved: false })
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    console.log(`     Cycle ${i + 1}: Solving...`);
                    await fetch(`${BASE_URL}/api/problems/${window.testProblem.id}/progress`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            solved: true,
                            notes: `Cycle ${i + 1} solve test`
                        })
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Check final count
                response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                events = await response.json();
                const finalCount = events.filter(e => 
                    e.event_type === 'solved_problem' && e.problem_id === window.testProblem.id
                ).length;
                
                console.log(`   Initial count: ${initialCount}, Final count: ${finalCount}`);
                
                if (finalCount === initialCount) {
                    console.log('   ✅ No additional events created during multiple cycles');
                    return true;
                } else {
                    console.log('   ❌ Additional events were created during cycles');
                    return false;
                }
            }
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    // Create a global object to store test data
    global.window = {};
    
    for (const test of tests) {
        try {
            console.log(`🔍 Testing: ${test.name}`);
            const result = await test.test();
            
            if (result) {
                console.log(`✅ PASSED: ${test.name}\n`);
                passed++;
            } else {
                console.log(`❌ FAILED: ${test.name}\n`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ERROR in ${test.name}: ${error.message}\n`);
            failed++;
        }
    }
    
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! First-time solve only behavior is working correctly.');
        console.log('\n📋 Summary:');
        console.log('• Calendar events are only created when a problem is solved for the first time');
        console.log('• Re-solving a problem does not create duplicate calendar events');
        console.log('• Multiple solve/unsolve cycles do not create additional events');
        console.log('• The calendar maintains clean, non-duplicate entries');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the issues above.');
    }
}

// Run the tests
testFirstTimeSolveOnly().catch(console.error);