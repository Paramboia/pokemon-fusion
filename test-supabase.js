// Simple script to test Supabase connection
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key available:', !!supabaseServiceKey);

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Try to query the users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error querying users table:', error);
      
      // Try to create the users table
      console.log('Trying to create users table...');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { query: createTableQuery });
      
      if (createError) {
        console.error('Error creating users table:', createError);
        return;
      }
      
      console.log('Users table created successfully');
      
      // Try to insert a test user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting test user:', insertError);
        return;
      }
      
      console.log('Test user created successfully:', newUser);
    } else {
      console.log('Successfully connected to Supabase!');
      console.log('Users in the database:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testConnection(); 