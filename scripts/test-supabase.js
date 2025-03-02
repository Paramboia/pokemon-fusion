// Simple script to test Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Hardcode the values from .env.local for testing
const supabaseUrl = 'https://ahgoxvfsxaazfoezwxko.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZ294dmZzeGFhemZvZXp3eGtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDU4MjIyMCwiZXhwIjoyMDU2MTU4MjIwfQ.x0z7mM00pKnj71FSpF5qURtYB5JLg3gINx-VMJFD0vk';

console.log('Testing Supabase connection with hardcoded values');
console.log('URL:', supabaseUrl);
console.log('Key available:', !!supabaseServiceKey);

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('Attempting to query users table...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying users table:', error);
    } else {
      console.log('Successfully connected to Supabase!');
      console.log('Users data:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

main(); 