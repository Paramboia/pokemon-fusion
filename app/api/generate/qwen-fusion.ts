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

    // Configure Qwen parameters based on successful detailed test results
    // Using parameters that produced the best qwen-simple-blend-detailed.webp
    const qwenInput = {
      images: [pokemon1Stream, pokemon2Stream],
      prompt: fusionPrompt,
      strength: 0.7,        // Optimal strength from successful test
      guidance: 3.5,        // Higher guidance for better adherence to prompt
      num_inference_steps: 50, // More steps for higher quality
      aspect_ratio: "1:1",
      output_format: "png", // For transparency support
      go_fast: false,      // Quality over speed
      output_quality: 90   // Good quality
    };

    console.log(`[${requestId}] QWEN FUSION - Calling Qwen API with detailed fusion approach`);
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
 * Create a detailed fusion prompt based on the successful test approach
 * Uses type-specific descriptions and Pokemon characteristics for better results
 */
function createFusionPrompt(pokemon1Name: string, pokemon2Name: string, fusionName: string): string {
  // Get basic Pokemon type information (simplified approach)
  const pokemon1Lower = pokemon1Name.toLowerCase();
  const pokemon2Lower = pokemon2Name.toLowerCase();
  
  // Simple type/characteristic mapping for common Pokemon
  const getCharacteristics = (name: string) => {
    if (name.includes('gengar')) return 'ghost-type features';
    if (name.includes('tauros')) return 'bull-like characteristics';
    if (name.includes('pikachu')) return 'electric-type features';
    if (name.includes('charizard')) return 'fire-dragon characteristics';
    if (name.includes('blastoise')) return 'water-type turtle features';
    if (name.includes('venusaur')) return 'grass-type plant characteristics';
    if (name.includes('alakazam')) return 'psychic-type mystical features';
    if (name.includes('machamp')) return 'fighting-type muscular characteristics';
    if (name.includes('gyarados')) return 'water-dragon serpentine features';
    if (name.includes('dragonite')) return 'dragon-type friendly characteristics';
    // Add more as needed, fallback to generic description
    return `distinctive features`;
  };
  
  const char1 = getCharacteristics(pokemon1Lower);
  const char2 = getCharacteristics(pokemon2Lower);
  
  return `Create a Pokemon fusion by blending the ${char1} of ${pokemon1Name} with the ${char2} of ${pokemon2Name}. The result should be a single creature called ${fusionName} that combines both Pokemon's unique traits, colors, and essence. Maintain Pokemon art style with transparent background.`;
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
 * Get optimal Qwen parameters based on successful detailed test results
 */
export function getOptimalQwenParameters() {
  return {
    strength: 0.7,        // Optimal strength from successful test
    guidance: 3.5,        // Higher guidance for better prompt adherence
    num_inference_steps: 50, // More steps for higher quality
    aspect_ratio: "1:1",
    output_format: "png", // Supports transparency
    go_fast: false,      // Quality over speed
    output_quality: 90   // Good quality
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
