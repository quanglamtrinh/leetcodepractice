const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body.substring(0, 100) });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testServerStatus() {
  try {
    console.log('🔍 Testing server status...');
    
    // Test health endpoint
    const health = await testEndpoint('/api/health');
    console.log(`Health endpoint: ${health.status} - ${health.body}`);
    
    // Test known working endpoint
    const concepts = await testEndpoint('/api/concepts-new');
    console.log(`Concepts endpoint: ${concepts.status} - ${concepts.body.substring(0, 50)}...`);
    
    // Test patterns endpoint
    const patterns = await testEndpoint('/api/patterns');
    console.log(`Patterns endpoint: ${patterns.status} - ${patterns.body.substring(0, 50)}...`);
    
    // Test variants endpoint
    const variants = await testEndpoint('/api/variants');
    console.log(`Variants endpoint: ${variants.status} - ${variants.body.substring(0, 50)}...`);
    
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Starting server...');
      console.log('Please run: node server.js');
    } else {
      console.error('❌ Error:', err.message);
    }
  }
}

testServerStatus();