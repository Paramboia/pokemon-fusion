// Script to directly test the API endpoint
const fetch = require('node-fetch');

async function testApiEndpoint() {
  try {
    console.log('Testing /api/generate endpoint...');
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pokemon1Id: '25',
        pokemon2Id: '1',
        fusionName: 'Pikasaur'
      }),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testApiEndpoint(); 