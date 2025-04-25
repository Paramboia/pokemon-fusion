// Test GPT-Image-1 model for image merging
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testImageMerge() {
  try {
    console.log("\n=== Testing GPT-Image-1 for Image Merging ===");
    
    // Define image paths
    const image1Path = path.join(process.cwd(), 'public', 'pokemon', 'charizard.png');
    const image2Path = path.join(process.cwd(), 'public', 'pokemon', 'charmander.png');
    
    console.log(`Attempting to merge two character images`);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'tests', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Verify images exist
    if (!fs.existsSync(image1Path) || !fs.existsSync(image2Path)) {
      throw new Error("Source images not found! Check the paths.");
    }
    
    console.log("Images found successfully");
    
    // Create the FormData instance for the API request
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', 'Merge these two character images into one cohesive design that combines features from both');
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    
    // Read the images as streams and append them to the form data
    formData.append('image', fs.createReadStream(image1Path), {
      filename: 'image1.png',
      contentType: 'image/png'
    });
    
    // For the second image, we'll use the mask field as a workaround to provide a second image
    formData.append('mask', fs.createReadStream(image2Path), {
      filename: 'image2.png',
      contentType: 'image/png'
    });
    
    console.log("Sending API request...");
    
    // Use direct API call to ensure proper formatting
    const response = await axios.post(
      'https://api.openai.com/v1/images/edits',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
      }
    );
    
    // Process and save results
    if (response.data && response.data.data && response.data.data.length > 0) {
      const imageData = response.data.data[0];
      const outputFilename = "merged-character";
      
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
      
      console.log("Success! The images were merged successfully.");
    }
    
  } catch (error) {
    console.error("Error in GPT-Image-1 image merging test:", error);
    
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
testImageMerge().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 