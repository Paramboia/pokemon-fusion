// Test GPT-4 Vision enhancement of a Stable Diffusion generated image
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require('replicate');
const FormData = require('form-data');
const sharp = require('sharp'); // Add sharp for image conversion

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Function to download an image from a URL and save it to a file path
async function downloadImage(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    // Check if the output path is for a PNG
    if (outputPath.toLowerCase().endsWith('.png')) {
      // Convert from webp (or any format) to PNG using sharp
      await sharp(Buffer.from(response.data))
        .toFormat('png')
        .toFile(outputPath);
    } else {
      // Save as is if not a PNG
      fs.writeFileSync(outputPath, Buffer.from(response.data));
    }
    
    console.log(`Image downloaded and saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Function to enhance an image using GPT-4 Vision (similar to the one in dalle.ts)
async function enhanceImageWithGptVision(imagePath) {
  try {
    console.log('GPT Vision Enhancement - Starting enhancement of image');
    
    // Verify image exists and is readable
    if (!fs.existsSync(imagePath)) {
      console.error(`GPT Vision Enhancement - Image file does not exist: ${imagePath}`);
      return null;
    }
    
    // Ensure the image is in a compatible format (png)
    const pngPath = imagePath.toLowerCase().endsWith('.png') 
      ? imagePath 
      : path.join(path.dirname(imagePath), `${path.basename(imagePath, path.extname(imagePath))}.png`);
    
    if (!imagePath.toLowerCase().endsWith('.png')) {
      console.log('GPT Vision Enhancement - Converting image to PNG format');
      await sharp(imagePath).toFormat('png').toFile(pngPath);
      console.log(`GPT Vision Enhancement - Converted and saved as: ${pngPath}`);
    }
    
    const prompt = `Make this creature more appealing and polished:
      - Refine it to look like an animated character with clean lines
      - Keep the exact same creature design but improve visual clarity
      - Use a clean white background
      - Make the colors more vibrant and cohesive
      - Ensure the proportions are balanced and aesthetically pleasing
      - Keep the same pose and overall design
      - Add subtle shading and highlights for better definition`;

    console.log('GPT Vision Enhancement - Sending request to enhance image');

    // Verify file size and readability
    const stats = fs.statSync(pngPath);
    console.log(`GPT Vision Enhancement - Image file size: ${stats.size} bytes`);
    
    // Verify image file can be read
    const testBuffer = fs.readFileSync(pngPath);
    console.log(`GPT Vision Enhancement - Successfully read image file (${testBuffer.length} bytes)`);

    // Call the OpenAI Vision API with the image file
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: fs.createReadStream(pngPath),
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });

    if (!response.data || response.data.length === 0) {
      console.error('GPT Vision Enhancement - No image data in response');
      return null;
    }

    // Handle the response (URL or base64)
    if (response.data[0].url) {
      console.log('GPT Vision Enhancement - Successfully enhanced image');
      return response.data[0].url;
    } else if (response.data[0].b64_json) {
      console.log('GPT Vision Enhancement - Got base64 data');
      return { b64_json: response.data[0].b64_json };
    }

    console.error('GPT Vision Enhancement - No image URL or base64 in response data');
    return null;
  } catch (error) {
    console.error('GPT Vision Enhancement - Error:', error);
    
    if (error.message && error.message.includes('organization verification')) {
      console.error('GPT Vision Enhancement - Organization verification required. Please visit: https://help.openai.com/en/articles/10910291-api-organization-verification');
    }

    if (error.message && (error.message.includes('content policy') || error.message.includes('safety system'))) {
      console.error('GPT Vision Enhancement - Content policy violation: The request was rejected by the moderation system');
    }
    
    return null;
  }
}

// Function to generate a test image with Stable Diffusion
async function generateWithStableDiffusion(pokemon1Name, pokemon2Name) {
  try {
    console.log('Test - Generating test image with Stable Diffusion');
    
    // Create the fusion prompt
    const fusionPrompt = `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                Design: Incorporate key physical features from both ${pokemon1Name} and ${pokemon2Name}, blending them into a seamless and natural-looking hybrid. 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Three-quarter front-facing angle like typical official Pokémon artwork.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`;

    // Create the input for Stable Diffusion 3.5
    const input = {
      prompt: fusionPrompt,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 8.5,
      apply_watermark: false,
      negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry, multiple pokemon, text, watermark, signature, disfigured"
    };

    console.log('Test - Running Stable Diffusion model');
    
    // Run the model with Replicate
    const output = await replicate.run(
      "stability-ai/stable-diffusion-3.5-large",
      { input }
    );

    // Check output
    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error('Test - No output from Stable Diffusion model');
      return null;
    }

    // Return the first image URL
    console.log('Test - Successfully generated image with Stable Diffusion');
    return output[0];
  } catch (error) {
    console.error('Test - Error generating with Stable Diffusion:', error);
    return null;
  }
}

// Main test function
async function testEnhanceImageWithGptVision() {
  console.log("\n=== Testing GPT-4 Vision Enhancement with Stable Diffusion ===");
  
  try {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'tests', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Pokemon names for the test
    const pokemon1 = "Charizard";
    const pokemon2 = "Blastoise";
    
    // 1. Generate an image with Stable Diffusion
    console.log(`\nStep 1: Generating a ${pokemon1} and ${pokemon2} fusion with Stable Diffusion`);
    const sdImageUrl = await generateWithStableDiffusion(pokemon1, pokemon2);
    
    if (!sdImageUrl) {
      console.error("Failed to generate image with Stable Diffusion. Test aborted.");
      return;
    }
    
    // Save the Stable Diffusion output
    const sdImageFilename = `sd-fusion-${pokemon1.toLowerCase()}-${pokemon2.toLowerCase()}.png`;
    const sdImagePath = path.join(outputDir, sdImageFilename);
    await downloadImage(sdImageUrl, sdImagePath);
    console.log(`Stable Diffusion image saved to: ${sdImagePath}`);
    console.log(`Stable Diffusion image URL: ${sdImageUrl}`);
    
    // 2. Enhance the image with GPT-4 Vision
    console.log("\nStep 2: Enhancing the image with GPT-4 Vision");
    const enhancedImageResult = await enhanceImageWithGptVision(sdImagePath);
    
    if (!enhancedImageResult) {
      console.error("Failed to enhance image with GPT-4 Vision. Test aborted.");
      return;
    }
    
    // Handle enhanced image result (URL or base64)
    if (typeof enhancedImageResult === 'string') {
      // If URL, download and save it
      const enhancedImageFilename = `enhanced-fusion-${pokemon1.toLowerCase()}-${pokemon2.toLowerCase()}.png`;
      const enhancedImagePath = path.join(outputDir, enhancedImageFilename);
      await downloadImage(enhancedImageResult, enhancedImagePath);
      console.log(`Enhanced image saved to: ${enhancedImagePath}`);
      console.log(`Enhanced image URL: ${enhancedImageResult}`);
    } else if (enhancedImageResult.b64_json) {
      // If base64, save directly
      const enhancedImageFilename = `enhanced-fusion-${pokemon1.toLowerCase()}-${pokemon2.toLowerCase()}.png`;
      const enhancedImagePath = path.join(outputDir, enhancedImageFilename);
      fs.writeFileSync(enhancedImagePath, Buffer.from(enhancedImageResult.b64_json, 'base64'));
      console.log(`Enhanced image (from base64) saved to: ${enhancedImagePath}`);
    }
    
    console.log("\nTest completed successfully!");
    
  } catch (error) {
    console.error("Error in test:", error);
    
    if (error.message && error.message.includes('organization verification')) {
      console.log("\n=== ORGANIZATION VERIFICATION REQUIRED ===");
      console.log("To access gpt-image-1, please complete organization verification:");
      console.log("https://help.openai.com/en/articles/10910291-api-organization-verification");
    }
  }
}

// Run the test
testEnhanceImageWithGptVision().then(() => {
  console.log("\nTest execution completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 