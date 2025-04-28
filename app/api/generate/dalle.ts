import OpenAI from 'openai';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import FormData from 'form-data';

// Set environment-specific timeouts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_TIMEOUT = IS_PRODUCTION ? 120000 : 180000; // 2 minutes in production, 3 minutes in development (increased from before)

// Initialize OpenAI client with timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: IS_PRODUCTION ? 35000 : 50000, // Reduced from previous values to be more realistic
  maxRetries: 1, // Reduced from 3 to 1 - we want to fail fast in enhancement context
  // Adjust retry settings for faster failures
  defaultQuery: {
  },
  // Add custom headers for improved tracking
  defaultHeaders: {
    'X-Request-Source': 'pokemon-fusion-app',
    'X-Environment': IS_PRODUCTION ? 'production' : 'development'
  }
});

// Control how image enhancement works with environment variables
const ENHANCEMENT_TIMEOUT = parseInt(process.env.ENHANCEMENT_TIMEOUT || '55000 ', 10); // 55 seconds default for production
const SKIP_LOCAL_FILES = process.env.SKIP_LOCAL_FILES === 'true';

// Set a stricter timeout for enhancement within the 60-second Vercel function limit
// In production, we need to finish enhancement within ~30 seconds to leave time for other operations
// In development, we can be more generous
const ENHANCEMENT_STRICT_TIMEOUT = IS_PRODUCTION ? 45000 : 45000; // 45 seconds in production, 45 in development

// Define the enhancement prompt once to avoid duplication
const ENHANCEMENT_PROMPT = `Use the uploaded image as inspiration.
Recreate the same figure design, keeping the body structure, pose, key features intact, and same color palette.
Only improve the artistic quality by using clean, smooth outlines, cel-shaded coloring, soft shading, and vivid colors.
The final style should be teenager-friendly, early 2000s anime-inspired, and polished.
Do not change the figure into a different animal, and do not change its overall body orientation.
Ensure the background is transparent.`;

// Function to create a timeout promise that rejects after a specified time
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

/**
 * Enhance a Pokemon fusion image using GPT-image-1 model
 * This takes a URL from Replicate Blend and enhances it
 * Returns either:
 * - A URL string if OpenAI returns a URL
 * - An object with base64 data if OpenAI returns base64 (for route.ts to handle)
 * - The original URL if enhancement fails
 */
