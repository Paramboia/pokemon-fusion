// Simple script to test the API endpoints
const fetch = require('node-fetch');

async function testApis() {
  try {
    console.log('Testing API endpoints...');
    
    // Test the hello API
    try {
      console.log('\nTesting /api/hello endpoint:');
      const helloResponse = await fetch('http://localhost:3000/api/hello');
      console.log('Status:', helloResponse.status);
      
      const helloText = await helloResponse.text();
      console.log('Response text:', helloText);
      
      try {
        const helloData = JSON.parse(helloText);
        console.log('Parsed JSON:', helloData);
      } catch (e) {
        console.error('Could not parse response as JSON:', e.message);
      }
    } catch (error) {
      console.error('Error testing hello API:', error.message);
    }
    
    // Test the sync-user API with a different user
    try {
      console.log('\nTesting /api/auth/sync-user endpoint with a different user:');
      const mockUser = {
        id: 'test_clerk_id_456',
        firstName: 'Jane',
        lastName: 'Doe',
        emailAddresses: [
          { emailAddress: 'jane.doe@example.com' }
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
      
      const syncText = await syncResponse.text();
      console.log('Response text:', syncText);
      
      try {
        const syncData = JSON.parse(syncText);
        console.log('Parsed JSON:', syncData);
      } catch (e) {
        console.error('Could not parse response as JSON:', e.message);
      }
    } catch (error) {
      console.error('Error testing sync-user API:', error.message);
    }
    
    console.log('\nTests completed.');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

// Run the tests
testApis(); 