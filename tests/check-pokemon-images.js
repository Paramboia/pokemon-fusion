require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkPokemonImages() {
  console.log('Checking Pokémon images in the database...');
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check if the pokemon table exists
    console.log('Checking if pokemon table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('pokemon')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking pokemon table:', tableError);
      return;
    }
    
    if (!tableExists || tableExists.length === 0) {
      console.log('Pokemon table is empty or does not exist');
      return;
    }
    
    console.log('Pokemon table exists');
    
    // Get the table structure
    console.log('Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'pokemon' });
    
    if (columnsError) {
      console.error('Error getting table structure:', columnsError);
      // Fallback: try to infer structure from data
      console.log('Trying to infer structure from data...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('pokemon')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('Error getting sample data:', sampleError);
        return;
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log('Sample pokemon data:', sampleData[0]);
        console.log('Columns:', Object.keys(sampleData[0]));
        
        if (sampleData[0].hasOwnProperty('image_url')) {
          console.log('image_url column exists');
        } else {
          console.log('image_url column does not exist');
        }
      }
    } else {
      console.log('Table columns:', columns);
      const hasImageUrl = columns.some(col => col.column_name === 'image_url');
      console.log('image_url column exists:', hasImageUrl);
    }
    
    // Check for Pokémon with missing image_url
    console.log('Checking for Pokémon with missing image_url...');
    const { data: missingImages, error: missingError } = await supabase
      .from('pokemon')
      .select('id, name, image_url')
      .is('image_url', null);
    
    if (missingError) {
      console.error('Error checking for missing images:', missingError);
      return;
    }
    
    console.log(`Found ${missingImages.length} Pokémon with missing image_url`);
    
    if (missingImages.length > 0) {
      console.log('Sample of Pokémon with missing images:');
      missingImages.slice(0, 5).forEach(pokemon => {
        console.log(`  ID: ${pokemon.id}, Name: ${pokemon.name}`);
      });
    }
    
    // Check for specific Pokémon IDs
    const pokemonIds = [25, 1, 4, 7]; // Pikachu, Bulbasaur, Charmander, Squirtle
    console.log(`Checking specific Pokémon IDs: ${pokemonIds.join(', ')}...`);
    
    for (const id of pokemonIds) {
      const { data: pokemon, error: pokemonError } = await supabase
        .from('pokemon')
        .select('id, name, image_url')
        .eq('id', id)
        .single();
      
      if (pokemonError) {
        console.error(`Error checking Pokémon ID ${id}:`, pokemonError);
        continue;
      }
      
      console.log(`Pokémon ID ${id}:`, pokemon);
    }
    
  } catch (error) {
    console.error('Error checking Pokémon images:', error);
  }
}

checkPokemonImages().catch(console.error); 