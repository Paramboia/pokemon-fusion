// Test OpenAI image editing endpoint integration with our API
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testImageEditingIntegration() {
  try {
    console.log("\n=== Testing OpenAI Image Editing Integration ===");
    
    // Define test data
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
    
    console.log(`Testing fusion between sources: ${pokemon1.id} and ${pokemon2.id}`);
    
    // Call our API endpoint that uses the new OpenAI image editing function
    const apiUrl = 'http://localhost:3000/api/generate';
    
    const response = await axios.post(apiUrl, {
      pokemon1Id: pokemon1.id,
      pokemon2Id: pokemon2.id,
      pokemon1Name: pokemon1.name,
      pokemon2Name: pokemon2.name,
      pokemon1ImageUrl: pokemon1.imageUrl,
      pokemon2ImageUrl: pokemon2.imageUrl,
      fusionName: `Fusion ${Date.now()}`,
      useImageEditing: true // Flag to use the new image editing approach
    });
    
    console.log("API Response Status:", response.status);
    
    if (response.data && response.data.output) {
      // Download the generated image
      const outputDir = path.join(__dirname, 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const imageResponse = await axios.get(response.data.output, { responseType: 'arraybuffer' });
      const imagePath = path.join(outputDir, `api-test-fusion.png`);
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
      console.log(`Image downloaded and saved to ${imagePath}`);
    } else {
      console.log("No image URL in the response");
      console.log("Response data:", response.data);
    }
    
  } catch (error) {
    console.error("Error testing the API:", error);
    
    if (error.response) {
      console.error("API error details:", {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Run the test
testImageEditingIntegration().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 