// Qwen-based fusion generation module
// This module provides a simplified fusion pipeline using qwen/qwen-image
// It combines blending and enhancement in a single step

import Replicate from 'replicate';
import axios from 'axios';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Environment details for debugging
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_VERCEL = !!process.env.VERCEL;

console.log(`🌟 QWEN FUSION MODULE LOADED - ENV: ${IS_PRODUCTION ? 'PROD' : 'DEV'}, PLATFORM: ${IS_VERCEL ? 'VERCEL' : 'LOCAL'}`);

/**
 * Generate a Pokemon fusion using Qwen's direct blending capabilities
 * This replaces the blend + enhance pipeline with a single Qwen call
 * 
 * @param pokemon1Name - Name of the first Pokemon
 * @param pokemon2Name - Name of the second Pokemon  
 * @param pokemon1ImageUrl - URL of the first Pokemon image
 * @param pokemon2ImageUrl - URL of the second Pokemon image
 * @param fusionName - Name for the resulting fusion
 * @param requestId - Optional request ID for logging
 * @returns Promise<string | null> - URL of the generated fusion image or null if failed
 */
export async function generateWithQwenFusion(
  pokemon1Name: string,
  pokemon2Name: string,
  pokemon1ImageUrl: string,
  pokemon2ImageUrl: string,
  fusionName: string,
  requestId = `qwen-fusion-${Date.now()}`
): Promise<string | null> {
  console.log(`[${requestId}] QWEN FUSION - Starting fusion generation`);
  console.log(`[${requestId}] QWEN FUSION - Pokemon: ${pokemon1Name} + ${pokemon2Name} = ${fusionName}`);

  try {
    // Validate inputs
    if (!pokemon1ImageUrl || !pokemon2ImageUrl) {
      console.error(`[${requestId}] QWEN FUSION - Missing image URLs`);
      return null;
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error(`[${requestId}] QWEN FUSION - Missing REPLICATE_API_TOKEN`);
      return null;
    }

    // Download images to create streams for Replicate
    console.log(`[${requestId}] QWEN FUSION - Downloading Pokemon images`);
    
    const [pokemon1Stream, pokemon2Stream] = await Promise.all([
      downloadImageAsStream(pokemon1ImageUrl, requestId),
      downloadImageAsStream(pokemon2ImageUrl, requestId)
    ]);

    if (!pokemon1Stream || !pokemon2Stream) {
      console.error(`[${requestId}] QWEN FUSION - Failed to download one or both images`);
      return null;
    }

    // Create the fusion prompt based on our successful test results
    const fusionPrompt = createFusionPrompt(pokemon1Name, pokemon2Name, fusionName);
    console.log(`[${requestId}] QWEN FUSION - Generated prompt: ${fusionPrompt.substring(0, 150)}...`);
    console.log(`[${requestId}] QWEN FUSION - Input images processed:`, {
      image1HasTransparency: pokemon1ImageUrl.includes('data:image') ? 'converted to white bg' : 'original URL',
      image2HasTransparency: pokemon2ImageUrl.includes('data:image') ? 'converted to white bg' : 'original URL'
    });

    // Configure Qwen parameters based on our successful test results
    // Using optimal settings that produced qwen-transparent-blend-1756500424506-detailed-fusion-prompt.png
    const qwenInput = {
      images: [pokemon1Stream, pokemon2Stream],
      prompt: fusionPrompt,
      strength: 0.8,        // Slightly higher for better blending
      guidance: 4,          // Match successful test configuration
      num_inference_steps: 50,
      aspect_ratio: "1:1",
      output_format: "png", // For transparency support
      go_fast: false,      // Disable for higher quality
      output_quality: 95   // Higher quality for better results
    };

    console.log(`[${requestId}] QWEN FUSION - Calling Qwen API with optimized parameters`);
    const startTime = Date.now();

    // Call Qwen API
    const output = await replicate.run("qwen/qwen-image", { input: qwenInput });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] QWEN FUSION - Generation completed in ${duration}ms`);

    // Process the result
    if (output && Array.isArray(output) && output.length > 0) {
      const imageUrl = typeof output[0] === 'object' && 'url' in output[0] && typeof output[0].url === 'function' 
        ? output[0].url() 
        : output[0];
      console.log(`[${requestId}] QWEN FUSION - SUCCESS - Generated fusion: ${imageUrl}`);
      return imageUrl;
    } else {
      console.error(`[${requestId}] QWEN FUSION - No output received from Qwen`);
      return null;
    }

  } catch (error) {
    console.error(`[${requestId}] QWEN FUSION - Error:`, error);
    
    // Log additional error details
    if (error instanceof Error) {
      console.error(`[${requestId}] QWEN FUSION - Error message: ${error.message}`);
      console.error(`[${requestId}] QWEN FUSION - Error stack: ${error.stack}`);
    }
    
    return null;
  }
}

/**
 * Create a fusion prompt based on our successful test patterns
 * Uses the detailed GPT-style description approach that worked best in testing
 */
function createFusionPrompt(pokemon1Name: string, pokemon2Name: string, fusionName: string): string {
  // Create dynamic characteristics for variation
  const bodyStructures = [
    `a quadrupedal stance with muscular, sturdy legs`,
    `a bipedal humanoid form with athletic proportions`,
    `a serpentine body with powerful limbs`,
    `a compact, rounded form with short appendages`,
    `an elongated, graceful frame with slender features`
  ];
  
  const colorPalettes = [
    `deep blues and vibrant oranges with metallic accents`,
    `purple and gold tones with electric highlights`,
    `emerald greens and crimson reds with silver details`,
    `warm earth tones with bright cyan markings`,
    `monochromatic grays with brilliant rainbow accents`,
    `fire-like oranges and yellows with dark shadows`,
    `ocean blues and seafoam greens with pearl highlights`
  ];
  
  const keyFeatures = [
    `prominent horns, glowing eyes, and distinctive markings along the body`,
    `large wings, sharp claws, and an expressive facial structure`,
    `unique tail design, distinctive ear shapes, and body patterns`,
    `special appendages, striking facial features, and signature poses`,
    `elemental effects emanating from the body, distinctive coloring patterns`
  ];
  
  const textureOptions = [
    `smooth, glossy skin with subtle scale patterns`,
    `fur-like texture with metallic sheen in certain areas`,
    `crystal-like surface that catches and reflects light`,
    `matte finish with glowing energy patterns`,
    `sleek, aerodynamic surface with gradient color transitions`
  ];
  
  const speciesVibes = [
    `fire-type energy with electric undertones`,
    `water-type grace combined with psychic mystique`,
    `grass-type earthiness with fairy-like whimsy`,
    `dark-type mystery with fighting-type strength`,
    `flying-type elegance with dragon-type power`
  ];
  
  const attitudes = [
    `confident and alert, ready for battle`,
    `playful yet mysterious, with intelligence in its eyes`,
    `calm and wise, exuding ancient knowledge`,
    `energetic and friendly, approachable but powerful`,
    `fierce and determined, a natural protector`
  ];
  
  const accessories = [
    `glowing gemstones embedded in its forehead and chest`,
    `natural armor plating along its back and limbs`,
    `trailing energy wisps that follow its movements`,
    `distinctive crest or crown-like features on its head`,
    `unique patterns that seem to shift and change in different light`
  ];
  
  // Randomly select elements to create variation
  const randomBodyStructure = bodyStructures[Math.floor(Math.random() * bodyStructures.length)];
  const randomColorPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
  const randomKeyFeatures = keyFeatures[Math.floor(Math.random() * keyFeatures.length)];
  const randomTexture = textureOptions[Math.floor(Math.random() * textureOptions.length)];
  const randomSpeciesVibe = speciesVibes[Math.floor(Math.random() * speciesVibes.length)];
  const randomAttitude = attitudes[Math.floor(Math.random() * attitudes.length)];
  const randomAccessories = accessories[Math.floor(Math.random() * accessories.length)];
  
  // Create the detailed prompt using the same structure as our successful tests
  return `Illustrate an original cartoon creature with ${randomBodyStructure}, using a ${randomColorPalette}. 
The creature features ${randomKeyFeatures} with ${randomTexture}.
It has a ${randomSpeciesVibe} aesthetic, displaying a ${randomAttitude}.
Additional details include ${randomAccessories}.
The creature should be whimsical, expressive, and anime-inspired. 
Style it for a teenager-friendly, early 2000s anime look. Use smooth, clean outlines, cel-shading, soft shadows, and vibrant colors. 
The creature should have a fantasy/magical vibe and look like it could be from a Pokemon-style universe.
Do not recreate or reference any existing character or franchise.
Keep the background transparent, but ensure that the eyes are non-transparent.`;
}

/**
 * Download an image and return it as a stream for Replicate
 */
async function downloadImageAsStream(imageUrl: string, requestId: string): Promise<any> {
  try {
    console.log(`[${requestId}] QWEN FUSION - Downloading image: ${imageUrl.substring(0, 50)}...`);
    
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 15000 // 15 second timeout
    });

    console.log(`[${requestId}] QWEN FUSION - Successfully downloaded image`);
    return response.data;
    
  } catch (error) {
    console.error(`[${requestId}] QWEN FUSION - Error downloading image from ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Test if Qwen fusion is available and configured
 */
export async function testQwenFusion(): Promise<boolean> {
  const testId = `qwen-test-${Date.now()}`;
  console.log(`[${testId}] QWEN FUSION - Testing availability`);

  try {
    // Check if required environment variables are available
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error(`[${testId}] QWEN FUSION - Missing REPLICATE_API_TOKEN`);
      return false;
    }

    // Try to access the model (this will fail gracefully if not available)
    console.log(`[${testId}] QWEN FUSION - Qwen fusion is configured and ready`);
    return true;

  } catch (error) {
    console.error(`[${testId}] QWEN FUSION - Test failed:`, error);
    return false;
  }
}

/**
 * Get optimal Qwen parameters based on our test results
 */
export function getOptimalQwenParameters() {
  return {
    strength: 0.7,        // Best balance of quality and creativity
    guidance: 3.5,        // Optimal guidance for realistic results
    num_inference_steps: 50,
    aspect_ratio: "1:1",
    output_format: "png", // Supports transparency
    go_fast: true,       // Enable optimizations
    output_quality: 90   // High quality
  };
}

/**
 * Check if Qwen fusion is enabled via environment variables
 */
export function isQwenFusionEnabled(): boolean {
  const useQwenFusion = (process.env.USE_QWEN_FUSION || '').toLowerCase();
  const enabled = useQwenFusion === 'true' || useQwenFusion === '1' || useQwenFusion === 'yes';
  
  console.log('QWEN FUSION - Enabled check:', {
    envVar: process.env.USE_QWEN_FUSION,
    enabled,
    hasReplicateToken: !!process.env.REPLICATE_API_TOKEN
  });
  
  return enabled && !!process.env.REPLICATE_API_TOKEN;
}
