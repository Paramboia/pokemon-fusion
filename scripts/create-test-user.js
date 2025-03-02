// Script to create a test user in Supabase
const { createClient } = require('@supabase/supabase-js');

// Use the correct values from .env.local
const supabaseUrl = 'https://ahgoxvfsxaazfoezwxko.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZ294dmZzeGFhemZvZXp3eGtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDU4MjIyMCwiZXhwIjoyMDU2MTU4MjIwfQ.x0z7mM00pKnj71FSpF5qURtYB5JLg3gINx-VMJFD0vk';

console.log('Creating a test user in Supabase');
console.log('URL:', supabaseUrl);
console.log('Key available:', !!supabaseServiceKey);

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    // First, check if the users table exists
    console.log('Checking if users table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code !== 'PGRST116') {
      console.error('Error checking users table:', tableError);
      
      // Try to create the users table
      console.log('Attempting to create users table...');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          email TEXT UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { query: createTableQuery });
      
      if (createError) {
        console.error('Error creating users table:', createError);
        return;
      }
      
      console.log('Users table created successfully');
    } else {
      console.log('Users table exists');
    }
    
    // Create a test user with a unique email
    const testUser = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`
    };
    
    console.log('Creating test user:', testUser);
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select();
    
    if (insertError) {
      console.error('Error creating test user:', insertError);
      return;
    }
    
    console.log('Test user created successfully:', newUser);
    
    // Verify we can query the user
    console.log('Verifying user was created...');
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*');
    
    if (queryError) {
      console.error('Error querying users:', queryError);
      return;
    }
    
    console.log('All users in the database:', users);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

main(); 