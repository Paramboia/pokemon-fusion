// Test Stability AI's Stable Diffusion 3.5 model with image inputs for Pokemon fusion
require('dotenv').config({ path: '.env.local' });
const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeFile, readFile } = require('fs/promises');

// Initialize the Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testStableDiffusion35WithImage() {
  try {
    console.log("\n=== Testing Stable Diffusion 3.5 with Image Input ===");
    console.log("API Token check:", process.env.REPLICATE_API_TOKEN?.substring(0, 5) + "...");
    
    // Define image paths
    const tempDir = path.join(__dirname, 'temp');
    const charizardImagePath = path.join(tempDir, 'charizard.png');
    const charmanderImagePath = path.join(tempDir, 'charmander.png');
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Create a subfolder for image-to-image results
    const imgToImgFolder = path.join(outputDir, 'sd35-img2img');
    if (!fs.existsSync(imgToImgFolder)) {
      fs.mkdirSync(imgToImgFolder);
    }
    
    console.log("Reading image files...");
    
    // Read the image files
    const charizardBuffer = await readFile(charizardImagePath);
    const charmanderBuffer = await readFile(charmanderImagePath);
    
    // Convert to base64 (for demonstration purposes)
    const charizardBase64 = `data:image/png;base64,${charizardBuffer.toString('base64')}`;
    
    console.log("Setting up image-to-image generation...");
    console.log("Source image: charizard.png");
    
    // Create the input for the Stable Diffusion 3.5 model with image
    const input = {
      prompt: "Transform this Charizard into a fusion with Pikachu. Electric dragon with yellow features, lightning bolts, and Pikachu's red cheeks. High quality digital art.",
      image: charizardBase64, // Pass image as base64
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 7.5,
      image_guidance_scale: 1.5, // Control how much influence the input image has
      apply_watermark: false
    };
    
    // Run the model
    console.log("Running Stable Diffusion 3.5 model with image input...");
    console.log("This may take a few minutes...");
    
    const output = await replicate.run(
      "stability-ai/stable-diffusion-3.5-large",
      { input }
    );
    
    if (output && output.length > 0) {
      console.log("Model output received:", output);
      
      // Save the output URL to a file
      const outputUrlPath = path.join(imgToImgFolder, "charizard-pikachu-img2img-url.txt");
      fs.writeFileSync(outputUrlPath, output[0]);
      console.log(`Image URL saved to ${outputUrlPath}`);
      
      // Download and save the generated images
      try {
        for (const [index, imageUrl] of output.entries()) {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imagePath = path.join(imgToImgFolder, `charizard-pikachu-img2img-${index}.webp`);
          await writeFile(imagePath, Buffer.from(imageResponse.data));
          console.log(`Image downloaded and saved to ${imagePath}`);
        }
        
        console.log("Success! Stable Diffusion 3.5 generated images from the input image.");
      } catch (downloadError) {
        console.error('Error downloading the image:', downloadError.message);
      }
    } else {
      console.error("No output received from Stable Diffusion 3.5 model");
    }
    
    // Now try with the second image (Charmander) - optional test
    console.log("\n--- Testing with second image (Charmander) ---");
    
    // Create a function to run another test if desired
    async function testWithCharmander() {
      // Convert to base64
      const charmanderBase64 = `data:image/png;base64,${charmanderBuffer.toString('base64')}`;
      
      // Create the input for the second test
      const input2 = {
        prompt: "Transform this Charmander into a fusion with Squirtle. Fire-water type Pokemon with blue shell elements, water effects, and flame tail. High quality digital art.",
        image: charmanderBase64,
        width: 1024,
        height: 1024,
        num_outputs: 1,
        guidance_scale: 7.5,
        image_guidance_scale: 1.5
      };
      
      console.log("Running model with Charmander image...");
      
      const output2 = await replicate.run(
        "stability-ai/stable-diffusion-3.5-large",
        { input: input2 }
      );
      
      if (output2 && output2.length > 0) {
        console.log("Model output received for second test");
        
        // Save and download the second test outputs
        const outputUrlPath2 = path.join(imgToImgFolder, "charmander-squirtle-img2img-url.txt");
        fs.writeFileSync(outputUrlPath2, output2[0]);
        
        for (const [index, imageUrl] of output2.entries()) {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imagePath = path.join(imgToImgFolder, `charmander-squirtle-img2img-${index}.webp`);
          await writeFile(imagePath, Buffer.from(imageResponse.data));
          console.log(`Second test image downloaded and saved to ${imagePath}`);
        }
        
        console.log("Success on second image test!");
      }
    }
    
    // Run the second test (comment out if not needed)
    await testWithCharmander();
    
  } catch (error) {
    console.error("Error using Replicate:", error);
    
    // Check for common errors
    if (error.message) {
      if (error.message.includes('API token') || error.message.includes('auth')) {
        console.error("\nAPI token error. Please check your REPLICATE_API_TOKEN environment variable.");
        console.error("You can sign up for a free Replicate account at https://replicate.com/");
      } else if (error.message.includes('rate limit')) {
        console.error("\nRate limit reached. Please try again later.");
      } else if (error.message.includes('file too large') || error.message.includes('size')) {
        console.error("\nImage file size error. Try with a smaller image or resize before encoding.");
      }
    }
  }
}

// Run the test
testStableDiffusion35WithImage().then(() => {
  console.log("\nTest completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 