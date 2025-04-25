// Test Stability AI's Stable Diffusion 3.5 model for Pokemon fusion
require('dotenv').config({ path: '.env.local' });
const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeFile } = require('fs/promises');

// Initialize the Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testStableDiffusion35() {
  try {
    console.log("\n=== Testing Stable Diffusion 3.5 for Pokemon Fusion ===");
    console.log("API Token check:", process.env.REPLICATE_API_TOKEN?.substring(0, 5) + "...");
    
    // Define Pokemon types for the fusion
    const pokemon1 = "Pikachu";
    const pokemon2 = "Charizard";
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    console.log(`Generating fusion between: ${pokemon1} and ${pokemon2}`);
    console.log("This may take a minute or two...");
    
    // Create the input for the Stable Diffusion 3.5 model
    const input = {
      prompt: `A detailed, high quality fusion of ${pokemon1} and ${pokemon2} Pokemon. The creature has features from both Pokemon, vibrant colors, game art style.`,
      width: 1024,
      height: 1024,
      num_outputs: 1
    };
    
    // Run the model
    console.log("Running Stable Diffusion 3.5 model...");
    const output = await replicate.run(
      "stability-ai/stable-diffusion-3.5-large",
      { input }
    );
    
    if (output && output.length > 0) {
      console.log("Model output received:", output);
      
      // Save the output URL to a file
      const outputUrlPath = path.join(outputDir, `${pokemon1}-${pokemon2}-sd35-url.txt`);
      fs.writeFileSync(outputUrlPath, output[0]);
      console.log(`Image URL saved to ${outputUrlPath}`);
      
      // Download and save the image
      try {
        for (const [index, imageUrl] of output.entries()) {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imagePath = path.join(outputDir, `${pokemon1}-${pokemon2}-sd35-${index}.webp`);
          await writeFile(imagePath, Buffer.from(imageResponse.data));
          console.log(`Image downloaded and saved to ${imagePath}`);
        }
        
        console.log("Success! Stable Diffusion 3.5 generated Pokemon fusion image(s).");
      } catch (downloadError) {
        console.error('Error downloading the image:', downloadError.message);
      }
    } else {
      console.error("No output received from Stable Diffusion 3.5 model");
    }
    
  } catch (error) {
    console.error("Error using Replicate:", error);
    
    // Check for common errors
    if (error.message) {
      if (error.message.includes('API token') || error.message.includes('auth')) {
        console.error("\nAPI token error. Please check your REPLICATE_API_TOKEN environment variable.");
        console.error("You can sign up for a free Replicate account at https://replicate.com/");
      } else if (error.message.includes('rate limit')) {
        console.error("\nRate limit reached. Please try again later.");
      }
    }
  }
}

// Run the test
testStableDiffusion35().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 