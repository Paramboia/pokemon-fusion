// Test integrated Pokemon fusion with Replicate Blend model
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require('replicate');

// Mock API function to simulate what the real API route would do
async function mockApiRequest() {
  try {
    console.log("\n=== Testing Integrated Pokemon Fusion with Replicate Blend ===");
    
    // Initialize the Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Define test Pokemon data
    const pokemon1 = {
      id: 25,
      name: "Pikachu",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
    };
    
    const pokemon2 = {
      id: 4,
      name: "Charmander",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png"
    };
    
    const fusionName = `${pokemon1.name.substring(0, 4)}${pokemon2.name.substring(4)}`;
    
    console.log(`Generating fusion "${fusionName}" between: ${pokemon1.name} and ${pokemon2.name}`);
    console.log("This may take a minute or two...");
    
    // Create the input for the Replicate blend-images model
    const input = {
      image1: pokemon1.imageUrl,
      image2: pokemon2.imageUrl,
      prompt: `A fusion of ${pokemon1.name} and ${pokemon2.name}, combining physical traits of both into a single new creature. High quality, detailed rendering with clean outlines on white background, character design in the style of Japanese monster collection games.`,
    };
    
    console.log("Running Replicate Blend model...");
    
    // Run the Replicate blend model
    const output = await replicate.run(
      "charlesmccarthy/blend-images:1ed8aaaa04fa84f0c1191679e765d209b94866f6503038416dcbcb340fede892",
      { input }
    );
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    if (output) {
      const fusionImageUrl = output;
      console.log("Generated fusion image successfully!");
      
      // Save the fusion URL
      const outputUrlPath = path.join(outputDir, `${fusionName}-integrated-url.txt`);
      fs.writeFileSync(outputUrlPath, fusionImageUrl);
      console.log(`Image URL saved to ${outputUrlPath}`);
      
      // Download and save the image
      try {
        const imageResponse = await axios.get(fusionImageUrl, { responseType: 'arraybuffer' });
        const imagePath = path.join(outputDir, `${fusionName}-integrated.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
        console.log(`Image downloaded and saved to ${imagePath}`);
      } catch (downloadError) {
        console.error('Error downloading the image:', downloadError.message);
      }
      
      return {
        id: 'test-fusion-id',
        output: fusionImageUrl,
        fusionName,
        pokemon1Id: pokemon1.id,
        pokemon2Id: pokemon2.id,
        pokemon1Name: pokemon1.name,
        pokemon2Name: pokemon2.name,
        message: 'Fusion generated successfully'
      };
    } else {
      console.error("Failed to generate fusion image");
      return {
        error: 'Failed to generate fusion image',
        isLocalFallback: true
      };
    }
    
  } catch (error) {
    console.error("Error in test:", error);
    return { 
      error: 'Test error',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run the test
mockApiRequest().then((result) => {
  console.log("\nTest result:", JSON.stringify(result, null, 2));
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 