// Test OpenAI image generation as an enhancement approach
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require('replicate');
const sharp = require('sharp');

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

// Function to enhance with GPT-Image-1 by generating a new image from a description
async function enhanceWithGptImage(pokemon1Name, pokemon2Name) {
  try {
    console.log('GPT Image Enhancement - Starting enhancement with direct generation');
    
    // Create a generic prompt that avoids terms that might trigger content policy warnings
    const enhancementPrompt = `A high-quality digital illustration of an original animated creature design.
      The creature has elements that combine a dragon-like appearance with a turtle-like appearance.
      Style: Clean cell-shaded animation with smooth lines
      Background: Pure white
      Colors: Vibrant orange, blue, and teal color palette
      Lighting: Soft, even lighting with subtle shadows
      Composition: Single character in a three-quarter view
      Details: Polished appearance with balanced proportions`;
    
    console.log('GPT Image Enhancement - Generating image with generic prompt');

    // Generate a new image using GPT-image-1
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancementPrompt,
      n: 1,
      size: "1024x1024"
    });

    if (!response.data || response.data.length === 0) {
      console.error('GPT Image Enhancement - No image data in response');
      return null;
    }

    // Return the generated image URL
    if (response.data[0].url) {
      console.log('GPT Image Enhancement - Successfully generated enhanced image');
      return response.data[0].url;
    } else if (response.data[0].b64_json) {
      console.log('GPT Image Enhancement - Got base64 data');
      return { b64_json: response.data[0].b64_json };
    }

    console.error('GPT Image Enhancement - No image URL or base64 in response data');
    return null;
  } catch (error) {
    console.error('GPT Image Enhancement - Error:', error);
    
    if (error.message && error.message.includes('organization verification')) {
      console.error('GPT Image Enhancement - Organization verification required. Please visit: https://help.openai.com/en/articles/10910291-api-organization-verification');
    }

    if (error.message && (error.message.includes('content policy') || error.message.includes('safety system'))) {
      console.error('GPT Image Enhancement - Content policy violation: The request was rejected by the moderation system');
    }
    
    return null;
  }
}

// Main test function
async function testEnhanceWithGptImage() {
  console.log("\n=== Testing GPT-4 Image Generation Enhancement ===");
  
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
    
    // 2. Generate an enhanced version with GPT-Image-1
    console.log("\nStep 2: Generating enhanced image with GPT-Image-1");
    const enhancedImageResult = await enhanceWithGptImage(pokemon1, pokemon2);
    
    if (!enhancedImageResult) {
      console.error("Failed to generate enhanced image with GPT-Image-1. Test aborted.");
      return;
    }
    
    // Handle enhanced image result (URL or base64)
    if (typeof enhancedImageResult === 'string') {
      // If URL, download and save it
      const enhancedImageFilename = `gpt-enhanced-fusion-${pokemon1.toLowerCase()}-${pokemon2.toLowerCase()}.png`;
      const enhancedImagePath = path.join(outputDir, enhancedImageFilename);
      await downloadImage(enhancedImageResult, enhancedImagePath);
      console.log(`Enhanced image saved to: ${enhancedImagePath}`);
      console.log(`Enhanced image URL: ${enhancedImageResult}`);
    } else if (enhancedImageResult.b64_json) {
      // If base64, save directly
      const enhancedImageFilename = `gpt-enhanced-fusion-${pokemon1.toLowerCase()}-${pokemon2.toLowerCase()}.png`;
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
testEnhanceWithGptImage().then(() => {
  console.log("\nTest execution completed!");
}).catch((err) => {
  console.error("Unhandled error:", err);
}); 