// Script to test the favorites functionality
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testFavorites() {
  try {
    console.log('Testing favorites functionality...');
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
    
    // Step 3: Check if favorites table exists
    console.log('Checking if favorites table exists...');
    
    const { data: favoritesTableData, error: favoritesTableError } = await supabase
      .from('favorites')
      .select('*')
      .limit(1);
    
    if (favoritesTableError && favoritesTableError.code === '42P01') {
      console.log('Favorites table does not exist, creating it...');
      
      // Create favorites table
      const { error: createTableError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS favorites (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id),
            fusion_id UUID NOT NULL REFERENCES fusions(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, fusion_id)
          );
        `
      });
      
      if (createTableError) {
        console.error('Error creating favorites table:', createTableError);
        
        // Alternative approach if RPC is not available
        console.log('Trying alternative approach to create favorites table...');
        
        const { error: createTableError2 } = await supabase
          .from('favorites')
          .insert({
            id: uuidv4(),
            user_id: testUserId,
            fusion_id: testFusionId
          });
        
        if (createTableError2 && createTableError2.code !== '23505') {
          console.error('Error creating favorites table with alternative approach:', createTableError2);
          return;
        }
      }
    } else if (favoritesTableError) {
      console.error('Error checking favorites table:', favoritesTableError);
    } else {
      console.log('Favorites table exists');
    }
    
    // Step 4: Add a favorite
    console.log('Adding a favorite...');
    
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('favorites')
      .insert({
        user_id: testUserId,
        fusion_id: testFusionId
      })
      .select();
    
    if (favoriteError) {
      console.error('Error adding favorite:', favoriteError);
      return;
    }
    
    console.log('Favorite added successfully:', favoriteData);
    
    // Step 5: Verify the favorite was added
    console.log('Verifying favorite was added...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', testUserId)
      .eq('fusion_id', testFusionId);
    
    if (verifyError) {
      console.error('Error verifying favorite:', verifyError);
      return;
    }
    
    console.log('Favorite verification result:', verifyData);
    
    // Step 6: Update the likes count in the fusion
    console.log('Updating likes count in fusion...');
    
    const { data: updateData, error: updateError } = await supabase
      .from('fusions')
      .update({ likes: 1 })
      .eq('id', testFusionId)
      .select();
    
    if (updateError) {
      console.error('Error updating likes count:', updateError);
      return;
    }
    
    console.log('Likes count updated successfully:', updateData);
    
    // Step 7: Clean up (optional)
    // Uncomment the following code to clean up the test data
    /*
    console.log('Cleaning up test data...');
    
    // Delete favorite
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', testUserId)
      .eq('fusion_id', testFusionId);
    
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

testFavorites(); 