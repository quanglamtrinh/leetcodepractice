// Simple test to verify first-time solve behavior
const http = require('http');

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

async function testFirstTimeSolve() {
    console.log('🧪 Testing First-Time Solve Behavior (Simple)\n');
    
    try {
        // 1. Get an unsolved problem
        console.log('1. Finding an unsolved problem...');
        const problemsResponse = await fetch(`${BASE_URL}/api/problems`);
        const problems = await problemsResponse.json();
        const unsolvedProblems = problems.filter(p => !p.solved);
        
        if (unsolvedProblems.length === 0) {
            console.log('❌ No unsolved problems found');
            return;
        }
        
        const testProblem = unsolvedProblems[0];
        console.log(`   Selected: "${testProblem.title}" (ID: ${testProblem.id})`);
        
        // 2. Count initial events for today
        console.log('\n2. Counting initial calendar events...');
        const today = new Date().toISOString().split('T')[0];
        let response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
        let events = await response.json();
        
        const initialCount = events.filter(e => e.event_type === 'solved_problem').length;
        console.log(`   Initial solved problem events today: ${initialCount}`);
        
        // 3. Mark problem as solved (first time)
        console.log('\n3. Marking problem as solved (first time)...');
        const solveResponse = await fetch(`${BASE_URL}/api/problems/${testProblem.id}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                solved: true, 
                notes: 'First time solve test',
                solved_date: new Date().toISOString()
            })
        });
        
        if (!solveResponse.ok) {
            console.log(`❌ Failed to mark as solved: ${solveResponse.status}`);
            return;
        }
        
        console.log('   ✅ Problem marked as solved');
        
        // 4. Check if event was created
        console.log('\n4. Checking if calendar event was created...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for event creation
        
        response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
        events = await response.json();
        
        const newCount = events.filter(e => e.event_type === 'solved_problem').length;
        console.log(`   Events after first solve: ${newCount}`);
        
        if (newCount === initialCount + 1) {
            console.log('   ✅ Calendar event created for first solve');
        } else {
            console.log('   ❌ Calendar event not created');
            return;
        }
        
        // 5. Mark problem as unsolved
        console.log('\n5. Marking problem as unsolved...');
        const unsolveResponse = await fetch(`${BASE_URL}/api/problems/${testProblem.id}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solved: false })
        });
        
        if (!unsolveResponse.ok) {
            console.log(`❌ Failed to mark as unsolved: ${unsolveResponse.status}`);
            return;
        }
        
        console.log('   ✅ Problem marked as unsolved');
        
        // 6. Check events are still there (not archived)
        console.log('\n6. Checking events after unsolving...');
        response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
        events = await response.json();
        
        const countAfterUnsolve = events.filter(e => e.event_type === 'solved_problem').length;
        console.log(`   Events after unsolving: ${countAfterUnsolve}`);
        
        if (countAfterUnsolve === newCount) {
            console.log('   ✅ Events preserved after unsolving');
        } else {
            console.log('   ❌ Events were archived/removed');
        }
        
        // 7. Mark problem as solved again (second time)
        console.log('\n7. Marking problem as solved again (second time)...');
        const resolveResponse = await fetch(`${BASE_URL}/api/problems/${testProblem.id}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                solved: true, 
                notes: 'Second time solve test - should NOT create new event'
            })
        });
        
        if (!resolveResponse.ok) {
            console.log(`❌ Failed to mark as solved again: ${resolveResponse.status}`);
            return;
        }
        
        console.log('   ✅ Problem marked as solved again');
        
        // 8. Check no new event was created
        console.log('\n8. Checking no new event was created...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait
        
        response = await fetch(`${BASE_URL}/api/calendar/day/${today}`);
        events = await response.json();
        
        const finalCount = events.filter(e => e.event_type === 'solved_problem').length;
        console.log(`   Final event count: ${finalCount}`);
        
        if (finalCount === countAfterUnsolve) {
            console.log('   ✅ No new event created for second solve');
        } else {
            console.log('   ❌ New event was created for second solve');
        }
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log(`   Initial events: ${initialCount}`);
        console.log(`   After first solve: ${newCount} (+${newCount - initialCount})`);
        console.log(`   After unsolving: ${countAfterUnsolve} (${countAfterUnsolve === newCount ? 'preserved' : 'changed'})`);
        console.log(`   After second solve: ${finalCount} (${finalCount === countAfterUnsolve ? 'no change' : 'changed'})`);
        
        if (newCount === initialCount + 1 && finalCount === countAfterUnsolve) {
            console.log('\n🎉 SUCCESS: First-time solve only behavior is working correctly!');
        } else {
            console.log('\n❌ FAILURE: First-time solve only behavior is not working as expected.');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

testFirstTimeSolve();