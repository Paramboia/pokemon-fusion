// Test script to verify the isLocalFallback flag in the fusion API response
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testFusionAPI() {
  try {
    console.log('=== Testing Fusion API Response ===');
    console.log('Checking if isLocalFallback flag is properly set in the response');

    // You'll need to replace these with your actual Clerk token
    // This is just a simulation, actual API call would need authentication
    const mockToken = 'YOUR_CLERK_TOKEN';
    
    // Example Pokemon data
    const testData = {
      pokemon1Id: 144, // Articuno
      pokemon2Id: 77,  // Ponyta
      pokemon1Name: 'articuno',
      pokemon2Name: 'ponyta',
      fusionName: 'Anyta-Test',
    };
    
    console.log(`Testing fusion with: ${testData.pokemon1Name} + ${testData.pokemon2Name}`);
    
    // Create a mock API request
    // NOTE: This won't actually work without a valid token
    // This is for demonstration purposes only
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`,
        'X-Simple-Fusion': 'false'
      },
      body: JSON.stringify(testData)
    });
    
    // Check response
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Response: ${errorText}`);
      console.log('\nNote: This script requires a valid Clerk token and running local server.');
      console.log('To properly test:');
      console.log('1. Start your local server');
      console.log('2. Add your Clerk token to this script');
      console.log('3. Run this script again');
      return;
    }
    
    // Parse response
    const data = await response.json();
    console.log('\nAPI Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check isLocalFallback flag
    console.log('\nisLocalFallback flag check:');
    if ('isLocalFallback' in data) {
      console.log(`✅ isLocalFallback is present in response: ${data.isLocalFallback}`);
    } else {
      console.error('❌ isLocalFallback is missing from response!');
    }
    
    console.log('\n=== Suggested Debug Steps ===');
    console.log('1. Check browser network tab for the actual API response');
    console.log('2. Verify the "isLocalFallback" property exists and is set to false');
    console.log('3. Clear your browser cache and cookies');
    console.log('4. Test with a different browser');
    console.log('5. Check if your FusionCard component is correctly reading the property');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
testFusionAPI(); 