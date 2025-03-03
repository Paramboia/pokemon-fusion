// Simple script to test saving fusion data to Supabase without foreign keys
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
    
    // First, try to drop the fusions table if it exists to start fresh
    console.log('Attempting to drop the fusions table if it exists...');
    try {
      const dropTableQuery = `DROP TABLE IF EXISTS fusions;`;
      const { error: dropError } = await supabase.rpc('exec_sql', { query: dropTableQuery });
      
      if (dropError) {
        console.error('Error dropping fusions table:', dropError);
        // Continue anyway
      } else {
        console.log('Fusions table dropped successfully or did not exist');
      }
    } catch (error) {
      console.error('Error in drop table operation:', error);
      // Continue anyway
    }
    
    // Create a simple fusions table without foreign keys
    console.log('Creating a simple fusions table without foreign keys...');
    try {
      const createTableQuery = `
        CREATE TABLE fusions (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          pokemon_1_id INTEGER NOT NULL,
          pokemon_2_id INTEGER NOT NULL,
          fusion_name TEXT NOT NULL,
          fusion_image TEXT NOT NULL,
          likes INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { query: createTableQuery });
      
      if (createError) {
        console.error('Error creating fusions table:', createError);
        return;
      }
      
      console.log('Fusions table created successfully');
    } catch (error) {
      console.error('Error in create table operation:', error);
      return;
    }
    
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
      
      // Save fusion data to database using direct SQL
      console.log('Saving fusion data to database using direct SQL...');
      const directInsertQuery = `
        INSERT INTO fusions (id, user_id, pokemon_1_id, pokemon_2_id, fusion_name, fusion_image, likes)
        VALUES ('${testFusionId}', '${testUserId}', ${pokemon1Id}, ${pokemon2Id}, '${fusionName}', '${publicUrlData.publicUrl}', 0)
        RETURNING *;
      `;
      
      const { data: directInsertData, error: directInsertError } = await supabase.rpc('exec_sql', { query: directInsertQuery });
      
      if (directInsertError) {
        console.error('Error with direct SQL insert:', directInsertError);
        return;
      }
      
      console.log('Fusion data saved successfully with direct SQL:', directInsertData);
      
      // Verify the data was saved using the Supabase API
      console.log('Verifying saved data using Supabase API...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('fusions')
        .select('*')
        .eq('id', testFusionId)
        .single();
      
      if (verifyError) {
        console.error('Error verifying saved data:', verifyError);
        
        // Try direct SQL query as a fallback
        console.log('Trying direct SQL query to verify data...');
        const verifyQuery = `SELECT * FROM fusions WHERE id = '${testFusionId}';`;
        const { data: sqlVerifyData, error: sqlVerifyError } = await supabase.rpc('exec_sql', { query: verifyQuery });
        
        if (sqlVerifyError) {
          console.error('Error with SQL verification:', sqlVerifyError);
          return;
        }
        
        console.log('Verification successful with SQL, saved data:', sqlVerifyData);
        return;
      }
      
      console.log('Verification successful with Supabase API, saved data:', verifyData);
      
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSaveFusion(); 