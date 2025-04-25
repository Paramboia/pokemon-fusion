const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://lfbmvtxvqjbwxpzwxnwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYm12dHh2cWpid3hwend4bndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NTc1NzcsImV4cCI6MjAyNTEzMzU3N30.Nh83ebqzf1iGHTaGywss6WIkkNlSiB3XjMgCgr8o4Ww';

console.log('Supabase Key:', supabaseKey ? 'Available (not shown for security)' : 'Not available');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test fusion ID and user ID - replace with actual IDs from your database
const fusionId = 'a6c85bc7-37c8-42e8-9207-91fe0e2260e7'; // Replace with an actual fusion ID
const userId = '9bc776ef-a9c9-456b-b330-654ced4debc9'; // Replace with an actual user ID

async function testLikeFusion() {
  console.log('Testing likeFusion function...');
  console.log('Using fusion ID:', fusionId);

  // Get current likes count
  const { data: initialData, error: initialError } = await supabase
    .from('fusions')
    .select('likes')
    .eq('id', fusionId)
    .single();

  if (initialError) {
    console.error('Error getting initial likes count:', initialError);
    return;
  }

  console.log('Initial likes count:', initialData.likes);
  console.log('Using user ID:', userId);

  console.log('Simulating likeFusion function...');
  
  // Step 1: Increment likes count
  console.log('Step 1: Incrementing likes count...');
  const { error: likesError } = await supabase.rpc('increment_fusion_likes', {
    fusion_id: fusionId
  });

  if (likesError) {
    console.error('Error incrementing fusion likes:', likesError);
    return;
  }
  
  console.log('Likes incremented successfully');

  // Step 2: Check if favorite already exists
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
    console.log('Favorite already exists, removing it first...');
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

  // Step 3: Add to favorites table
  const { data: insertData, error: insertError } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      fusion_id: fusionId
    })
    .select();

  if (insertError) {
    console.error('Error adding to favorites:', insertError);
    return;
  }

  console.log('Favorite added successfully:', insertData);

  // Verify results
  console.log('Verifying results...');

  // Get updated likes count
  const { data: updatedData, error: updatedError } = await supabase
    .from('fusions')
    .select('likes')
    .eq('id', fusionId)
    .single();

  if (updatedError) {
    console.error('Error getting updated likes count:', updatedError);
    return;
  }

  console.log('Updated likes count:', updatedData.likes);
  console.log('Likes increased by:', updatedData.likes - initialData.likes);

  // Check if favorite exists
  const { data: finalFavorite, error: finalCheckError } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('fusion_id', fusionId);

  if (finalCheckError) {
    console.error('Error checking final favorite status:', finalCheckError);
    return;
  }

  console.log('Favorite exists in the database:', finalFavorite);
  console.log('Test completed successfully');
}

testLikeFusion(); 