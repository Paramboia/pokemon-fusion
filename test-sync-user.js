// Script to test the sync-user API endpoint
const fetch = require('node-fetch');

async function testSyncUser() {
  try {
    console.log('Testing sync-user API endpoint...');
    
    // Mock user data that would normally come from Clerk
    const mockUser = {
      id: 'test_clerk_id_123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [
        { emailAddress: 'test@example.com' }
      ]
    };
    
    const response = await fetch('http://localhost:3000/api/auth/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockUser)
    });
    
    console.log('Response status:', response.status);
    
    try {
      const text = await response.text();
      console.log('Response text:', text);
      
      try {
        const data = JSON.parse(text);
        console.log('Parsed JSON data:', data);
      } catch (jsonError) {
        console.error('Could not parse response as JSON:', jsonError.message);
      }
    } catch (textError) {
      console.error('Could not get response text:', textError.message);
    }
  } catch (error) {
    console.error('Error testing sync-user API:', error.message);
  }
}

// Run the test
testSyncUser(); 