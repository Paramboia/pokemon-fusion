// Script to insert the required pokemon
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key available:', !!supabaseServiceKey);

async function insertPokemon() {
  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // List of pokemon to insert (without image_url and type)
    const pokemon = [
      { id: 1, name: 'Bulbasaur' },
      { id: 2, name: 'Ivysaur' },
      { id: 3, name: 'Venusaur' },
      { id: 4, name: 'Charmander' },
      { id: 5, name: 'Charmeleon' },
      { id: 6, name: 'Charizard' },
      { id: 7, name: 'Squirtle' },
      { id: 8, name: 'Wartortle' },
      { id: 9, name: 'Blastoise' },
      { id: 25, name: 'Pikachu' },
      { id: 26, name: 'Raichu' }
    ];
    
    // Insert the pokemon one by one to avoid issues
    for (const poke of pokemon) {
      console.log(`Inserting pokemon ${poke.id} (${poke.name})...`);
      
      const { data, error } = await supabase
        .from('pokemon')
        .upsert(poke, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error inserting pokemon ${poke.id}:`, error);
      } else {
        console.log(`Pokemon ${poke.id} inserted successfully`);
      }
    }
    
    // Check if the pokemon were inserted
    console.log('Checking if pokemon were inserted...');
    const { data, error } = await supabase
      .from('pokemon')
      .select('id, name')
      .in('id', [1, 25]);
    
    if (error) {
      console.error('Error checking pokemon:', error);
    } else {
      console.log('Pokemon found:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

insertPokemon(); 