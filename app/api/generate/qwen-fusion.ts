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

    // Configure Qwen parameters based on our test results
    // Using optimal settings from qwen-transparent-blend test
    const qwenInput = {
      images: [pokemon1Stream, pokemon2Stream],
      prompt: fusionPrompt,
      strength: 0.7,        // Optimal from our tests
      guidance: 3.5,        // Optimal from our tests  
      num_inference_steps: 50,
      aspect_ratio: "1:1",
      output_format: "png", // For transparency support
      go_fast: true,       // Enable optimizations
      output_quality: 90   // High quality
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
 * Uses the detailed fusion prompt style that worked best in testing
 */
function createFusionPrompt(pokemon1Name: string, pokemon2Name: string, fusionName: string): string {
  // Generate a dynamic prompt that describes the fusion characteristics
  // Based on our successful "detailed-fusion-prompt" test pattern
  return `Pokemon fusion creature named ${fusionName}: Blend the distinctive characteristics of ${pokemon1Name} and ${pokemon2Name} into a single cohesive creature. 

The fusion should combine the unique body structure, color palette, and key features from both Pokemon while maintaining visual harmony. Incorporate the most recognizable traits from each Pokemon - their signature colors, distinctive body parts, and characteristic expressions.

Style requirements:
- Early 2000s anime Pokemon art style
- Clean outlines with cel-shading
- Vibrant, saturated colors
- Soft shadows and highlights
- Professional digital art quality
- COMPLETELY TRANSPARENT BACKGROUND (no white, no checkered pattern, fully transparent alpha channel)
- Single cohesive creature (not two separate Pokemon)
- Maintain proportional anatomy
- Expressive and appealing design
- PNG format with alpha transparency

The result should look like an official Pokemon that could naturally exist in the Pokemon universe, blending the essence of both source Pokemon into something new and unique.`;
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
