// Test script to verify the integration between replicate-blend and dalle enhancement
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const OpenAI = require('openai');

// Check if environment variables are properly set
console.log('REPLICATE_API_TOKEN available:', !!process.env.REPLICATE_API_TOKEN);
console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);

// Initialize Replicate client with timeout
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(90000) // 90 second timeout
    });
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 600000, // 10 minutes
  maxRetries: 2
});

// Test configuration
const TEST_CONFIG = {
  pokemon1Name: 'Charmander',
  pokemon2Name: 'Squirtle',
  pokemon1ImagePath: path.join(__dirname, 'temp', 'Captura de pantalla 2025-04-26 155241.png'),
  pokemon2ImagePath: path.join(__dirname, 'temp', 'Captura de pantalla 2025-04-26 155319.png'),
  outputDir: path.join(__dirname, 'output')
};

// Create output directory if it doesn't exist
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

// Convert image file to base64 for API consumption
function imageFileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

// Save image from URL to file
async function saveImageFromUrl(url, outputPath) {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  console.log(`Image saved to: ${outputPath}`);
}

// Implementation of generateWithReplicateBlend based on app/api/generate/replicate-blend.ts
async function generateWithReplicateBlend(pokemon1Name, pokemon2Name, processedImage1, processedImage2) {
  const requestId = `replicate-blend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] REPLICATE BLEND - START - ${pokemon1Name} + ${pokemon2Name}`);
    console.log(`[${requestId}] REPLICATE BLEND - API Token check: ${process.env.REPLICATE_API_TOKEN ? 'present' : 'missing'}`);

    // Ensure we have both images
    if (!processedImage1 || !processedImage2) {
      console.error(`[${requestId}] REPLICATE BLEND - ERROR - Missing image data`);
      return null;
    }

    // Create the input for the Replicate blend-images model
    const input = {
      image1: processedImage1,
      image2: processedImage2,
      prompt: `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                The new Pokémon should retain the same pose, angle, and overall body positioning as ${pokemon1Name}'s official artwork. 
                Design: Incorporate key physical features from both ${pokemon1Name} and ${pokemon2Name}, blending them into a seamless and natural-looking hybrid. 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Match the exact pose and three-quarter front-facing angle of ${pokemon1Name}.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`, 
    };

    console.log(`[${requestId}] REPLICATE BLEND - Running model with input`);
    
    // Run the model
    const output = await replicate.run(
      "charlesmccarthy/blend-images:1ed8aaaa04fa84f0c1191679e765d209b94866f6503038416dcbcb340fede892",
      { input }
    );

    console.log(`[${requestId}] REPLICATE BLEND - API CALL COMPLETED in ${Date.now() - startTime}ms`);

    // Check output
    if (!output) {
      console.error(`[${requestId}] REPLICATE BLEND - ERROR - No output from model`);
      return null;
    }

    console.log(`[${requestId}] REPLICATE BLEND - SUCCESS - Generated image URL: ${typeof output === 'string' ? output.substring(0, 50) + '...' : 'invalid format'}`);
    
    // Return output URL
    return typeof output === 'string' ? output : null;
  } catch (error) {
    console.error(`[${requestId}] REPLICATE BLEND - ERROR:`, error);
    return null;
  }
}

