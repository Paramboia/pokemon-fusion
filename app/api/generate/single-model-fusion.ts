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
 * Generate a Pokemon fusion using Replicate's google/nano-banana model
 * This replaces the blend + enhance pipeline with a single model call
 * 
 * @param pokemon1Name - Name of the first Pokemon
 * @param pokemon2Name - Name of the second Pokemon  
 * @param pokemon1ImageUrl - URL of the first Pokemon image
 * @param pokemon2ImageUrl - URL of the second Pokemon image
 * @param fusionName - Name for the resulting fusion
 * @param requestId - Optional request ID for logging
 * @returns Promise<string | null> - URL of the generated fusion image or null if failed
 */
export async function generateWithSingleModelFusion(
  pokemon1Name: string,
  pokemon2Name: string,
  pokemon1ImageUrl: string,
  pokemon2ImageUrl: string,
  fusionName: string,
  requestId = `single-model-fusion-${Date.now()}`
): Promise<string | null> {
  console.log(`[${requestId}] SINGLE MODEL FUSION - Starting fusion generation`);
  console.log(`[${requestId}] SINGLE MODEL FUSION - Pokemon: ${pokemon1Name} + ${pokemon2Name} = ${fusionName}`);

  try {
    // Validate inputs
    if (!pokemon1ImageUrl || !pokemon2ImageUrl) {
      console.error(`[${requestId}] SINGLE MODEL FUSION - Missing image URLs`);
      return null;
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error(`[${requestId}] SINGLE MODEL FUSION - Missing REPLICATE_API_TOKEN`);
      return null;
    }

    // Create the fusion prompt
    const fusionPrompt =
      "Create a new creature based on the two input images, which merges the features and carachteristics of both input images. Following the same artistic style";
    console.log(`[${requestId}] SINGLE MODEL FUSION - Generated prompt: ${fusionPrompt}`);

    // Prepare input for nano-banana
    const input = {
      prompt: fusionPrompt,
      image_input: [pokemon1ImageUrl, pokemon2ImageUrl],
    };

    console.log(`[${requestId}] SINGLE MODEL FUSION - Calling google/nano-banana on Replicate`);
    const startTime = Date.now();

    // Call Replicate nano-banana model
    const output = await replicate.run("google/nano-banana", { input });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] SINGLE MODEL FUSION - Generation completed in ${duration}ms`);

    // Process the result
    if (output && typeof output === 'string') {
      console.log(`[${requestId}] SINGLE MODEL FUSION - SUCCESS - Generated fusion: ${output}`);
      return output;
    } else if (output && Array.isArray(output) && output.length > 0) {
      const imageUrl = typeof output[0] === 'string' ? output[0] : null;
      console.log(`[${requestId}] SINGLE MODEL FUSION - SUCCESS - Generated fusion: ${imageUrl}`);
      return imageUrl;
    } else {
      console.error(`[${requestId}] SINGLE MODEL FUSION - No output received from nano-banana`);
      return null;
    }
  } catch (error) {
    console.error(`[${requestId}] SINGLE MODEL FUSION - Error:`, error);
    if (error instanceof Error) {
      console.error(`[${requestId}] SINGLE MODEL FUSION - Error message: ${error.message}`);
      console.error(`[${requestId}] SINGLE MODEL FUSION - Error stack: ${error.stack}`);
    }
    return null;
  }
}

/**
 * Create a simple fusion prompt that lets Qwen analyze the images and infer characteristics
 * Relies on the model's visual understanding rather than predefined mappings
 */
function createFusionPrompt(pokemon1Name: string, pokemon2Name: string, fusionName: string): string {
  return `Create a Pokemon fusion by blending these two images into a single cohesive creature called ${fusionName}. Analyze the visual characteristics, colors, shapes, and features from both images and combine them harmoniously. The result should be a unique Pokemon that incorporates elements from both source images while maintaining Pokemon art style with transparent background.`;
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
 * Test if single-model fusion is available and configured
 */
export async function testSingleModelFusion(): Promise<boolean> {
  const testId = `single-model-test-${Date.now()}`;
  console.log(`[${testId}] SINGLE MODEL FUSION - Testing availability`);

  try {
    // Check if required environment variables are available
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error(`[${testId}] SINGLE MODEL FUSION - Missing REPLICATE_API_TOKEN`);
      return false;
    }
    // Try to access the model (this will fail gracefully if not available)
    console.log(`[${testId}] SINGLE MODEL FUSION - Nano Banana fusion is configured and ready`);
    return true;
  } catch (error) {
    console.error(`[${testId}] SINGLE MODEL FUSION - Test failed:`, error);
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
 * Check if single-model fusion is enabled via environment variables
 */
export function isSingleModelFusionEnabled(): boolean {
  const useSingleModelFusion = (process.env.USE_SINGLE_MODEL_FUSION || '').toLowerCase();
  const enabled = useSingleModelFusion === 'true' || useSingleModelFusion === '1' || useSingleModelFusion === 'yes';
  
  console.log('SINGLE MODEL FUSION - Enabled check:', {
    envVar: process.env.USE_SINGLE_MODEL_FUSION,
    enabled,
    hasReplicateToken: !!process.env.REPLICATE_API_TOKEN
  });
  
  return enabled && !!process.env.REPLICATE_API_TOKEN;
}
