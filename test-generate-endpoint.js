// Script to test the generate endpoint
const fetch = require('node-fetch');

async function testGenerateEndpoint() {
  try {
    console.log('Testing /api/generate endpoint...');
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pokemon1Id: 25,
        pokemon2Id: 1,
        fusionName: 'Pikasaur'
      }),
    });
    
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response data (parsed):', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.log('Could not parse response as JSON');
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testGenerateEndpoint(); 