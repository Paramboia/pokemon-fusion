const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://lfbmvtxvqjbwxpzwxnwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYm12dHh2cWpid3hwend4bndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NTc1NzcsImV4cCI6MjAyNTEzMzU3N30.Nh83ebqzf1iGHTaGywss6WIkkNlSiB3XjMgCgr8o4Ww';

console.log('Supabase Key:', supabaseKey ? 'Available (not shown for security)' : 'Not available');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test fusion ID and user ID - replace with actual IDs from your database
const fusionId = 'a6c85bc7-37c8-42e8-9207-91fe0e2260e7'; // Replace with an actual fusion ID
const userId = '9bc776ef-a9c9-456b-b330-654ced4debc9'; // Replace with an actual user ID

async function testFavoritesInsertion() {
  console.log('Testing favorites insertion...');
  console.log('Using fusion ID:', fusionId);
  console.log('Using user ID:', userId);

  // First, check if the favorite already exists and remove it for testing
  const { data: existingFavorite, error: checkError } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('fusion_id', fusionId);

  if (checkError) {
    console.error('Error checking existing favorite:', checkError);
    return;
  }

  if (existingFavorite && existingFavorite.length > 0) {
    console.log('Favorite already exists, removing it for testing...');
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);

    if (deleteError) {
      console.error('Error removing existing favorite:', deleteError);
      return;
    }
    console.log('Existing favorite removed successfully');
  }

  // Insert into favorites table
  const { data: insertData, error: insertError } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      fusion_id: fusionId
    })
    .select();

  if (insertError) {
    console.error('Error inserting favorite:', insertError);
    return;
  }

  console.log('Favorite inserted successfully:', insertData);
}

testFavoritesInsertion(); 