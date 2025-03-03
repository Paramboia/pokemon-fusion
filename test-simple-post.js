// Script to test the simple POST endpoint
const fetch = require('node-fetch');

async function testSimplePost() {
  try {
    console.log('Testing /api/test-simple POST endpoint...');
    
    const response = await fetch('http://localhost:3000/api/test-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: 'data',
        hello: 'world'
      }),
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.text();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testSimplePost(); 