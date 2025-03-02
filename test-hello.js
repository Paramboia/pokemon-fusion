// Simple script to test the hello API endpoint
const fetch = require('node-fetch');

async function testHello() {
  try {
    console.log('Testing hello API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/hello');
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
    console.error('Error testing hello API:', error.message);
  }
}

// Run the test
testHello(); 