const fs = require('fs');
const path = require('path');

const POKEMON_API_BASE = 'https://pokeapi.co/api/v2';
const BATCH_SIZE = 50; // Process 50 Pokemon at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches
const TOTAL_POKEMON = 1025;

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPokemonBatch(startIndex, endIndex) {
  console.log(`Fetching Pokemon ${startIndex} to ${endIndex}...`);
  const batchPromises = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    batchPromises.push(fetchPokemonDetails(i));
  }
  
  try {
    const results = await Promise.all(batchPromises);
    return results.filter(pokemon => pokemon !== null);
  } catch (error) {
    console.error(`Error fetching batch ${startIndex}-${endIndex}:`, error);
    return [];
  }
}

async function fetchPokemonDetails(id) {
  try {
    const response = await fetch(`${POKEMON_API_BASE}/pokemon/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract only the essential data we need
    return {
      id: data.id,
      name: data.name,
      // Main image for cards (higher quality)
      image: data.sprites.other?.['official-artwork']?.front_default || 
             data.sprites.front_default,
      // Small image for search/thumbnails
      thumbnail: data.sprites.front_default,
      // Backup sprites in case main ones fail
      sprites: {
        front_default: data.sprites.front_default,
        front_shiny: data.sprites.front_shiny
      }
    };
  } catch (error) {
    console.error(`Error fetching Pokemon ${id}:`, error.message);
    return null;
  }
}

async function extractAllPokemon() {
  console.log(`Starting extraction of ${TOTAL_POKEMON} Pokemon in batches of ${BATCH_SIZE}...`);
  
  const allPokemon = [];
  const totalBatches = Math.ceil(TOTAL_POKEMON / BATCH_SIZE);
  
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const startIndex = batchNum * BATCH_SIZE + 1;
    const endIndex = Math.min((batchNum + 1) * BATCH_SIZE, TOTAL_POKEMON);
    
    console.log(`\nBatch ${batchNum + 1}/${totalBatches}`);
    
    const batchData = await fetchPokemonBatch(startIndex, endIndex);
    allPokemon.push(...batchData);
    
    console.log(`Successfully fetched ${batchData.length} Pokemon from this batch`);
    console.log(`Total Pokemon collected so far: ${allPokemon.length}`);
    
    // Add delay between batches to be respectful to the API
    if (batchNum < totalBatches - 1) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  // Sort by ID to ensure consistent ordering
  allPokemon.sort((a, b) => a.id - b.id);
  
  // Save to file
  const outputPath = path.join(dataDir, 'pokemon-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allPokemon, null, 2));
  
  console.log(`\n✅ Extraction complete!`);
  console.log(`📁 Saved ${allPokemon.length} Pokemon to: ${outputPath}`);
  console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // Log some sample data
  console.log(`\n📝 Sample data structure:`);
  console.log(JSON.stringify(allPokemon.slice(0, 2), null, 2));
}

// Run the extraction
extractAllPokemon().catch(console.error); 