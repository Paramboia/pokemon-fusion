const fetch = require('node-fetch');

const API_URL = 'http://localhost:3002/api/credits/test';

async function testApi() {
  const transaction = {
    userId: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
    amount: 20,
    transactionType: 'purchase',
    description: 'Test purchase of Standard Pack'
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });

    const result = await response.json();
    console.log('API Response:', result);
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi(); 