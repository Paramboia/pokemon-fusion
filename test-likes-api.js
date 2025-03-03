// Script to test the likes API endpoint
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testLikesApi() {
  try {
    console.log('Testing likes API endpoint...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Service Key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not available');
      return;
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Step 1: Create a test user
    const testUserId = uuidv4();
    console.log('Creating test user with ID:', testUserId);
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        name: 'Test User',
        email: `test-${Date.now()}@example.com`
      })
      .select();
    
    if (userError) {
      console.error('Error creating test user:', userError);
      return;
    }
    
    console.log('Test user created successfully:', userData);
    
    // Step 2: Create a test fusion
    const testFusionId = uuidv4();
    console.log('Creating test fusion with ID:', testFusionId);
    
    const { data: fusionData, error: fusionError } = await supabase
      .from('fusions')
      .insert({
        id: testFusionId,
        user_id: testUserId,
        pokemon_1_id: 25,
        pokemon_2_id: 1,
        fusion_name: 'Test Pikasaur',
        fusion_image: 'https://example.com/test-image.png',
        likes: 0
      })
      .select();
    
    if (fusionError) {
      console.error('Error creating test fusion:', fusionError);
      return;
    }
    
    console.log('Test fusion created successfully:', fusionData);
    
    // Step 3: Test the likes API endpoint (POST)
    console.log('Testing POST /api/likes endpoint...');
    
    const postResponse = await fetch('http://localhost:3000/api/likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fusionId: testFusionId
      }),
    });
    
    console.log('POST response status:', postResponse.status);
    
    const postData = await postResponse.text();
    console.log('POST response data:', postData);
    
    try {
      const postJson = JSON.parse(postData);
      console.log('POST response data (parsed):', JSON.stringify(postJson, null, 2));
    } catch (parseError) {
      console.log('Could not parse POST response as JSON');
    }
    
    // Step 4: Verify the favorite was added and likes count was updated
    console.log('Verifying favorite was added and likes count was updated...');
    
    const { data: verifyFavoriteData, error: verifyFavoriteError } = await supabase
      .from('favorites')
      .select('*')
      .eq('fusion_id', testFusionId);
    
    if (verifyFavoriteError) {
      console.error('Error verifying favorite:', verifyFavoriteError);
    } else {
      console.log('Favorites found:', verifyFavoriteData);
    }
    
    const { data: verifyFusionData, error: verifyFusionError } = await supabase
      .from('fusions')
      .select('*')
      .eq('id', testFusionId);
    
    if (verifyFusionError) {
      console.error('Error verifying fusion:', verifyFusionError);
    } else {
      console.log('Fusion data:', verifyFusionData);
    }
    
    // Step 5: Test the likes API endpoint (DELETE)
    console.log('Testing DELETE /api/likes endpoint...');
    
    const deleteResponse = await fetch(`http://localhost:3000/api/likes?fusionId=${testFusionId}`, {
      method: 'DELETE',
    });
    
    console.log('DELETE response status:', deleteResponse.status);
    
    const deleteData = await deleteResponse.text();
    console.log('DELETE response data:', deleteData);
    
    try {
      const deleteJson = JSON.parse(deleteData);
      console.log('DELETE response data (parsed):', JSON.stringify(deleteJson, null, 2));
    } catch (parseError) {
      console.log('Could not parse DELETE response as JSON');
    }
    
    // Step 6: Verify the favorite was removed and likes count was updated
    console.log('Verifying favorite was removed and likes count was updated...');
    
    const { data: verifyFavoriteData2, error: verifyFavoriteError2 } = await supabase
      .from('favorites')
      .select('*')
      .eq('fusion_id', testFusionId);
    
    if (verifyFavoriteError2) {
      console.error('Error verifying favorite removal:', verifyFavoriteError2);
    } else {
      console.log('Favorites after removal:', verifyFavoriteData2);
    }
    
    const { data: verifyFusionData2, error: verifyFusionError2 } = await supabase
      .from('fusions')
      .select('*')
      .eq('id', testFusionId);
    
    if (verifyFusionError2) {
      console.error('Error verifying fusion after unlike:', verifyFusionError2);
    } else {
      console.log('Fusion data after unlike:', verifyFusionData2);
    }
    
    // Step 7: Clean up (optional)
    // Uncomment the following code to clean up the test data
    /*
    console.log('Cleaning up test data...');
    
    // Delete fusion
    await supabase
      .from('fusions')
      .delete()
      .eq('id', testFusionId);
    
    // Delete user
    await supabase
      .from('users')
      .delete()
      .eq('id', testUserId);
    
    console.log('Test data cleaned up');
    */
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testLikesApi(); 