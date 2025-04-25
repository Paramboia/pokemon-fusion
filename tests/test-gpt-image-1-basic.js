// Test GPT-Image-1 model for basic image generation
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testBasicImageGeneration() {
  try {
    console.log("\n=== Testing GPT-Image-1 for Basic Image Generation ===");
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'tests', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a simple prompt that avoids IP concerns
    const prompt = `Create a high-quality digital artwork of a cute, friendly dragon-like creature sitting on a rock. 
      The creature should be orange with small wings and a flame on its tail.
      Use a cartoonish style with a simple background.`;
    
    console.log("Running GPT-Image-1 with prompt:", prompt);
    
    // Use the OpenAI client for the API call using the generations endpoint
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });
    
    // Process and save results
    if (result.data && result.data.length > 0) {
      const imageData = result.data[0];
      const outputFilename = "dragon-creature";
      
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
        // Save the decoded image
        const imagePath = path.join(outputDir, `${outputFilename}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageData.b64_json, 'base64'));
        console.log(`Image saved to ${imagePath}`);
      }
      
      console.log("Success! The image was generated successfully.");
    }
    
  } catch (error) {
    console.error("Error in GPT-Image-1 image generation test:", error);
    
    if (error.response && error.response.data) {
      console.error("API Error response:", error.response.status);
      console.error("API Error details:", error.response.data);
    } else if (error.error) {
      console.error("API Error details:", error.error.message);
      
      if (error.error.code === 'content_policy_violation' || 
          (error.status === 400 && error.error.message?.includes('safety system'))) {
        console.log("\nThe prompt was rejected by the moderation system.");
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
testBasicImageGeneration().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 