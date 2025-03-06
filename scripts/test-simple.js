const fetch = require('node-fetch');

async function testSimple() {
  try {
    console.log('Testing API endpoint...');
    const response = await fetch('http://localhost:3002/api/credits/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
        amount: 1,
        transactionType: 'test',
        description: 'Simple test transaction'
      })
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimple(); 