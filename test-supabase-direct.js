// Simple script to directly test Supabase connection
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment variables:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || 'Not found'}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Found (not showing for security)' : 'Not found'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Found (not showing for security)' : 'Not found'}`);

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // IMPORTANT: We're using Clerk for authentication, NOT Supabase Auth
    // These settings explicitly disable all Supabase Auth functionality
    persistSession: false,
    autoRefreshToken: false,
    flowType: 'implicit',  // Most minimal flow type
    storage: null,  // Don't store anything in local storage
  },
});

// Create a Supabase client with the anon key
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // IMPORTANT: We're using Clerk for authentication, NOT Supabase Auth
    // These settings explicitly disable all Supabase Auth functionality
    persistSession: false,
    autoRefreshToken: false,
    flowType: 'implicit',  // Most minimal flow type
    storage: null,  // Don't store anything in local storage
  },
});

console.log('Supabase clients created with Auth DISABLED - using Clerk for authentication only');

async function testConnection() {
  try {
    console.log('\nTesting connection to Supabase with service role key...');
    
    // Try to query the users table with service role key
    const { data: serviceData, error: serviceError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (serviceError) {
      console.error('Error querying users table with service role key:', serviceError);
    } else {
      console.log('Successfully connected to Supabase with service role key!');
      console.log(`Found ${serviceData.length} users in the database`);
      if (serviceData.length > 0) {
        console.log('First user:', serviceData[0]);
      }
    }
    
    console.log('\nTesting connection to Supabase with anon key...');
    
    // Try to query the users table with anon key
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('users')
      .select('*')
      .limit(5);
    
    if (anonError) {
      console.error('Error querying users table with anon key:', anonError);
    } else {
      console.log('Successfully connected to Supabase with anon key!');
      console.log(`Found ${anonData.length} users in the database`);
      if (anonData.length > 0) {
        console.log('First user:', anonData[0]);
      }
    }
    
    // Try to create a test user
    if (!serviceError) {
      console.log('\nTrying to create a test user...');
      const testEmail = `test-${Date.now()}@example.com`;
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          name: 'Test User',
          email: testEmail
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting test user:', insertError);
      } else {
        console.log('Test user created successfully:', newUser);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testConnection(); 