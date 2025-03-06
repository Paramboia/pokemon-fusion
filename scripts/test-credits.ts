// const fetch = require('node-fetch');

const API_URL = 'http://localhost:3002/api/credits/test';

async function insertTestTransactions() {
  const transactions = [
    // First user: Purchase and usage
    {
      userId: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
      amount: 20,
      transactionType: 'purchase',
      description: 'Test purchase of Standard Pack'
    },
    {
      userId: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
      amount: -5,
      transactionType: 'usage',
      description: 'Generated 5 fusions'
    },
    
    // Second user: Purchase, usage, and refund
    {
      userId: '9bc776ef-a9c9-456b-b330-654ced4debc9',
      amount: 50,
      transactionType: 'purchase',
      description: 'Test purchase of Value Pack'
    },
    {
      userId: '9bc776ef-a9c9-456b-b330-654ced4debc9',
      amount: -10,
      transactionType: 'usage',
      description: 'Generated 10 fusions'
    },
    {
      userId: '9bc776ef-a9c9-456b-b330-654ced4debc9',
      amount: 2,
      transactionType: 'refund',
      description: 'Refund for failed fusions'
    }
  ];

  console.log('Inserting test transactions...\n');

  for (const transaction of transactions) {
    try {
      console.log(`\nProcessing transaction:`, transaction);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction)
      });

      const text = await response.text();
      console.log(`Response status: ${response.status}`);
      console.log('Response headers:', response.headers);
      console.log('Response body:', text);

      try {
        const result = JSON.parse(text);
        if (result.success) {
          console.log(`✅ Successfully processed transaction:`);
          console.log(`   User: ${transaction.userId}`);
          console.log(`   Type: ${transaction.transactionType}`);
          console.log(`   Amount: ${transaction.amount}`);
          console.log(`   New Balance: ${result.newBalance}`);
        } else {
          console.log(`❌ Failed to process transaction:`);
          console.log(`   User: ${transaction.userId}`);
          console.log(`   Type: ${transaction.transactionType}`);
          console.log(`   Error:`, result.error);
          if (result.details) {
            console.log(`   Details:`, result.details);
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        console.log('Raw response:', text);
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to process transaction:`, error);
    }
  }
}

insertTestTransactions().catch(console.error); 