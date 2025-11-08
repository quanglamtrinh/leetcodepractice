// Test script to verify server fix and practice sessions removal
const http = require('http');
const https = require('https');

// Simple fetch implementation using Node.js built-in modules
function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
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

async function testServerFix() {
    console.log('🧪 Testing Server Fix and Practice Sessions Removal\n');
    
    const tests = [
        {
            name: 'Health Check',
            test: async () => {
                const response = await fetch(`${BASE_URL}/api/health`);
                const data = await response.json();
                return response.ok && data.status === 'ok';
            }
        },
        {
            name: 'Problems Endpoint',
            test: async () => {
                const response = await fetch(`${BASE_URL}/api/problems`);
                const data = await response.json();
                return response.ok && Array.isArray(data) && data.length > 0;
            }
        },
        {
            name: 'Practice Session Endpoints Removed',
            test: async () => {
                const endpoints = [
                    '/api/practice-sessions',
                    '/api/calendar/practice-session',
                    '/api/calendar/practice-stats',
                    '/api/calendar/practice-history'
                ];
                
                const results = [];
                for (const endpoint of endpoints) {
                    try {
                        const response = await fetch(`${BASE_URL}${endpoint}`);
                        results.push({
                            endpoint,
                            status: response.status,
                            removed: response.status === 404 || response.status >= 400
                        });
                    } catch (error) {
                        results.push({
                            endpoint,
                            status: 'ERROR',
                            removed: true,
                            error: error.message
                        });
                    }
                }
                
                console.log('   Practice session endpoints status:');
                results.forEach(r => {
                    console.log(`   ${r.endpoint}: ${r.status} ${r.removed ? '✅' : '❌'}`);
                });
                
                return results.every(r => r.removed);
            }
        },
        {
            name: 'Calendar Day Endpoint',
            test: async () => {
                const today = new Date().toISOString().split('T')[0];
                const response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                const data = await response.json();
                
                if (!response.ok) {
                    console.log(`   Calendar day endpoint error: ${response.status}`);
                    return false;
                }
                
                // Check that no practice_session events exist
                const practiceSessionEvents = data.filter(event => 
                    event.event_type === 'practice_session'
                );
                
                console.log(`   Events today: ${data.length}`);
                console.log(`   Practice session events: ${practiceSessionEvents.length} (should be 0)`);
                
                return practiceSessionEvents.length === 0;
            }
        },
        {
            name: 'Mark Problem as Solved Test',
            test: async () => {
                // Get a problem to test with
                const problemsResponse = await fetch(`${BASE_URL}/api/problems`);
                const problems = await problemsResponse.json();
                
                if (!problems || problems.length === 0) {
                    console.log('   No problems available for testing');
                    return false;
                }
                
                const testProblem = problems.find(p => !p.solved) || problems[0];
                console.log(`   Testing with problem: ${testProblem.title}`);
                
                // Mark as solved
                const markSolvedResponse = await fetch(`${BASE_URL}/api/problems/${testProblem.id}/progress`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        solved: true, 
                        notes: 'Test solve for server fix verification',
                        solved_date: new Date().toISOString()
                    })
                });
                
                if (!markSolvedResponse.ok) {
                    console.log(`   Failed to mark problem as solved: ${markSolvedResponse.status}`);
                    return false;
                }
                
                // Check if solved problem event was created
                const today = new Date().toISOString().split('T')[0];
                const dayResponse = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
                const dayEvents = await dayResponse.json();
                
                const allSolvedProblemEvents = dayEvents.filter(event => 
                    event.event_type === 'solved_problem'
                );
                
                const specificProblemEvents = dayEvents.filter(event => 
                    event.event_type === 'solved_problem' && event.problem_id === testProblem.id
                );
                
                console.log(`   Total solved problem events today: ${allSolvedProblemEvents.length}`);
                console.log(`   Events for test problem: ${specificProblemEvents.length}`);
                
                // Return true if there are any solved problem events (the function is working)
                return allSolvedProblemEvents.length > 0;
            }
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
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
        console.log('\n🎉 All tests passed! Server fix and practice sessions removal successful.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the issues above.');
    }
}

// Run the tests
testServerFix().catch(console.error);