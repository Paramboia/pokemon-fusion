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

async function main() {
  try {
    console.log('Creating update_user_balance function...');
    
    // Create the function that will be called by the trigger
    const { error: functionError } = await supabase.rpc('run_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION update_user_balance()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Update the user's balance based on the transaction amount
          UPDATE users
          SET credits_balance = (
            SELECT COALESCE(SUM(amount), 0)
            FROM credits_transactions
            WHERE user_id = NEW.user_id
          )
          WHERE id = NEW.user_id;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (functionError) {
      console.error('Error creating function:', functionError);
      process.exit(1);
    }

    console.log('Function created successfully');

    // Create the trigger
    console.log('Creating trigger...');
    const { error: triggerError } = await supabase.rpc('run_sql', {
      sql_query: `
        DROP TRIGGER IF EXISTS update_balance_on_transaction ON credits_transactions;
        
        CREATE TRIGGER update_balance_on_transaction
        AFTER INSERT OR UPDATE OR DELETE ON credits_transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_user_balance();
      `
    });

    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
      process.exit(1);
    }

    console.log('Trigger created successfully');

    // Test the trigger
    console.log('\nTesting trigger...');
    const testUserId = '6f579f9b-090d-46f0-ba1d-b485c33073a5';
    
    // Get initial balance
    const { data: initialData } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', testUserId)
      .single();
    
    console.log('Initial balance:', initialData?.credits_balance);

    // Insert a test transaction
    const { error: insertError } = await supabase
      .from('credits_transactions')
      .insert({
        user_id: testUserId,
        amount: 1,
        transaction_type: 'test',
        description: 'Testing balance trigger'
      });

    if (insertError) {
      console.error('Error inserting test transaction:', insertError);
    }

    // Get final balance
    const { data: finalData } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', testUserId)
      .single();
    
    console.log('Final balance:', finalData?.credits_balance);

    // Clean up test transaction
    await supabase
      .from('credits_transactions')
      .delete()
      .eq('transaction_type', 'test');

    console.log('\nSetup completed successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 