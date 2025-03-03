// Script to test the Supabase POST endpoint
const fetch = require('node-fetch');

async function testSupabasePost() {
  try {
    console.log('Testing /api/test-supabase POST endpoint...');
    
    const response = await fetch('http://localhost:3000/api/test-supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testInsert: true
      }),
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.text();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testSupabasePost(); 