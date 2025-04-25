// Test Replicate blend-images model for Pokemon fusion
require('dotenv').config({ path: '.env.local' });
const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Initialize the Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testReplicateBlend() {
  try {
    console.log("\n=== Testing Replicate blend-images model for Pokemon Fusion ===");
    console.log("API Token check:", process.env.REPLICATE_API_TOKEN?.substring(0, 5) + "...");
    
    // Define Pokemon names
    const pokemon1Name = "Pikachu";
    const pokemon2Name = "Charmander";
    
    // For this test, we'll use URLs to Pokemon images
    // In a production environment, these would come from your database or API
    const processedImage1 = "https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png"; // Pikachu
    const processedImage2 = "https://assets.pokemon.com/assets/cms2/img/pokedex/full/004.png"; // Charmander
    
    console.log(`Generating fusion between: ${pokemon1Name} and ${pokemon2Name}`);
    console.log("This may take a minute or two...");
    
    // Create the input for the Replicate model
    const input = {
      image1: processedImage1,
      image2: processedImage2,
      prompt: `A fusion of ${pokemon1Name} and ${pokemon2Name}, high quality, detailed rendering`,
    };
    
    // Run the model
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
      // Save the output URL to a file
      const outputUrlPath = path.join(outputDir, `${pokemon1Name}-${pokemon2Name}-replicate-url.txt`);
      fs.writeFileSync(outputUrlPath, output);
      console.log(`Image URL saved to ${outputUrlPath}`);
      
      // Download and save the image
      try {
        const imageResponse = await axios.get(output, { responseType: 'arraybuffer' });
        const imagePath = path.join(outputDir, `${pokemon1Name}-${pokemon2Name}-replicate.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
        console.log(`Image downloaded and saved to ${imagePath}`);
      } catch (downloadError) {
        console.error('Error downloading the image:', downloadError.message);
      }
      
      console.log("Success! The Replicate blend model generated an image.");
    } else {
      console.error("No output received from Replicate model");
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
testReplicateBlend().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 