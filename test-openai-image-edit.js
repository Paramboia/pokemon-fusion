// Test OpenAI image editing endpoint for Pokemon fusion
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Readable } = require('stream');
const FormData = require('form-data');

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIImageEdit() {
  try {
    console.log("\n=== Testing OpenAI Image Editing for Pokemon Fusion ===");
    
    // Define Pokemon data
    const pokemon1 = {
      name: "Pikachu",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
    };
    
    const pokemon2 = {
      name: "Charmander",
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png"
    };
    
    console.log(`Generating fusion between: ${pokemon1.name} and ${pokemon2.name}`);
    
    // Download the Pokemon images first
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const pokemon1Path = path.join(outputDir, 'pokemon1.png');
    const pokemon2Path = path.join(outputDir, 'pokemon2.png');
    
    // Download images
    const [pokemon1Response, pokemon2Response] = await Promise.all([
      axios.get(pokemon1.imageUrl, { responseType: 'arraybuffer' }),
      axios.get(pokemon2.imageUrl, { responseType: 'arraybuffer' })
    ]);
    
    fs.writeFileSync(pokemon1Path, pokemon1Response.data);
    fs.writeFileSync(pokemon2Path, pokemon2Response.data);
    
    console.log("Pokemon images downloaded successfully");
    
    // Create the image editing request
    const prompt = `Create a character fusion that combines visual elements from both reference images:
      - Use the first image as the base structure and maintain its pose
      - Incorporate key visual elements from the second image such as color patterns and distinctive features
      - Maintain the same art style as both original images
      - Keep a clean white background
      - The fusion should look natural and cohesive`;
    
    console.log("Running image editing with prompt:", prompt);
    
    // Create a FormData instance for proper content type handling
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    
    // Append the image with explicit filename and content type
    formData.append('image', fs.createReadStream(pokemon1Path), {
      filename: 'pokemon1.png',
      contentType: 'image/png',
    });
    
    // Use the OpenAI API with the properly formatted request
    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: fs.createReadStream(pokemon1Path),
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });
    
    // Save the results
    if (result.data && result.data.length > 0) {
      const imageData = result.data[0];
      const outputFilename = "openai-edit-fusion";
      
      if (imageData.url) {
        // Save URL to file
        const outputPath = path.join(outputDir, `${outputFilename}-url.txt`);
        fs.writeFileSync(outputPath, imageData.url);
        console.log(`Image URL saved to ${outputPath}`);
        
        // Download and save the image
        const imageResponse = await axios.get(imageData.url, { responseType: 'arraybuffer' });
        const imagePath = path.join(outputDir, `${outputFilename}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
        console.log(`Image downloaded and saved to ${imagePath}`);
      } else if (imageData.b64_json) {
        // Save base64 data to file
        const outputPath = path.join(outputDir, `${outputFilename}-base64.txt`);
        fs.writeFileSync(outputPath, imageData.b64_json);
        console.log(`Image base64 data saved to ${outputPath}`);
        
        // Save the decoded image
        const imagePath = path.join(outputDir, `${outputFilename}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageData.b64_json, 'base64'));
        console.log(`Image saved to ${imagePath}`);
      }
      
      console.log("Success! The image editing test completed.");
    }
    
  } catch (error) {
    console.error("Error in OpenAI image editing test:", error);
    
    if (error.error) {
      if (error.error.code === 'content_policy_violation' || 
          (error.status === 400 && error.error.message?.includes('safety system'))) {
        console.log("\nThe prompt was rejected by the moderation system.");
      } else {
        console.error("API Error details:", error.error.message);
      }
    } else if (error.message) {
      console.error("Error message:", error.message);
      
      if (error.message.includes('organization verification')) {
        console.log("\n=== ORGANIZATION VERIFICATION REQUIRED ===");
        console.log("To access gpt-image-1, please complete organization verification:");
        console.log("https://help.openai.com/en/articles/10910291-api-organization-verification");
      }
    }
  }
}

// Run the test
testOpenAIImageEdit().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 