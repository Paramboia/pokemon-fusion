// Test script to simulate a request to the Stable Diffusion Fusion API endpoint
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeFile, readFile } = require('fs/promises');

async function simulateApiRequest() {
  try {
    console.log("\n=== Simulating API Request to Stable Diffusion Fusion Endpoint ===");
    
    // Define Pokemon names for testing
    const pokemon1Name = "Pikachu";
    const pokemon2Name = "Charizard";
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Create a subfolder for this test
    const testFolder = path.join(outputDir, 'sd-fusion-api-test');
    if (!fs.existsSync(testFolder)) {
      fs.mkdirSync(testFolder);
    }
    
    // Get the image data
    const tempDir = path.join(__dirname, 'temp');
    const charizardImagePath = path.join(tempDir, 'charizard.png');
    
    // Obtain image data
    console.log("Reading image files...");
    
    // Use a URL for Pikachu and base64 for Charizard
    const pokemon1ImageUrl = "https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png";
    const charizardBuffer = await readFile(charizardImagePath);
    const pokemon2ImageBase64 = `data:image/png;base64,${charizardBuffer.toString('base64')}`;
    
    // Create the request body (normally this would be sent to the API endpoint)
    const requestBody = {
      pokemon1Name,
      pokemon2Name,
      pokemon1Image: pokemon1ImageUrl,
      pokemon2Image: pokemon2ImageBase64,
      advanced: false // Use standard fusion mode
    };
    
    // Save the request body to a file for reference
    await writeFile(
      path.join(testFolder, 'request.json'), 
      JSON.stringify(requestBody, null, 2)
    );
    console.log("Request body saved to request.json");
    
    // In a real scenario, we would make an actual HTTP request
    // For this simulation, we'll directly call the functions
    // to demonstrate what would happen on the server side
    console.log("\nIn a real scenario, you would make a POST request to:");
    console.log("/api/generate/sd-fusion");
    console.log("\nWith the body containing:");
    console.log(`- pokemon1Name: ${pokemon1Name}`);
    console.log(`- pokemon2Name: ${pokemon2Name}`);
    console.log(`- pokemon1Image: [URL or base64 string]`);
    console.log(`- pokemon2Image: [URL or base64 string]`);
    console.log(`- advanced: false|true`);
    
    // For API testing, we're just simulating the request flow
    // In a real application, you would use axios or fetch to make the API call:
    /*
    const response = await axios.post(
      'http://localhost:3000/api/generate/sd-fusion',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_AUTH_TOKEN'
        }
      }
    );
    
    // Handle the response
    if (response.data.success) {
      const imageUrl = response.data.imageUrl;
      console.log("Fusion generated successfully:", imageUrl);
      
      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imagePath = path.join(testFolder, "api-fusion-result.webp");
      await writeFile(imagePath, Buffer.from(imageResponse.data));
      console.log(`Image downloaded and saved to ${imagePath}`);
    } else {
      console.error("API request failed:", response.data.error);
    }
    */
    
    console.log("\nTo test this API directly, you need to:");
    console.log("1. Run your Next.js application with 'npm run dev'");
    console.log("2. Make a POST request to the API endpoint with appropriate authentication");
    console.log("3. Handle the response which will include the generated image URL");
    
  } catch (error) {
    console.error("Error in API simulation:", error);
  }
}

// Run the simulation
simulateApiRequest().then(() => {
  console.log("\nAPI simulation completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 