// Implementation of enhanceWithDirectGeneration based on app/api/generate/dalle.ts
async function enhanceWithDirectGeneration(pokemon1Name, pokemon2Name, imageUrl) {
  const requestId = `dalle-enhance-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  
  console.log(`[${requestId}] DALLE ENHANCEMENT - START - ${pokemon1Name} + ${pokemon2Name}`);
  console.log(`[${requestId}] DALLE ENHANCEMENT - Original image URL: ${imageUrl?.substring(0, 50)}...`);
  
  // If no OpenAI API key, just return the original image
  if (!process.env.OPENAI_API_KEY) {
    console.warn(`[${requestId}] DALLE ENHANCEMENT - SKIPPED - No OpenAI API key, using original image directly`);
    return imageUrl;
  }
  
  try {
    console.log(`[${requestId}] DALLE ENHANCEMENT - API CALL STARTING`);
    
    // Create a very detailed prompt that describes the fusion without needing the image input
    const detailedPrompt = `Make the image better, ensure clean animation-style with smooth outlines, maintain kid-friendly appearance, and ensure completely pure white background`;
    
    console.log(`[${requestId}] DALLE ENHANCEMENT - Using text-to-image generation with prompt: ${detailedPrompt}`);
    
    // Generate a completely new image using text-to-image
    const response = await openai.images.generate({
      model: "dall-e-3", // Use DALL-E 3 for higher quality
      prompt: detailedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });
    
    console.log(`[${requestId}] DALLE ENHANCEMENT - Text-to-image generation completed`);
    
    const requestDuration = Date.now() - startTime;
    console.log(`[${requestId}] DALLE ENHANCEMENT - API CALL COMPLETED in ${requestDuration}ms`);
    
    if (!response?.data || response.data.length === 0) {
      console.error(`[${requestId}] DALLE ENHANCEMENT - ERROR: Empty response data`);
      return imageUrl;
    }

    // Handle the response (URL or base64)
    if (response.data[0]?.url) {
      const newImageUrl = response.data[0].url;
      console.log(`[${requestId}] DALLE ENHANCEMENT - SUCCESS: Generated URL: ${newImageUrl.substring(0, 50)}...`);
      return newImageUrl;
    }

    console.error(`[${requestId}] DALLE ENHANCEMENT - No image URL in response data`);
    return imageUrl;
  } catch (error) {
    console.error(`[${requestId}] DALLE ENHANCEMENT - Error:`, error);
    return imageUrl;
  }
}

// Main test function
async function runTest() {
  try {
    console.log('=== Starting Replicate Blend + DALLE Enhancement Test ===');
    console.log(`Testing with Pokémon: ${TEST_CONFIG.pokemon1Name} + ${TEST_CONFIG.pokemon2Name}`);
    
    // Step 1: Prepare the image data
    console.log('\n[Step 1] Preparing image data...');
    const image1Base64 = imageFileToBase64(TEST_CONFIG.pokemon1ImagePath);
    const image2Base64 = imageFileToBase64(TEST_CONFIG.pokemon2ImagePath);
    console.log('Images converted to base64 format');
    
    // Step 2: Generate initial fusion with Replicate Blend
    console.log('\n[Step 2] Generating fusion with Replicate Blend...');
    console.time('Replicate Blend Generation');
    const blendImageUrl = await generateWithReplicateBlend(
      TEST_CONFIG.pokemon1Name,
      TEST_CONFIG.pokemon2Name,
      image1Base64,
      image2Base64
    );
    console.timeEnd('Replicate Blend Generation');
    
    if (!blendImageUrl) {
      throw new Error('Failed to generate image with Replicate Blend');
    }
    
    console.log(`Blend image URL: ${blendImageUrl.substring(0, 50)}...`);
    
    // Step 3: Enhance the image with DALLE (pass URL directly)
    console.log('\n[Step 3] Enhancing image with DALLE (URL-only approach)...');
    
    // Set environment variable to enable GPT Vision enhancement for the test
    process.env.USE_GPT_VISION_ENHANCEMENT = 'true';
    
    console.time('DALLE Enhancement');
    const enhancedImageUrl = await enhanceWithDirectGeneration(
      TEST_CONFIG.pokemon1Name,
      TEST_CONFIG.pokemon2Name,
      blendImageUrl
    );
    console.timeEnd('DALLE Enhancement');
    
    if (!enhancedImageUrl) {
      throw new Error('Failed to enhance image with DALLE');
    }
    
    console.log(`Enhanced image URL: ${enhancedImageUrl.substring(0, 50)}...`);
    
    // Save ONLY the final enhanced image (for verification)
    console.log('\n[Step 4] Saving only the final enhanced image for verification...');
    const enhancedImagePath = path.join(TEST_CONFIG.outputDir, 'dalle-enhanced-direct-url.png');
    await saveImageFromUrl(enhancedImageUrl, enhancedImagePath);
    
    console.log('\n=== Test Completed Successfully ===');
    console.log(`Final Enhanced Image: ${enhancedImagePath}`);
    console.log('NOTE: No intermediate files were saved - used direct URL passing between services');
    
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runTest(); 