export async function enhanceWithDirectGeneration(
  pokemon1Name: string,
  pokemon2Name: string,
  imageUrl: string,
  retryCount = 0,
  requestId = `gpt-image-${Date.now()}`
): Promise<string> {
  const startTime = Date.now();
  
  // Force log this message to ensure it's visible in production
  console.warn(`[${requestId}] GPT ENHANCEMENT - START - ${pokemon1Name} + ${pokemon2Name} at ${new Date().toISOString()}`);
  console.log(`[${requestId}] GPT ENHANCEMENT - Original image URL: ${imageUrl?.substring(0, 50)}...`);
  
  // If we have an image source and no OpenAI API key, just return the original image
  if (imageUrl && !process.env.OPENAI_API_KEY) {
    console.warn(`[${requestId}] GPT ENHANCEMENT - SKIPPED - No OpenAI API key, using original image directly`);
    return imageUrl;
  }
  
  // Check that OpenAI API key is properly formatted
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error(`[${requestId}] GPT ENHANCEMENT - ERROR - Invalid OpenAI API key format`);
    // Return the original image if we have it
    if (imageUrl) {
      console.warn(`[${requestId}] GPT ENHANCEMENT - SKIPPED - Using original image due to API key format issue`);
      return imageUrl;
    }
    return imageUrl;
  }
  
  // Check that environment flag is enabled
  if (process.env.USE_GPT_VISION_ENHANCEMENT !== 'true') {
    console.warn(`[${requestId}] GPT ENHANCEMENT - SKIPPED - Enhancement feature is disabled`);
    // Return the original image if we have it
    if (imageUrl) {
      console.warn(`[${requestId}] GPT ENHANCEMENT - Using original image directly (enhancement disabled)`);
      return imageUrl;
    }
    return imageUrl;
  }
  
  console.log(`[${requestId}] GPT ENHANCEMENT - API Key check: ${process.env.OPENAI_API_KEY ? `present (${process.env.OPENAI_API_KEY.length} chars)` : 'missing'}`);
  
  try {
    // Create a timeout controller
    const timeoutId = setTimeout(() => {
      console.warn(`[${requestId}] GPT ENHANCEMENT - Request aborted due to timeout after ${ENHANCEMENT_STRICT_TIMEOUT}ms`);
    }, ENHANCEMENT_STRICT_TIMEOUT);
    
    try {
      // Force log this to ensure it appears in production logs
      console.warn(`[${requestId}] GPT ENHANCEMENT - API CALL STARTING at ${new Date().toISOString()}`);
      
      console.log(`[${requestId}] GPT ENHANCEMENT - Using GPT-image-1 for enhancement`);
      console.log(`[${requestId}] GPT ENHANCEMENT - Sending params:`, {
        model: "gpt-image-1",
        promptLength: ENHANCEMENT_PROMPT.length,
        n: 1,
        size: "1024x1024",
        quality: "high"
      });
      
      // Use Promise.race to add an additional timeout layer
      const response = await Promise.race([
        openai.images.generate({
          model: "gpt-image-1",
          prompt: ENHANCEMENT_PROMPT,
          n: 1,
          size: "1024x1024",       // Square format for equal dimensions
          quality: "high" as any   // High quality - API accepts 'low', 'medium', 'high', 'auto' (not 'hd')
          // Note: Removed background and moderation parameters as they might cause API issues
        }),
        timeout(ENHANCEMENT_STRICT_TIMEOUT * 0.9) // 90% of the strict timeout to allow for cleanup
      ]).catch(err => {
        // Explicitly handle AbortError which is common in production
        if (err.name === 'AbortError' || err.message.includes('abort') || err.message.includes('aborted')) {
          console.error(`[${requestId}] GPT ENHANCEMENT - Request was aborted: ${err.message}`);
          console.warn(`[${requestId}] GPT ENHANCEMENT - Returning original image due to AbortError`);
        } else {
          console.error(`[${requestId}] GPT ENHANCEMENT - Generation failed: ${err.message}`);
        }
        // Continue with original image instead of throwing an error
        return null;
      });
      
      // If we got null from the catch block, return the original image
      if (!response) {
        console.log(`[${requestId}] GPT ENHANCEMENT - Falling back to original image due to error`);
        return imageUrl;
      }
      
      console.log(`[${requestId}] GPT ENHANCEMENT - Generation completed`);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      const requestDuration = Date.now() - startTime;
      console.warn(`[${requestId}] GPT ENHANCEMENT - API CALL COMPLETED in ${requestDuration}ms`);
      
      if (!response?.data || response.data.length === 0) {
        console.error(`[${requestId}] GPT ENHANCEMENT - ERROR: Empty response data`);
        return imageUrl;
      }

      // Debug log the response structure in production to help diagnose issues
      console.log(`[${requestId}] GPT ENHANCEMENT - Response data structure:`, 
        JSON.stringify({
          hasData: !!response.data,
          dataLength: response.data?.length,
          firstItemKeys: response.data?.[0] ? Object.keys(response.data[0]) : [],
          hasUrl: !!response.data?.[0]?.url,
          hasB64: !!response.data?.[0]?.b64_json,
          revisedPrompt: response.data?.[0]?.revised_prompt,
          errorType: response instanceof Error ? response.name : null,
          errorMessage: response instanceof Error ? response.message : null,
          usedParams: {
            model: "gpt-image-1",
            quality: "high"
          }
        })
      );

      // Handle the response (URL or base64)
      if (response.data[0]?.url) {
        const newImageUrl = response.data[0].url;
        console.warn(`[${requestId}] GPT ENHANCEMENT - SUCCESS: Generated URL: ${newImageUrl.substring(0, 50)}...`);
        return newImageUrl;
      }
      
      // Handle base64 data - important for gpt-image-1 which sometimes returns b64_json instead of URL
      if (response.data[0]?.b64_json) {
        console.log(`[${requestId}] GPT ENHANCEMENT - Received base64 image data`);
        
        try {
          // Upload the base64 data to Supabase Storage
          const { getSupabaseAdminClient } = await import('@/lib/supabase-server');
          const supabase = await getSupabaseAdminClient();
          
          if (!supabase) {
            console.error(`[${requestId}] GPT ENHANCEMENT - Failed to get Supabase client`);
            return imageUrl;
          }
          
          // Generate a unique filename
          const fileName = `fusion-gpt-enhanced-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.png`;
          const filePath = fileName; // Just the filename, not in a subfolder
          
          // Convert base64 to binary data (remove data:image/png;base64, prefix if present)
          const b64Data = response.data[0].b64_json;
          const base64Data = b64Data.includes('base64,') ? b64Data.split('base64,')[1] : b64Data;
          
          // Double-check that bucket exists before uploading
          const { data: buckets } = await supabase.storage.listBuckets();
          const bucketName = 'fusions';
          const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
          
          if (!bucketExists) {
            console.log(`[${requestId}] GPT ENHANCEMENT - Bucket '${bucketName}' doesn't exist, creating it...`);
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
              public: true,
              allowedMimeTypes: ['image/png', 'image/jpeg'],
              fileSizeLimit: 5242880 // 5MB
            });
            
            if (createError) {
              console.error(`[${requestId}] GPT ENHANCEMENT - Error creating bucket:`, createError);
              return imageUrl;
            }
            console.log(`[${requestId}] GPT ENHANCEMENT - Bucket '${bucketName}' created successfully`);
          }
          
          // Upload to Supabase Storage
          const { data: storageData, error: storageError } = await supabase
            .storage
            .from('fusions') // Using 'fusions' bucket
            .upload(filePath, Buffer.from(base64Data, 'base64'), {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: true // Set to true to overwrite if file exists (was false before)
            });
          
          if (storageError) {
            console.error(`[${requestId}] GPT ENHANCEMENT - Supabase upload error:`, storageError);
            return imageUrl;
          }
          
          // Get the public URL
          const { data: publicUrlData } = supabase
            .storage
            .from('fusions') // Using 'fusions' bucket
            .getPublicUrl(filePath);
          
          if (publicUrlData?.publicUrl) {
            const newImageUrl = publicUrlData.publicUrl;
            console.warn(`[${requestId}] GPT ENHANCEMENT - SUCCESS: Uploaded and generated URL: ${newImageUrl.substring(0, 50)}...`);
            return newImageUrl;
          } else {
            console.error(`[${requestId}] GPT ENHANCEMENT - Failed to get public URL`);
            return imageUrl;
          }
        } catch (uploadError) {
          console.error(`[${requestId}] GPT ENHANCEMENT - Error handling base64 image:`, uploadError);
          return imageUrl; // Fallback to original image if upload fails
        }
      }
      
      // Handle revised_prompt field (sometimes present in gpt-image-1 responses)
      if (response.data[0]?.revised_prompt) {
        console.log(`[${requestId}] GPT ENHANCEMENT - Revised prompt: ${response.data[0].revised_prompt}`);
      }
      
      // If we don't have a URL, return the original image
      return imageUrl; // Always return the original URL if we don't have a new one
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`[${requestId}] GPT ENHANCEMENT - Error:`, error);
      return imageUrl; // Always return the original URL on error
    }
  } catch (error) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Unexpected error:`, error);
    return imageUrl; // Always return the original URL on unexpected error
  }
}

/**
 * Generate a Pokemon fusion using image editing approach
 * This function is kept for backward compatibility but modified to work with current API
 */
export async function generatePokemonFusion(
  image1: string,
  image2: string,
  maskType: 'lower-half' | 'upper-half' | 'right-half' | 'left-half'
): Promise<string | null> {
  console.log('GPT Image Editing - Starting fusion with images');
  
  // This function is not currently implemented
  // Return null to allow fallback to other methods
  return null;
}

/**
 * Legacy function - kept for backward compatibility
 */
export async function enhanceImageWithGptVision(): Promise<string | null> {
  console.log('GPT Direct Enhancement - enhanceImageWithGptVision is deprecated');
  return null;
}

/**
 * Helper function to delete a local image file
 */
function deleteLocalImage(filePath: string, requestId: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[${requestId}] DALLE ENHANCEMENT - Deleted local image at: ${filePath}`);
  } else {
    console.log(`[${requestId}] DALLE ENHANCEMENT - Local image not found: ${filePath}`);
  }
}
