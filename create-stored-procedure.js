require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function createStoredProcedure() {
  try {
    console.log('Creating stored procedure in Supabase...');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read the SQL file
    const sql = fs.readFileSync('./create-users-table-procedure.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error creating stored procedure:', error);
      
      // Try an alternative approach using raw SQL
      console.log('Trying alternative approach...');
      
      // Create the function directly
      const { error: directError } = await supabase.rpc('create_users_table_if_not_exists');
      
      if (directError) {
        console.error('Error calling the function directly:', directError);
        
        // Try to create the users table directly
        console.log('Creating users table directly...');
        
        const { error: tableError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.log('Users table does not exist, creating it...');
          
          // Execute raw SQL to create the table
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS public.users (
              id UUID PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;
          
          const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
          
          if (createError) {
            console.error('Error creating users table directly:', createError);
          } else {
            console.log('Users table created successfully');
          }
        } else {
          console.log('Users table already exists');
        }
      } else {
        console.log('Function called successfully');
      }
    } else {
      console.log('Stored procedure created successfully');
    }
    
    // Test the stored procedure
    console.log('Testing the stored procedure...');
    
    const { error: testError } = await supabase.rpc('create_users_table_if_not_exists');
    
    if (testError) {
      console.error('Error testing stored procedure:', testError);
    } else {
      console.log('Stored procedure tested successfully');
    }
    
    // Check if the users table exists
    console.log('Checking if users table exists...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('Error checking users table:', usersError);
    } else {
      console.log('Users table exists');
      console.log('Sample users:', users);
    }
    
  } catch (error) {
    console.error('Error creating stored procedure:', error);
  }
}

createStoredProcedure().catch(console.error); 