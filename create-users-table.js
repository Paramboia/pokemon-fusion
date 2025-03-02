const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set');
  process.exit(1);
}

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log('Checking Supabase connection...');
  
  try {
    // Test connection
    const { data: healthData, error: healthError } = await supabase.from('_health').select('*');
    
    if (healthError) {
      console.error('Error connecting to Supabase:', healthError);
      process.exit(1);
    }
    
    console.log('Successfully connected to Supabase');
    
    // Check if users table exists
    console.log('Checking if users table exists...');
    
    try {
      const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.log('Users table does not exist or cannot be accessed:', error.message);
        console.log('Creating users table...');
        
        // Create users table
        const { error: createError } = await supabase.rpc('create_users_table');
        
        if (createError) {
          console.error('Error creating users table with RPC:', createError);
          console.log('Trying direct SQL query...');
          
          // Try direct SQL query
          const { error: sqlError } = await supabase.sql`
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;
          
          if (sqlError) {
            console.error('Error creating users table with SQL:', sqlError);
            process.exit(1);
          }
          
          console.log('Users table created successfully with SQL');
        } else {
          console.log('Users table created successfully with RPC');
        }
        
        // Verify table was created
        const { data: verifyData, error: verifyError } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
        
        if (verifyError) {
          console.error('Error verifying users table creation:', verifyError);
          process.exit(1);
        }
        
        console.log('Users table verified, count:', verifyData.count);
      } else {
        console.log('Users table exists, count:', data.count);
      }
      
      console.log('Script completed successfully');
    } catch (err) {
      console.error('Error checking users table:', err);
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main(); 