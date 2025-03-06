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
    console.log('Setting up balance safeguards...\n');

    // 1. Create a view that always shows the correct calculated balance
    console.log('Creating calculated_balances view...');
    const { error: viewError } = await supabase
      .from('calculated_balances')
      .select('*')
      .limit(1)
      .catch(async () => {
        // View doesn't exist, create it
        return await supabase.rpc('run_sql', {
          sql_query: `
            CREATE OR REPLACE VIEW calculated_balances AS
            SELECT 
              u.id as user_id,
              u.email,
              u.credits_balance as stored_balance,
              COALESCE(SUM(ct.amount), 0) as calculated_balance,
              CASE 
                WHEN u.credits_balance <> COALESCE(SUM(ct.amount), 0) THEN true 
                ELSE false 
              END as is_mismatch
            FROM users u
            LEFT JOIN credits_transactions ct ON u.id = ct.user_id
            GROUP BY u.id, u.email, u.credits_balance;
          `
        });
      });

    if (viewError) {
      console.error('Error creating view:', viewError);
    } else {
      console.log('View created successfully');
    }

    // 2. Create a function to check and fix balance mismatches
    console.log('\nCreating balance verification function...');
    const { error: funcError } = await supabase.rpc('run_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION verify_and_fix_balances()
        RETURNS TABLE (
          user_id UUID,
          email TEXT,
          old_balance INTEGER,
          new_balance INTEGER,
          was_fixed BOOLEAN
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          WITH mismatches AS (
            SELECT 
              cb.user_id,
              cb.email,
              cb.stored_balance as old_balance,
              cb.calculated_balance as new_balance
            FROM calculated_balances cb
            WHERE cb.is_mismatch = true
          ),
          fixes AS (
            UPDATE users u
            SET credits_balance = m.new_balance
            FROM mismatches m
            WHERE u.id = m.user_id
            RETURNING u.id
          )
          SELECT 
            m.user_id,
            m.email,
            m.old_balance,
            m.new_balance,
            CASE WHEN f.id IS NOT NULL THEN true ELSE false END as was_fixed
          FROM mismatches m
          LEFT JOIN fixes f ON m.user_id = f.id;
        END;
        $$;
      `
    });

    if (funcError) {
      console.error('Error creating function:', funcError);
    } else {
      console.log('Function created successfully');
    }

    // 3. Create a trigger to prevent direct balance modifications
    console.log('\nCreating balance protection trigger...');
    const { error: triggerError } = await supabase.rpc('run_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION protect_balance_modifications()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.credits_balance <> NEW.credits_balance THEN
            -- Allow the update if it matches the calculated balance
            IF NEW.credits_balance = (
              SELECT COALESCE(SUM(amount), 0)
              FROM credits_transactions
              WHERE user_id = NEW.id
            ) THEN
              RETURN NEW;
            ELSE
              RAISE EXCEPTION 'Direct modification of credits_balance is not allowed. Use credits_transactions instead.';
            END IF;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS protect_balance_modifications ON users;
        
        CREATE TRIGGER protect_balance_modifications
        BEFORE UPDATE OF credits_balance ON users
        FOR EACH ROW
        EXECUTE FUNCTION protect_balance_modifications();
      `
    });

    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
    } else {
      console.log('Trigger created successfully');
    }

    // 4. Test the safeguards
    console.log('\nTesting safeguards...');
    
    // Check for any current mismatches
    const { data: mismatches, error: checkError } = await supabase
      .from('calculated_balances')
      .select('*')
      .eq('is_mismatch', true);

    if (checkError) {
      console.error('Error checking for mismatches:', checkError);
    } else {
      if (mismatches && mismatches.length > 0) {
        console.log(`Found ${mismatches.length} balance mismatches:`);
        for (const mismatch of mismatches) {
          console.log(`- User ${mismatch.email}:`);
          console.log(`  Stored: ${mismatch.stored_balance}`);
          console.log(`  Calculated: ${mismatch.calculated_balance}`);
        }

        // Fix mismatches
        console.log('\nFixing mismatches...');
        const { data: fixes, error: fixError } = await supabase
          .rpc('verify_and_fix_balances');

        if (fixError) {
          console.error('Error fixing balances:', fixError);
        } else if (fixes) {
          console.log('Fixed balances:', fixes);
        }
      } else {
        console.log('No balance mismatches found');
      }
    }

    console.log('\nSetup completed successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 