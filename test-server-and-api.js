// Simple script to test the API with a custom server
const http = require('http');
const { exec } = require('child_process');
const fetch = require('node-fetch');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle GET request to root
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Test server is running' }));
    return;
  }
  
  // Return 404 for all other requests
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start the server on port 3001
server.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
  
  // Test the Next.js API
  testNextJsApi();
});

// Function to test the Next.js API
async function testNextJsApi() {
  try {
    console.log('\nTesting Next.js API...');
    console.log('Waiting 5 seconds for Next.js server to be ready...');
    
    // Wait 5 seconds before testing
    setTimeout(async () => {
      try {
        // Test the hello API
        console.log('\nTesting /api/hello endpoint:');
        const helloResponse = await fetch('http://localhost:3000/api/hello');
        console.log('Status:', helloResponse.status);
        const helloData = await helloResponse.text();
        console.log('Response:', helloData);
        
        try {
          const parsedHello = JSON.parse(helloData);
          console.log('Parsed JSON:', parsedHello);
        } catch (e) {
          console.log('Not valid JSON');
        }
        
        // Test the sync-user API
        console.log('\nTesting /api/auth/sync-user endpoint:');
        const mockUser = {
          id: 'test_clerk_id_123',
          firstName: 'Test',
          lastName: 'User',
          emailAddresses: [
            { emailAddress: 'test@example.com' }
          ]
        };
        
        const syncResponse = await fetch('http://localhost:3000/api/auth/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockUser)
        });
        
        console.log('Status:', syncResponse.status);
        const syncData = await syncResponse.text();
        console.log('Response:', syncData);
        
        try {
          const parsedSync = JSON.parse(syncData);
          console.log('Parsed JSON:', parsedSync);
        } catch (e) {
          console.log('Not valid JSON');
        }
        
        console.log('\nTests completed. Press Ctrl+C to exit.');
      } catch (error) {
        console.error('Error testing Next.js API:', error.message);
      }
    }, 5000);
  } catch (error) {
    console.error('Error in testNextJsApi:', error.message);
  }
}

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down test server');
  server.close(() => {
    console.log('Test server closed');
    process.exit(0);
  });
}); 