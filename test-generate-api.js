require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testGenerateApi() {
  try {
    console.log('Testing the generate API endpoint...');
    
    // Test parameters
    const pokemon1Id = 25; // Pikachu
    const pokemon2Id = 133; // Eevee
    const fusionName = 'Pikavee';
    
    console.log(`Generating fusion of Pokémon ${pokemon1Id} and ${pokemon2Id} with name "${fusionName}"...`);
    
    // Make the API call
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pokemon1Id,
        pokemon2Id,
        fusionName
      })
    });
    
    // Log the response status
    console.log('Response status:', response.status);
    
    // Parse the response
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Check if the response was successful
    if (response.ok) {
      console.log('✅ Generate API test successful!');
      console.log('Fusion image URL:', data.output);
      console.log('Fusion ID:', data.id);
    } else {
      console.log('❌ Generate API test failed!');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
    }
  } catch (error) {
    console.error('Error testing generate API:', error);
  }
}

testGenerateApi().catch(console.error); 