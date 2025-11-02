// Test script to verify calendar API fix
const fetch = require('node-fetch');

async function testCalendarAPI() {
    const baseURL = 'http://localhost:3000';
    
    console.log('Testing Calendar API Fix...\n');
    
    try {
        // Test creating a task with correct field names
        const taskData = {
            event_type: 'task',
            title: 'Test Task',
            description: 'This is a test task',
            event_date: '2025-01-15',
            priority: 'medium'
        };
        
        console.log('1. Testing task creation with correct field names...');
        console.log('Sending data:', JSON.stringify(taskData, null, 2));
        
        const createResponse = await fetch(`${baseURL}/api/calendar/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        const createResult = await createResponse.text();
        console.log('Response status:', createResponse.status);
        console.log('Response body:', createResult);
        
        if (createResponse.status === 201 || createResponse.status === 200) {
            console.log('✅ Task creation successful!');
            
            // Parse the response to get the created task ID
            try {
                const createdTask = JSON.parse(createResult);
                console.log('Created task ID:', createdTask.id);
                
                // Test fetching the created task
                console.log('\n2. Testing task retrieval...');
                const fetchResponse = await fetch(`${baseURL}/api/calendar/day/2025-01-15`);
                const fetchResult = await fetchResponse.text();
                console.log('Fetch response:', fetchResult);
                
                if (fetchResponse.ok) {
                    console.log('✅ Task retrieval successful!');
                } else {
                    console.log('❌ Task retrieval failed');
                }
                
            } catch (parseError) {
                console.log('Could not parse response, but creation seems successful');
            }
        } else {
            console.log('❌ Task creation failed');
            console.log('Error details:', createResult);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testCalendarAPI().then(() => {
    console.log('\nTest completed.');
}).catch(error => {
    console.error('Test script error:', error);
});