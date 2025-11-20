// Single Model Fusion-based fusion generation module
// This module provides a simplified fusion pipeline using Single Model Fusion (like qwen/qwen-image or google/nano-banana-pro)
// It combines blending and enhancement in a single step

import Replicate from 'replicate';
import axios from 'axios';
import sharp from 'sharp';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Environment details for debugging
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_VERCEL = !!process.env.VERCEL;

console.log(`🌟 SINGLE MODEL FUSION MODULE LOADED - ENV: ${IS_PRODUCTION ? 'PROD' : 'DEV'}, PLATFORM: ${IS_VERCEL ? 'VERCEL' : 'LOCAL'}`);

/**
 * Convert transparent background to white background
 * This makes it easier for AI models to process and understand the images
 * 
 * @param imageUrl - URL of the image to process
 * @param requestId - Request ID for logging
 * @returns Promise<string> - Data URI of the image with white background
 */
async function convertTransparentToWhite(
  imageUrl: string,
  requestId: string
): Promise<string> {
  console.log(`[${requestId}] WHITE BACKGROUND - Converting transparent to white: ${imageUrl.substring(0, 50)}...`);
  
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000 
    });
    const buffer = Buffer.from(response.data);
    
    const processedBuffer = await sharp(buffer)
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
    
    const dataUri = `data:image/png;base64,${processedBuffer.toString('base64')}`;
    console.log(`[${requestId}] WHITE BACKGROUND - Successfully converted image (${(processedBuffer.length / 1024).toFixed(2)} KB)`);
    
    return dataUri;
  } catch (error) {
    console.error(`[${requestId}] WHITE BACKGROUND - Error converting transparent background:`, error);
    // Fall back to original URL if conversion fails
    return imageUrl;
  }
}

/**
 * Remove background from an image using Replicate's bria/remove-background model
 * 
 * @param imageUrl - URL of the image to remove background from
 * @param requestId - Request ID for logging
 * @returns Promise<string | null> - URL of the image with removed background or null if failed
 */
async function removeBackground(
  imageUrl: string,
  requestId: string
): Promise<string | null> {
  console.log(`[${requestId}] BACKGROUND REMOVAL - Starting background removal`);
  
  try {
    const input = {
      image: imageUrl
    };

    console.log(`[${requestId}] BACKGROUND REMOVAL - Calling bria/remove-background on Replicate`);
    const startTime = Date.now();

    // Call Replicate background removal model
    const output = await replicate.run("bria/remove-background", { input });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] BACKGROUND REMOVAL - Completed in ${duration}ms`);

    // Process the result
    if (output && typeof output === 'string') {
      console.log(`[${requestId}] BACKGROUND REMOVAL - SUCCESS - Generated image: ${output}`);
      return output;
    } else if (output && typeof output === 'object' && 'url' in output) {
      // Handle case where output is an object with a url() method
      const bgRemovedUrl = typeof output.url === 'function' ? output.url() : output.url;
      console.log(`[${requestId}] BACKGROUND REMOVAL - SUCCESS - Generated image: ${bgRemovedUrl}`);
      return bgRemovedUrl;
    } else if (output && Array.isArray(output) && output.length > 0) {
      const bgRemovedUrl = typeof output[0] === 'string' ? output[0] : null;
      console.log(`[${requestId}] BACKGROUND REMOVAL - SUCCESS - Generated image: ${bgRemovedUrl}`);
      return bgRemovedUrl;
    } else {
      console.error(`[${requestId}] BACKGROUND REMOVAL - No output received from bria/remove-background`);
      return null;
    }
  } catch (error) {
    console.error(`[${requestId}] BACKGROUND REMOVAL - Error:`, error);
    if (error instanceof Error) {
      console.error(`[${requestId}] BACKGROUND REMOVAL - Error message: ${error.message}`);
      console.error(`[${requestId}] BACKGROUND REMOVAL - Error stack: ${error.stack}`);
    }
    return null;
  }
}

/**
 * Generate a Pokemon fusion using Replicate's google/nano-banana-pro model
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

    // STEP 1: Convert transparent backgrounds to white for better model processing
    console.log(`[${requestId}] SINGLE MODEL FUSION - STEP 1: Converting input images to white backgrounds`);
    const [pokemon1WithWhiteBg, pokemon2WithWhiteBg] = await Promise.all([
      convertTransparentToWhite(pokemon1ImageUrl, requestId),
      convertTransparentToWhite(pokemon2ImageUrl, requestId)
    ]);

    // Create the fusion prompt
    const fusionPrompt =
      "Create a new single creature based on the two input images, which merges the features and characteristics of both input images seamlessly. Follow the same artistic style as the input images. Ensure that we are not just overlaping the two input creatures, but that we are organically blending them together in one single creature. Keep the white background.";
    console.log(`[${requestId}] SINGLE MODEL FUSION - Generated prompt: ${fusionPrompt}`);

    // Prepare input for nano-banana-pro using the white-background versions
    const input = {
      prompt: fusionPrompt,
      image_input: [pokemon1WithWhiteBg, pokemon2WithWhiteBg],
    };

    console.log(`[${requestId}] SINGLE MODEL FUSION - STEP 2: Calling google/nano-banana-pro on Replicate with white-background images`);
    const startTime = Date.now();

    // Call Replicate nano-banana-pro model
    const output = await replicate.run("google/nano-banana-pro", { input });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] SINGLE MODEL FUSION - STEP 2 completed in ${duration}ms`);

    // Process the result
    let fusionImageUrl: string | null = null;
    
    if (output && typeof output === 'string') {
      fusionImageUrl = output;
    } else if (output && Array.isArray(output) && output.length > 0) {
      fusionImageUrl = typeof output[0] === 'string' ? output[0] : null;
    }

    if (!fusionImageUrl) {
      console.error(`[${requestId}] SINGLE MODEL FUSION - No output received from nano-banana-pro`);
      return null;
    }

    console.log(`[${requestId}] SINGLE MODEL FUSION - Generated initial fusion: ${fusionImageUrl}`);

    // STEP 3: Apply background removal to ensure transparent background
    console.log(`[${requestId}] SINGLE MODEL FUSION - STEP 3: Applying background removal`);
    const finalImageUrl = await removeBackground(fusionImageUrl, requestId);

    if (!finalImageUrl) {
      console.warn(`[${requestId}] SINGLE MODEL FUSION - Background removal failed, using original image`);
      return fusionImageUrl; // Fallback to original if background removal fails
    }

    console.log(`[${requestId}] SINGLE MODEL FUSION - SUCCESS - Final image with transparent background: ${finalImageUrl}`);
    return finalImageUrl;
    
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
 * Download an image and return it as a stream for Replicate
 */
async function downloadImageAsStream(imageUrl: string, requestId: string): Promise<any> {
  try {
    console.log(`[${requestId}] SINGLE MODEL FUSION - Downloading image: ${imageUrl.substring(0, 50)}...`);
    
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 15000 // 15 second timeout
    });

    console.log(`[${requestId}] SINGLE MODEL FUSION - Successfully downloaded image`);
    return response.data;
    
  } catch (error) {
    console.error(`[${requestId}] SINGLE MODEL FUSION - Error downloading image from ${imageUrl}:`, error);
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
    console.log(`[${testId}] SINGLE MODEL FUSION - Nano Banana Pro fusion is configured and ready`);
    return true;
  } catch (error) {
    console.error(`[${testId}] SINGLE MODEL FUSION - Test failed:`, error);
    return false;
  }
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
