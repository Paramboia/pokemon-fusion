// Test comparing all three image generation approaches
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testImageGenerationComparison() {
  try {
    console.log("\n=== Comparing Image Generation Approaches ===");
    
    // Define test data
    const pokemon1 = {
      id: 25,
      name: "Pikachu",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
    };
    
    const pokemon2 = {
      id: 6,
      name: "Charizard",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png"
    };
    
    // Test parameters
    const baseUrl = 'http://localhost:3000/api/generate';
    const fusionName = `Fusion-${Date.now()}`;
    const outputDir = path.join(__dirname, 'comparison-output');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Run tests with different methods and mask types
    const testMethods = [
      { name: "replicate-blend", useReplicate: true, useOpenAI: false, useImageEditing: false },
      { name: "openai-dalle", useReplicate: false, useOpenAI: true, useImageEditing: false },
      { name: "openai-edit-lower", useReplicate: false, useOpenAI: true, useImageEditing: true, maskType: "lower-half" },
      { name: "openai-edit-upper", useReplicate: false, useOpenAI: true, useImageEditing: true, maskType: "upper-half" },
      { name: "openai-edit-left", useReplicate: false, useOpenAI: true, useImageEditing: true, maskType: "left-half" },
      { name: "openai-edit-right", useReplicate: false, useOpenAI: true, useImageEditing: true, maskType: "right-half" }
    ];
    
    for (const method of testMethods) {
      console.log(`\nTesting method: ${method.name}`);
      
      try {
        const response = await axios.post(baseUrl, {
          pokemon1Id: pokemon1.id,
          pokemon2Id: pokemon2.id,
          pokemon1Name: pokemon1.name,
          pokemon2Name: pokemon2.name,
          pokemon1ImageUrl: pokemon1.imageUrl,
          pokemon2ImageUrl: pokemon2.imageUrl,
          fusionName: fusionName,
          useImageEditing: method.useImageEditing,
          maskType: method.maskType
        });
        
        console.log(`${method.name} response status:`, response.status);
        
        if (response.data && response.data.output) {
          // Download the generated image
          const imageUrl = response.data.output;
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imagePath = path.join(outputDir, `${method.name}-fusion.png`);
          fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
          console.log(`Image saved to: ${imagePath}`);
        } else {
          console.log(`${method.name} - No image URL in response`);
          console.log("Response data:", response.data);
        }
      } catch (error) {
        console.error(`Error testing ${method.name}:`, error.message);
        if (error.response) {
          console.error("Response error details:", {
            status: error.response.status,
            data: error.response.data
          });
        }
      }
      
      // Add a short delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log("\nTest comparison completed!");
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

// Run the test
testImageGenerationComparison(); 