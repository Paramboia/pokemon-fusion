async function testSingleTransaction() {
  const transaction = {
    userId: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
    amount: 20,
    transactionType: 'purchase',
    description: 'Test purchase'
  };

  try {
    console.log('Sending test transaction:', transaction);
    
    const response = await fetch('http://localhost:3002/api/credits/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('Parsed response:', data);
    } catch (e) {
      console.log('Could not parse response as JSON');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testSingleTransaction(); 