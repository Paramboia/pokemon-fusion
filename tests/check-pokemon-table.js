// Script to check the structure of the pokemon table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key available:', !!supabaseServiceKey);

async function checkPokemonTable() {
  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if the pokemon table exists
    console.log('Checking if pokemon table exists...');
    const { data: pokemonTableInfo, error: pokemonTableCheckError } = await supabase
      .from('pokemon')
      .select('*')
      .limit(1);
    
    if (pokemonTableCheckError) {
      console.error('Error checking pokemon table:', pokemonTableCheckError);
      return;
    }
    
    console.log('Pokemon table exists, sample data:', pokemonTableInfo);
    
    // Try to get the table definition
    console.log('Getting table definition...');
    try {
      const { data: tableDefinition, error: tableDefinitionError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'pokemon');
      
      if (tableDefinitionError) {
        console.error('Error getting table definition:', tableDefinitionError);
        return;
      }
      
      console.log('Table definition:', tableDefinition);
    } catch (error) {
      console.error('Error in table definition query:', error);
    }
    
    // Try to insert a test pokemon
    console.log('Trying to insert a test pokemon...');
    const testPokemon = {
      id: 25,
      name: 'Pikachu'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('pokemon')
      .upsert(testPokemon, { onConflict: 'id' })
      .select();
    
    if (insertError) {
      console.error('Error inserting test pokemon:', insertError);
      
      // Try with different column combinations
      console.log('Trying with different column combinations...');
      
      // Try without image
      const { error: insertError2 } = await supabase
        .from('pokemon')
        .upsert({ id: 25, name: 'Pikachu' }, { onConflict: 'id' });
      
      if (insertError2) {
        console.error('Error inserting without image:', insertError2);
      } else {
        console.log('Insert without image successful');
      }
      
      // Try with sprite_url instead of image
      const { error: insertError3 } = await supabase
        .from('pokemon')
        .upsert({ 
          id: 25, 
          name: 'Pikachu', 
          sprite_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' 
        }, { onConflict: 'id' });
      
      if (insertError3) {
        console.error('Error inserting with sprite_url:', insertError3);
      } else {
        console.log('Insert with sprite_url successful');
      }
    } else {
      console.log('Test pokemon inserted successfully:', insertData);
    }
    
    // Check if pokemon 25 exists
    console.log('Checking if pokemon 25 exists...');
    const { data: pokemon25, error: pokemon25Error } = await supabase
      .from('pokemon')
      .select('*')
      .eq('id', 25)
      .single();
    
    if (pokemon25Error) {
      console.error('Error checking pokemon 25:', pokemon25Error);
    } else {
      console.log('Pokemon 25 exists:', pokemon25);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPokemonTable(); 