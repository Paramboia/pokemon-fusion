// Script to test saving fusion data to Supabase using the API directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key available:', !!supabaseServiceKey);

async function testSaveFusion() {
  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test data
    const testUserId = uuidv4();
    const testFusionId = uuidv4();
    const pokemon1Id = 25; // Pikachu
    const pokemon2Id = 1;  // Bulbasaur
    const fusionName = 'Pikasaur';
    const fusionImage = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'; // Just a placeholder
    
    console.log('Test User ID:', testUserId);
    console.log('Test Fusion ID:', testFusionId);
    
    // First, create a test user
    console.log('Creating test user...');
    const testUser = {
      id: testUserId,
      name: 'Test User',
      email: `test-${Date.now()}@example.com`
    };
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert(testUser)
      .select();
    
    if (userError) {
      console.error('Error creating test user:', userError);
      
      if (userError.code === '42P01') {
        console.log('Users table does not exist, but we cannot create it using the API');
        console.log('Please create the table manually in the Supabase dashboard with the following structure:');
        console.log(`
          CREATE TABLE users (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        return;
      }
      
      return;
    }
    
    console.log('Test user created successfully:', userData);
    
    // Upload test image to storage
    console.log('Uploading test image to storage...');
    const testImagePath = `test_image_${Date.now()}.png`;
    
    try {
      // Fetch the image
      console.log('Fetching test image from URL...');
      const response = await fetch(fusionImage);
      
      if (!response.ok) {
        console.error(`Failed to fetch test image: ${response.status}`);
        return;
      }
      
      // Get content type from response
      const contentType = response.headers.get('content-type') || 'image/png';
      console.log('Image content type:', contentType);
      
      // Get the image as a buffer
      const arrayBuffer = await response.arrayBuffer();
      console.log('Image buffer size:', arrayBuffer.byteLength, 'bytes');
      
      // Upload to Supabase Storage
      console.log('Uploading to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fusions')
        .upload(testImagePath, arrayBuffer, {
          contentType: contentType,
          upsert: true,
        });
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return;
      }
      
      console.log('Upload successful, getting public URL...');
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('fusions')
        .getPublicUrl(testImagePath);
      
      console.log('Image uploaded successfully to:', publicUrlData.publicUrl);
      
      // Try to check if the fusions table exists
      console.log('Checking if fusions table exists...');
      const { error: checkTableError } = await supabase
        .from('fusions')
        .select('id')
        .limit(1);
      
      if (checkTableError && checkTableError.code === '42P01') {
        console.log('Fusions table does not exist, but we cannot create it using the API');
        console.log('Please create the table manually in the Supabase dashboard with the following structure:');
        console.log(`
          CREATE TABLE fusions (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            pokemon_1_id INTEGER NOT NULL,
            pokemon_2_id INTEGER NOT NULL,
            fusion_name TEXT NOT NULL,
            fusion_image TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        return;
      } else if (checkTableError) {
        console.error('Error checking fusions table:', checkTableError);
        return;
      }
      
      console.log('Fusions table exists, proceeding with insert');
      
      // Save fusion data to database using the API
      console.log('Saving fusion data to database using the API...');
      const fusionData = {
        id: testFusionId,
        user_id: testUserId,
        pokemon_1_id: pokemon1Id,
        pokemon_2_id: pokemon2Id,
        fusion_name: fusionName,
        fusion_image: publicUrlData.publicUrl,
        likes: 0
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('fusions')
        .insert(fusionData)
        .select();
      
      if (insertError) {
        console.error('Error inserting fusion data:', insertError);
        
        if (insertError.code === '23503' && insertError.message.includes('pokemon')) {
          console.log('Error is related to pokemon foreign key constraint');
          console.log('The fusions table has foreign key constraints to a pokemon table that does not exist or does not have the required pokemon IDs');
          console.log('You may need to create the pokemon table and insert the required pokemon, or modify the fusions table to remove the foreign key constraint');
          return;
        }
        
        return;
      }
      
      console.log('Fusion data saved successfully:', insertData);
      
      // Verify the data was saved
      console.log('Verifying saved data...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('fusions')
        .select('*')
        .eq('id', testFusionId)
        .single();
      
      if (verifyError) {
        console.error('Error verifying saved data:', verifyError);
        return;
      }
      
      console.log('Verification successful, saved data:', verifyData);
      
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSaveFusion(); 