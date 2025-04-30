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

// Define the enhancement prompt
const ENHANCEMENT_PROMPT = `Use the uploaded image as inspiration.
Recreate the same figure design, keeping the body structure, pose, key features intact, and same color palette.
Only improve the artistic quality by using clean, smooth outlines, cel-shaded coloring, soft shading, and vivid colors.
The final style should be teenager-friendly, early 2000s anime-inspired, and polished.
Do not change the figure into a different animal, and do not change its overall body orientation.
Ensure the background is transparent.`;

// Test configuration
const TEST_CONFIG = {
  pokemon1Name: 'gengar',
  pokemon2Name: 'tauros',
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

// Function to create a timeout promise that rejects after a specified time
function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

// Implementation of generateWithReplicateBlend based on app/api/generate/replicate-blend.ts
async function generateWithReplicateBlend(pokemon1Name, pokemon2Name, processedImage1, processedImage2) {
  const requestId = `replicate-blend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] REPLICATE BLEND - START - ${pokemon1Name} + ${pokemon2Name}`);
    console.log(`[${requestId}] REPLICATE BLEND - API Token check: ${replicate.auth ? 'present' : 'missing'}`);

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

// Implementation of enhanceWithDirectGeneration based on updated app/api/generate/dalle.ts
async function enhanceWithDirectGeneration(pokemon1Name, pokemon2Name, imageUrl) {
  const requestId = `gpt-enhance-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  const ENHANCEMENT_TIMEOUT = 60000; // 60 seconds for test script
  
  console.log(`[${requestId}] GPT ENHANCEMENT - START - ${pokemon1Name} + ${pokemon2Name}`);
  console.log(`[${requestId}] GPT ENHANCEMENT - Original image URL: ${imageUrl?.substring(0, 50)}...`);
  
  // If no OpenAI API key, just return the original image
  if (!openai.apiKey) {
    console.warn(`[${requestId}] GPT ENHANCEMENT - SKIPPED - No OpenAI API key, using original image directly`);
    return imageUrl;
  }
  
  try {
    console.log(`[${requestId}] GPT ENHANCEMENT - API CALL STARTING`);
    
    console.log(`[${requestId}] GPT ENHANCEMENT - Using GPT-image-1 for enhancement`);
    
    // Use Promise.race to add an additional timeout layer
    const response = await Promise.race([
      openai.images.generate({
        model: "gpt-image-1",
        prompt: ENHANCEMENT_PROMPT,
        n: 1,
        size: "1024x1024",       // Square format for equal dimensions
        quality: "high",  // High quality - API accepts 'low', 'medium', 'high', 'auto' (not 'hd')
        background:"transparent",       // Transparent background
        moderation: "low"        // Less restrictive filtering
        // Note: Other parameters are not supported in the Node.js SDK
        // Based on the error messages, we'll keep it simple
      }),
      timeout(ENHANCEMENT_TIMEOUT * 0.8) // 80% of the main timeout
    ]).catch(err => {
      console.error(`[${requestId}] GPT ENHANCEMENT - Generation failed: ${err.message}`);
      // Continue with original image instead of throwing an error
      return null;
    });
    
    // If we got null from the catch block, return the original image
    if (!response) {
      console.log(`[${requestId}] GPT ENHANCEMENT - Falling back to original image due to error`);
      return imageUrl;
    }
    
    console.log(`[${requestId}] GPT ENHANCEMENT - Generation completed`);
    
    const requestDuration = Date.now() - startTime;
    console.log(`[${requestId}] GPT ENHANCEMENT - API CALL COMPLETED in ${requestDuration}ms`);
    
    if (!response?.data || response.data.length === 0) {
      console.error(`[${requestId}] GPT ENHANCEMENT - ERROR: Empty response data`);
      return imageUrl;
    }

    // Log the complete response structure
    console.log(`[${requestId}] GPT ENHANCEMENT - Full response structure:`, JSON.stringify({
      hasData: !!response.data,
      dataLength: response.data?.length,
      firstItemKeys: response.data?.[0] ? Object.keys(response.data[0]) : [],
      hasUrl: !!response.data?.[0]?.url,
      hasB64: !!response.data?.[0]?.b64_json,
      revisedPrompt: response.data?.[0]?.revised_prompt
    }, null, 2));

    // Handle the response (URL or base64)
    if (response.data[0]?.url) {
      const newImageUrl = response.data[0].url;
      console.log(`[${requestId}] GPT ENHANCEMENT - SUCCESS: Generated URL: ${newImageUrl.substring(0, 50)}...`);
      return newImageUrl;
    }
    
    // Handle base64 data - for gpt-image-1, we get b64_json instead of URL
    if (response.data[0]?.b64_json) {
      console.log(`[${requestId}] GPT ENHANCEMENT - Received base64 image data`);
      
      try {
        // For the test script, we CAN save the base64 data to a file
        const b64Data = response.data[0].b64_json;
        const outputPath = path.join(TEST_CONFIG.outputDir, `gpt-enhanced-${Date.now()}.png`);
        
        // Write the base64 data to a file
        fs.writeFileSync(outputPath, Buffer.from(b64Data, 'base64'));
        console.log(`[${requestId}] GPT ENHANCEMENT - Saved base64 image to: ${outputPath}`);
        
        // Return the local file path for the test
        console.log(`[${requestId}] GPT ENHANCEMENT - SUCCESS: Generated and saved image to: ${outputPath}`);
        return outputPath;
      } catch (saveError) {
        console.error(`[${requestId}] GPT ENHANCEMENT - Error saving base64 image:`, saveError);
        return imageUrl; // Fallback to original URL if saving fails
      }
    }
    
    // Handle revised_prompt field (sometimes present in gpt-image-1 responses)
    if (response.data[0]?.revised_prompt) {
      console.log(`[${requestId}] GPT ENHANCEMENT - Revised prompt: ${response.data[0].revised_prompt.substring(0, 100)}...`);
    }

    console.error(`[${requestId}] GPT ENHANCEMENT - No image URL or base64 data in response`);
    return imageUrl;
  } catch (error) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Error:`, error);
    return imageUrl;
  }
}

