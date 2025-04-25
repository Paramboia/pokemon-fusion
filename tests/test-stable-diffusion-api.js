// Test the stable-diffusion.ts API file for Pokemon fusion
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeFile, readFile } = require('fs/promises');

// Import the API functions
// Note: For testing, we transpile the TS to JS or use ts-node
// This is a simple script to demonstrate the concept
const { generateWithStableDiffusion, generateAdvancedFusion, prepareImageForReplicate } = 
  require('../app/api/generate/stable-diffusion');

async function testStableDiffusionApi() {
  try {
    console.log("\n=== Testing Stable Diffusion 3.5 API for Pokemon Fusion ===");
    console.log("API Token check:", process.env.REPLICATE_API_TOKEN?.substring(0, 5) + "...");
    
    // Define Pokemon names for testing
    const pokemon1Name = "Pikachu";
    const pokemon2Name = "Charizard";
    
    // Define image paths (same as our previous test)
    const tempDir = path.join(__dirname, 'temp');
    const charizardImagePath = path.join(tempDir, 'charizard.png');
    const charmanderImagePath = path.join(tempDir, 'charmander.png'); // We'll use this as our second Pokemon
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Create a subfolder for API test results
    const apiTestFolder = path.join(outputDir, 'sd35-api-test');
    if (!fs.existsSync(apiTestFolder)) {
      fs.mkdirSync(apiTestFolder);
    }
    
    console.log("Reading image files...");
    
    // Read the image files
    const pikachu = "https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png"; // Use URL for Pikachu
    const charizardBuffer = await readFile(charizardImagePath);
    
    // Convert to base64
    const charizardBase64 = `data:image/png;base64,${charizardBuffer.toString('base64')}`;
    
    console.log("Testing Basic API - generateWithStableDiffusion");
    console.log(`Generating fusion between: ${pokemon1Name} (URL) and ${pokemon2Name} (Base64)`);
    
    // Test the basic fusion function
    const fusionImageUrl = await generateWithStableDiffusion(
      pokemon1Name,
      pokemon2Name,
      pikachu,
      charizardBase64
    );
    
    // Check the result
    if (fusionImageUrl) {
      console.log("Basic API test successful - Image URL received:", fusionImageUrl);
      
      // Save the output URL to a file
      const outputUrlPath = path.join(apiTestFolder, "basic-fusion-url.txt");
      fs.writeFileSync(outputUrlPath, fusionImageUrl);
      console.log(`Image URL saved to ${outputUrlPath}`);
      
      // Download and save the image
      try {
        const imageResponse = await axios.get(fusionImageUrl, { responseType: 'arraybuffer' });
        const imagePath = path.join(apiTestFolder, "basic-fusion.webp");
        await writeFile(imagePath, Buffer.from(imageResponse.data));
        console.log(`Image downloaded and saved to ${imagePath}`);
      } catch (downloadError) {
        console.error('Error downloading the image:', downloadError.message);
      }
    } else {
      console.error("Basic API test failed - No image URL received");
    }
    
    // Test the advanced fusion function (if desired)
    console.log("\nTesting Advanced API - generateAdvancedFusion");
    console.log(`Generating advanced fusion between: ${pokemon2Name} and ${pokemon1Name}`);
    
    // Now we'll swap the Pokemon and use Charizard as the base
    const advancedFusionUrl = await generateAdvancedFusion(
      pokemon2Name,  // Charizard as base
      pokemon1Name,  // Pikachu as features to add
      charizardBase64,
      pikachu
    );
    
    if (advancedFusionUrl) {
      console.log("Advanced API test successful - Image URL received");
      
      // Save the output URL to a file
      const outputUrlPath = path.join(apiTestFolder, "advanced-fusion-url.txt");
      fs.writeFileSync(outputUrlPath, advancedFusionUrl);
      
      // Download and save the image
      try {
        const imageResponse = await axios.get(advancedFusionUrl, { responseType: 'arraybuffer' });
        const imagePath = path.join(apiTestFolder, "advanced-fusion.webp");
        await writeFile(imagePath, Buffer.from(imageResponse.data));
        console.log(`Advanced fusion image saved to ${imagePath}`);
      } catch (downloadError) {
        console.error('Error downloading the advanced fusion image:', downloadError.message);
      }
    } else {
      console.error("Advanced API test failed - No image URL received");
    }
    
  } catch (error) {
    console.error("Error testing Stable Diffusion API:", error);
  }
}

// Run the test
testStableDiffusionApi().then(() => {
  console.log("\nAPI Tests completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 