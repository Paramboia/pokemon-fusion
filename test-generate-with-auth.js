require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testGenerateWithAuth() {
  try {
    console.log('Testing the generate API endpoint with authentication...');
    
    // Test parameters
    const pokemon1Id = 25; // Pikachu
    const pokemon2Id = 133; // Eevee
    const fusionName = 'Pikavee';
    
    // Get the Clerk session token from environment variable
    // Note: In a real scenario, this would come from the Clerk SDK
    const token = process.env.TEST_CLERK_TOKEN;
    
    if (!token) {
      console.error('No TEST_CLERK_TOKEN environment variable found');
      console.log('Please set a valid Clerk token in the .env.local file:');
      console.log('TEST_CLERK_TOKEN=your_clerk_token_here');
      return;
    }
    
    console.log(`Generating fusion of Pokémon ${pokemon1Id} and ${pokemon2Id} with name "${fusionName}"...`);
    
    // Make the API call with authentication
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
      
      // If authentication error, provide guidance
      if (response.status === 401 || data.error === 'Authentication required') {
        console.log('\nAuthentication error. Please check your Clerk token:');
        console.log('1. Make sure TEST_CLERK_TOKEN is set in .env.local');
        console.log('2. Ensure the token is valid and not expired');
        console.log('3. Verify that the user associated with the token exists in your Supabase users table');
      }
    }
  } catch (error) {
    console.error('Error testing generate API:', error);
  }
}

testGenerateWithAuth().catch(console.error); 