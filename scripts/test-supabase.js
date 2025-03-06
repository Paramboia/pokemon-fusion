// Simple script to test Supabase connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function updateUserBalance(userId, amount) {
  // First get current balance
  const { data: userData, error: getUserError } = await supabase
    .from('users')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (getUserError) {
    console.error('Error getting user balance:', getUserError);
    return null;
  }

  const currentBalance = userData?.credits_balance || 0;
  const newBalance = currentBalance + amount;

  // Update the balance
  const { data: updateData, error: updateError } = await supabase
    .from('users')
    .update({ credits_balance: newBalance })
    .eq('id', userId)
    .select('credits_balance')
    .single();

  if (updateError) {
    console.error('Error updating balance:', updateError);
    return null;
  }

  return updateData;
}

async function insertTestTransactions() {
  const transactions = [
    // First user: Purchase and usage
    {
      user_id: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
      amount: 20,
      transaction_type: 'purchase',
      description: 'Test purchase of Standard Pack'
    },
    {
      user_id: '6f579f9b-090d-46f0-ba1d-b485c33073a5',
      amount: -5,
      transaction_type: 'usage',
      description: 'Generated 5 fusions'
    },
    
    // Second user: Purchase, usage, and refund
    {
      user_id: '9bc776ef-a9c9-456b-b330-654ced4debc9',
      amount: 50,
      transaction_type: 'purchase',
      description: 'Test purchase of Value Pack'
    },
    {
      user_id: '9bc776ef-a9c9-456b-b330-654ced4debc9',
      amount: -10,
      transaction_type: 'usage',
      description: 'Generated 10 fusions'
    },
    {
      user_id: '9bc776ef-a9c9-456b-b330-654ced4debc9',
      amount: 2,
      transaction_type: 'refund',
      description: 'Refund for failed fusions'
    }
  ];

  console.log('Inserting test transactions...\n');

  for (const transaction of transactions) {
    try {
      console.log('Processing transaction:', transaction);

      // Insert the transaction
      const { data, error } = await supabase
        .from('credits_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error inserting transaction:', error);
        continue;
      }

      console.log('Transaction inserted successfully:', data);

      // Update user balance
      const updatedUser = await updateUserBalance(transaction.user_id, transaction.amount);
      if (updatedUser) {
        console.log('User balance updated:', updatedUser);
      }

      console.log('---\n');
      
      // Add a small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  }
}

insertTestTransactions()
  .then(() => console.log('Done!'))
  .catch(console.error); 