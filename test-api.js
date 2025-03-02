// Simple script to test the test-api endpoint
const fetch = require('node-fetch');

async function testApi() {
  try {
    console.log('Testing basic API functionality...');
    
    // Test GET request
    try {
      console.log('\nTesting GET request...');
      const getResponse = await fetch('http://localhost:3000/api/test-api');
      console.log('Response status:', getResponse.status);
      
      if (getResponse.ok) {
        const data = await getResponse.json();
        console.log('Response data:', data);
        console.log('GET request successful!');
      } else {
        console.error('GET request failed with status:', getResponse.status);
        try {
          const errorText = await getResponse.text();
          console.error('Error response:', errorText.substring(0, 500) + '...');
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
    } catch (error) {
      console.error('Error making GET request:', error.message);
    }
    
    // Test POST request
    try {
      console.log('\nTesting POST request...');
      const testData = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
      };
      
      console.log('Sending data:', testData);
      
      const postResponse = await fetch('http://localhost:3000/api/test-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      console.log('Response status:', postResponse.status);
      
      if (postResponse.ok) {
        const data = await postResponse.json();
        console.log('Response data:', data);
        console.log('POST request successful!');
      } else {
        console.error('POST request failed with status:', postResponse.status);
        try {
          const errorText = await postResponse.text();
          console.error('Error response:', errorText.substring(0, 500) + '...');
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
    } catch (error) {
      console.error('Error making POST request:', error.message);
    }
  } catch (error) {
    console.error('Unexpected error in test script:', error);
  }
}

// Run the test
testApi(); 