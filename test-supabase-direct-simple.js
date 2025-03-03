// Simple script to test Supabase connection directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key available:', !!supabaseServiceKey);
console.log('Supabase Service Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);

async function testSupabaseConnection() {
  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing connection by listing storage buckets...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }
    
    console.log('Connection successful!');
    console.log('Buckets found:', buckets.length);
    console.log('Bucket names:', buckets.map(b => b.name).join(', '));
    
    // Try to list files in the first bucket if any
    if (buckets.length > 0) {
      const firstBucket = buckets[0].name;
      console.log(`Listing files in bucket: ${firstBucket}`);
      const { data: files, error: filesError } = await supabase.storage.from(firstBucket).list();
      
      if (filesError) {
        console.error(`Error listing files in bucket ${firstBucket}:`, filesError);
        return;
      }
      
      console.log(`Files in bucket ${firstBucket}:`, files.length);
      if (files.length > 0) {
        console.log('First 5 files:', files.slice(0, 5).map(f => f.name).join(', '));
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSupabaseConnection(); 