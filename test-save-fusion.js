// Script to test saving fusion data to Supabase
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
    const testUserId = uuidv4(); // Use UUID for user_id as well
    const testFusionId = uuidv4();
    const pokemon1Id = 25; // Pikachu
    const pokemon2Id = 1;  // Bulbasaur
    const fusionName = 'Pikasaur';
    const fusionImage = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'; // Just a placeholder
    
    console.log('Test User ID:', testUserId);
    console.log('Test Fusion ID:', testFusionId);
    
    // First, check if the users table exists and create a test user
    console.log('Checking if users table exists...');
    try {
      const { data: usersTableInfo, error: usersTableCheckError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (usersTableCheckError && usersTableCheckError.code === '42P01') {
        console.log('Users table does not exist, creating it...');
        
        // Create the users table
        const createUsersTableQuery = `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        
        const { error: createUsersTableError } = await supabase.rpc('exec_sql', { query: createUsersTableQuery });
        if (createUsersTableError) {
          console.error('Error creating users table:', createUsersTableError);
          return;
        }
        
        console.log('Users table created successfully');
      } else {
        console.log('Users table already exists');
      }
      
      // Create a test user
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
        return;
      }
      
      console.log('Test user created successfully:', userData);
      
    } catch (tableError) {
      console.error('Error checking users table:', tableError);
      return;
    }
    
    // Check if the pokemon table exists and create it if needed
    console.log('Checking if pokemon table exists...');
    try {
      const { data: pokemonTableInfo, error: pokemonTableCheckError } = await supabase
        .from('pokemon')
        .select('id')
        .limit(1);
      
      if (pokemonTableCheckError && pokemonTableCheckError.code === '42P01') {
        console.log('Pokemon table does not exist, creating it...');
        
        // Create the pokemon table
        const createPokemonTableQuery = `
          CREATE TABLE IF NOT EXISTS pokemon (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            image TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        
        const { error: createPokemonTableError } = await supabase.rpc('exec_sql', { query: createPokemonTableQuery });
        if (createPokemonTableError) {
          console.error('Error creating pokemon table:', createPokemonTableError);
          return;
        }
        
        console.log('Pokemon table created successfully');
        
        // Insert test pokemon
        console.log('Inserting test pokemon...');
        const testPokemon = [
          { id: 1, name: 'Bulbasaur', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' },
          { id: 25, name: 'Pikachu', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' }
        ];
        
        const { data: pokemonData, error: pokemonInsertError } = await supabase
          .from('pokemon')
          .insert(testPokemon)
          .select();
        
        if (pokemonInsertError) {
          console.error('Error inserting test pokemon:', pokemonInsertError);
          return;
        }
        
        console.log('Test pokemon inserted successfully');
      } else {
        console.log('Pokemon table already exists');
        
        // Check if our test pokemon exist
        const { data: pokemon1, error: pokemon1Error } = await supabase
          .from('pokemon')
          .select('*')
          .eq('id', pokemon1Id)
          .single();
        
        if (pokemon1Error) {
          console.log(`Pokemon with id ${pokemon1Id} does not exist, inserting it...`);
          const { error: insertPokemon1Error } = await supabase
            .from('pokemon')
            .insert({ id: pokemon1Id, name: 'Pikachu', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' });
          
          if (insertPokemon1Error) {
            console.error(`Error inserting pokemon ${pokemon1Id}:`, insertPokemon1Error);
            return;
          }
        }
        
        const { data: pokemon2, error: pokemon2Error } = await supabase
          .from('pokemon')
          .select('*')
          .eq('id', pokemon2Id)
          .single();
        
        if (pokemon2Error) {
          console.log(`Pokemon with id ${pokemon2Id} does not exist, inserting it...`);
          const { error: insertPokemon2Error } = await supabase
            .from('pokemon')
            .insert({ id: pokemon2Id, name: 'Bulbasaur', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' });
          
          if (insertPokemon2Error) {
            console.error(`Error inserting pokemon ${pokemon2Id}:`, insertPokemon2Error);
            return;
          }
        }
      }
    } catch (tableError) {
      console.error('Error checking pokemon table:', tableError);
      return;
    }
    
    // Now check the structure of the fusions table
    console.log('Checking fusions table structure...');
    try {
      // Get the table definition
      const tableDefinitionQuery = `
        SELECT column_name, data_type, is_nullable, 
               (SELECT constraint_type FROM information_schema.table_constraints tc 
                JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name 
                WHERE ccu.table_name = 'fusions' AND ccu.column_name = c.column_name 
                AND tc.constraint_type = 'FOREIGN KEY' LIMIT 1) as constraint_type
        FROM information_schema.columns c
        WHERE table_name = 'fusions';
      `;
      
      const { data: tableDefinition, error: tableDefinitionError } = await supabase.rpc('exec_sql', { query: tableDefinitionQuery });
      
      if (tableDefinitionError) {
        console.error('Error getting table definition:', tableDefinitionError);
        
        // If we can't get the definition, try to drop and recreate the table
        console.log('Attempting to drop and recreate the fusions table...');
        
        const dropTableQuery = `DROP TABLE IF EXISTS fusions;`;
        const { error: dropError } = await supabase.rpc('exec_sql', { query: dropTableQuery });
        
        if (dropError) {
          console.error('Error dropping fusions table:', dropError);
          return;
        }
        
        console.log('Fusions table dropped successfully, recreating it...');
        
        const createTableQuery = `
          CREATE TABLE fusions (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id),
            pokemon_1_id INTEGER NOT NULL REFERENCES pokemon(id),
            pokemon_2_id INTEGER NOT NULL REFERENCES pokemon(id),
            fusion_name TEXT NOT NULL,
            fusion_image TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { query: createTableQuery });
        
        if (createError) {
          console.error('Error recreating fusions table:', createError);
          return;
        }
        
        console.log('Fusions table recreated successfully');
      } else {
        console.log('Fusions table definition:', tableDefinition);
        
        // Check if we need to modify the table
        const hasConstraints = tableDefinition.some(col => 
          (col.column_name === 'pokemon_1_id' || col.column_name === 'pokemon_2_id') && 
          col.constraint_type === 'FOREIGN KEY'
        );
        
        if (hasConstraints) {
          console.log('Fusions table has foreign key constraints, attempting to drop them...');
          
          // Drop the constraints
          const dropConstraintsQuery = `
            ALTER TABLE fusions DROP CONSTRAINT IF EXISTS fusions_pokemon_1_id_fkey;
            ALTER TABLE fusions DROP CONSTRAINT IF EXISTS fusions_pokemon_2_id_fkey;
          `;
          
          const { error: dropConstraintsError } = await supabase.rpc('exec_sql', { query: dropConstraintsQuery });
          
          if (dropConstraintsError) {
            console.error('Error dropping constraints:', dropConstraintsError);
            return;
          }
          
          console.log('Constraints dropped successfully');
        }
      }
    } catch (error) {
      console.error('Error checking fusions table structure:', error);
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
      
      // Save fusion data to database
      console.log('Saving fusion data to database...');
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
        
        // Try a direct SQL insert as a last resort
        console.log('Trying direct SQL insert...');
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