const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

async function calculateBalanceFromTransactions(userId) {
  const { data: transactions, error } = await supabase
    .from('credits_transactions')
    .select('amount')
    .eq('user_id', userId);

  if (error) {
    console.error(`Error fetching transactions for user ${userId}:`, error);
    return null;
  }

  return transactions.reduce((balance, tx) => balance + tx.amount, 0);
}

async function main() {
  try {
    console.log('Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, credits_balance');

    if (usersError) {
      throw usersError;
    }

    console.log(`Found ${users.length} users`);

    for (const user of users) {
      console.log(`\nProcessing user ${user.id}...`);
      console.log('Current balance:', user.credits_balance);

      const calculatedBalance = await calculateBalanceFromTransactions(user.id);
      
      if (calculatedBalance === null) {
        console.log('Skipping user due to error');
        continue;
      }

      console.log('Calculated balance:', calculatedBalance);

      if (calculatedBalance !== user.credits_balance) {
        console.log('Balance mismatch! Updating...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ credits_balance: calculatedBalance })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating balance:', updateError);
        } else {
          console.log('Balance updated successfully');
        }
      } else {
        console.log('Balance is correct');
      }
    }

    console.log('\nBalance check completed!');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 