// Main test function
async function runTest() {
  try {
    console.log('=== Starting Replicate Blend + GPT Enhancement Test ===');
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
    
    // Step 3: Enhance the image with GPT-image-1 (pass URL directly)
    console.log('\n[Step 3] Enhancing image with GPT-image-1 (URL-only approach)...');
    
    // Ensure the enhancement is enabled
    process.env.USE_GPT_VISION_ENHANCEMENT = process.env.USE_GPT_VISION_ENHANCEMENT || 'true';
    console.log(`Using GPT Vision Enhancement: ${process.env.USE_GPT_VISION_ENHANCEMENT}`);
    
    console.time('GPT Enhancement');
    const enhancedImageUrl = await enhanceWithDirectGeneration(
      TEST_CONFIG.pokemon1Name,
      TEST_CONFIG.pokemon2Name,
      blendImageUrl
    );
    console.timeEnd('GPT Enhancement');
    
    if (!enhancedImageUrl) {
      throw new Error('Failed to enhance image with GPT-image-1');
    }
    
    console.log(`Enhanced image URL: ${enhancedImageUrl.substring(0, 50)}...`);
    
    // Step 4: Save the final enhanced image (for verification)
    console.log('\n[Step 4] Saving only the final enhanced image for verification...');
    let enhancedImagePath;
    
    // Check if the enhancedImageUrl is a URL or a local file path
    if (enhancedImageUrl.startsWith('http')) {
      // It's a URL, so download it
      enhancedImagePath = path.join(TEST_CONFIG.outputDir, 'gpt-enhanced-direct-url.png');
      await saveImageFromUrl(enhancedImageUrl, enhancedImagePath);
    } else {
      // It's already a local file path, just use it
      enhancedImagePath = enhancedImageUrl;
      console.log(`Using already saved file at: ${enhancedImagePath}`);
    }
    
    console.log('\n=== Test Completed Successfully ===');
    console.log(`Final Enhanced Image: ${enhancedImagePath}`);
    console.log('NOTE: Using URL-based approach with base64 fallback for GPT-image-1');
    
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runTest(); 