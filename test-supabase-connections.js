// Script to test all Supabase connections
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSupabaseConnections() {
  try {
    console.log('Testing Supabase connections...');
    console.log('Environment variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL available:', !!supabaseUrl);
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY available:', !!supabaseAnonKey);
    console.log('- SUPABASE_SERVICE_ROLE_KEY available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing required environment variables. Please check your .env.local file.');
      return;
    }
    
    // Test 1: Direct Supabase connection with anon key
    console.log('\n1. Testing direct Supabase connection with anon key...');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { data: anonData, error: anonError } = await supabaseAnon
        .from('pokemon')
        .select('id, name')
        .limit(1);
      
      if (anonError) {
        console.error('Error with anon key connection:', anonError);
      } else {
        console.log('Anon key connection successful!');
        console.log('Data retrieved:', anonData);
      }
    } catch (error) {
      console.error('Unexpected error with anon key connection:', error);
    }
    
    // Test 2: Direct Supabase connection with service key
    console.log('\n2. Testing direct Supabase connection with service key...');
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      const { data: serviceData, error: serviceError } = await supabaseService
        .from('pokemon')
        .select('id, name')
        .limit(1);
      
      if (serviceError) {
        console.error('Error with service key connection:', serviceError);
      } else {
        console.log('Service key connection successful!');
        console.log('Data retrieved:', serviceData);
      }
    } catch (error) {
      console.error('Unexpected error with service key connection:', error);
    }
    
    // Test 3: API health check endpoint
    console.log('\n3. Testing API health check endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/supabase-health');
      
      if (!response.ok) {
        console.error('Health check API returned an error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      } else {
        const healthData = await response.json();
        console.log('Health check API response:', JSON.stringify(healthData, null, 2));
      }
    } catch (error) {
      console.error('Error calling health check API:', error);
      console.log('Make sure your Next.js server is running on http://localhost:3000');
    }
    
    // Test 4: Storage access
    console.log('\n4. Testing Supabase Storage access...');
    try {
      const { data: buckets, error: bucketsError } = await supabaseService.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing storage buckets:', bucketsError);
      } else {
        console.log('Storage buckets retrieved successfully!');
        console.log('Buckets:', buckets.map(b => b.name));
      }
    } catch (error) {
      console.error('Unexpected error accessing storage:', error);
    }
    
    // Test 5: Database tables
    console.log('\n5. Testing database tables...');
    const tables = ['users', 'pokemon', 'fusions', 'favorites'];
    
    for (const table of tables) {
      try {
        // Get the count using the correct syntax
        const { count, error: countError } = await supabaseService
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error(`Error counting ${table} table:`, countError);
        } else {
          console.log(`Table ${table} accessed successfully!`);
          console.log(`Count: ${count}`);
          
          // Get a sample row
          const { data: sampleData, error: sampleError } = await supabaseService
            .from(table)
            .select('*')
            .limit(1);
          
          if (sampleError) {
            console.error(`Error getting sample from ${table} table:`, sampleError);
          } else if (sampleData && sampleData.length > 0) {
            console.log(`Sample data from ${table}:`, sampleData[0]);
          } else {
            console.log(`No data found in ${table} table`);
          }
        }
      } catch (error) {
        console.error(`Unexpected error accessing ${table} table:`, error);
      }
    }
    
    console.log('\nSupabase connection tests completed!');
  } catch (error) {
    console.error('Unexpected error during tests:', error);
  }
}

testSupabaseConnections(); 