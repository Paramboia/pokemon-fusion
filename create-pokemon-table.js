// Script to create the pokemon table and insert the required pokemon
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key available:', !!supabaseServiceKey);

async function createPokemonTable() {
  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if the pokemon table exists
    console.log('Checking if pokemon table exists...');
    const { data: pokemonTableInfo, error: pokemonTableCheckError } = await supabase
      .from('pokemon')
      .select('id')
      .limit(1);
    
    if (pokemonTableCheckError && pokemonTableCheckError.code === '42P01') {
      console.log('Pokemon table does not exist, creating it...');
      
      // Try to create the table using SQL
      try {
        // First, try to drop the table if it exists
        console.log('Attempting to drop the pokemon table if it exists...');
        const { error: dropError } = await supabase.rpc('exec_sql', { 
          query: 'DROP TABLE IF EXISTS pokemon;' 
        });
        
        if (dropError) {
          console.error('Error dropping pokemon table:', dropError);
          
          // If the exec_sql function doesn't exist, we need to use the API
          console.log('exec_sql function not available, using API to create table...');
          
          // We can't create tables using the API, so we'll need to do it manually
          console.log('Please create the pokemon table manually in the Supabase dashboard with the following structure:');
          console.log(`
            CREATE TABLE pokemon (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              image TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);
          
          // Try to insert the pokemon directly
          console.log('Attempting to insert pokemon directly...');
          await insertPokemon(supabase);
          return;
        }
        
        console.log('Pokemon table dropped successfully or did not exist');
        
        // Create the pokemon table
        console.log('Creating pokemon table...');
        const { error: createError } = await supabase.rpc('exec_sql', { 
          query: `
            CREATE TABLE pokemon (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              image TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          ` 
        });
        
        if (createError) {
          console.error('Error creating pokemon table:', createError);
          return;
        }
        
        console.log('Pokemon table created successfully');
        
        // Insert the pokemon
        await insertPokemon(supabase);
      } catch (error) {
        console.error('Error in SQL operations:', error);
        
        // Try to insert the pokemon directly
        console.log('Attempting to insert pokemon directly...');
        await insertPokemon(supabase);
      }
    } else {
      console.log('Pokemon table already exists');
      
      // Check if we have the required pokemon
      await checkAndInsertPokemon(supabase);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

async function insertPokemon(supabase) {
  console.log('Inserting pokemon...');
  
  // List of pokemon to insert
  const pokemon = [
    { id: 1, name: 'Bulbasaur', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' },
    { id: 2, name: 'Ivysaur', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png' },
    { id: 3, name: 'Venusaur', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png' },
    { id: 4, name: 'Charmander', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
    { id: 5, name: 'Charmeleon', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png' },
    { id: 6, name: 'Charizard', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
    { id: 7, name: 'Squirtle', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' },
    { id: 8, name: 'Wartortle', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png' },
    { id: 9, name: 'Blastoise', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png' },
    { id: 25, name: 'Pikachu', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
    { id: 26, name: 'Raichu', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png' }
  ];
  
  // Insert the pokemon in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < pokemon.length; i += batchSize) {
    const batch = pokemon.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1}...`);
    
    const { data, error } = await supabase
      .from('pokemon')
      .upsert(batch, { onConflict: 'id' })
      .select();
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Batch ${i / batchSize + 1} inserted successfully:`, data.length, 'pokemon');
    }
  }
  
  console.log('Pokemon insertion completed');
}

async function checkAndInsertPokemon(supabase) {
  console.log('Checking if required pokemon exist...');
  
  // List of required pokemon IDs
  const requiredIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26];
  
  // Check which pokemon exist
  const { data, error } = await supabase
    .from('pokemon')
    .select('id')
    .in('id', requiredIds);
  
  if (error) {
    console.error('Error checking pokemon:', error);
    return;
  }
  
  const existingIds = data.map(p => p.id);
  const missingIds = requiredIds.filter(id => !existingIds.includes(id));
  
  if (missingIds.length === 0) {
    console.log('All required pokemon exist');
    return;
  }
  
  console.log('Missing pokemon:', missingIds);
  
  // Create the missing pokemon
  const missingPokemon = missingIds.map(id => ({
    id,
    name: `Pokemon ${id}`,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
  }));
  
  console.log('Inserting missing pokemon...');
  const { data: insertData, error: insertError } = await supabase
    .from('pokemon')
    .upsert(missingPokemon)
    .select();
  
  if (insertError) {
    console.error('Error inserting missing pokemon:', insertError);
  } else {
    console.log('Missing pokemon inserted successfully:', insertData.length, 'pokemon');
  }
}

createPokemonTable(); 