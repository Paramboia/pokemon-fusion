// DEBUG - Log module loading
console.warn('DALLE.TS MODULE LOADED - This should appear in logs');

// Import OpenAI with CommonJS approach to match working test file
const OpenAI = require('openai');
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import FormData from 'form-data';

// Set environment-specific timeouts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_TIMEOUT = IS_PRODUCTION ? 180000 : 240000; // 3 minutes in production, 4 minutes in development (increased)

// Validate API key format
const apiKey = process.env.OPENAI_API_KEY || '';
console.warn('🔴🔴🔴 DALLE.TS - OpenAI API Key Format Check 🔴🔴🔴');
console.warn('API Key starts with:', apiKey.substring(0, 10) + '...');
console.warn('API Key length:', apiKey.length);
console.warn('Is API Key properly formatted:', apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));

// Initialize OpenAI client to match test file
let openai;
try {
  openai = new OpenAI({
    apiKey: apiKey,
    timeout: 900000, // 15 minutes (increased from 10 minutes)
    maxRetries: 3    // Increased from 2
  });
  console.warn('🔴🔴🔴 DALLE.TS - OpenAI client successfully initialized 🔴🔴🔴');
} catch (error) {
  console.error('🔴🔴🔴 DALLE.TS - ERROR INITIALIZING OPENAI CLIENT:', error, '🔴🔴🔴');
  // Create a dummy client as fallback
  openai = {
    images: {
      generate: async () => {
        console.error('🔴🔴🔴 DUMMY OPENAI CLIENT CALLED - REAL CLIENT FAILED TO INITIALIZE 🔴🔴🔴');
        return null;
      }
    }
  };
}

// Try a simple API call to validate the client
try {
  console.warn('🔴🔴🔴 DALLE.TS - Testing OpenAI client with a simple models.list call 🔴🔴🔴');
  if (typeof openai.models?.list === 'function') {
    openai.models.list()
      .then(result => {
        console.warn('🔴🔴🔴 DALLE.TS - OpenAI test call succeeded:', !!result, '🔴🔴🔴');
      })
      .catch(error => {
        console.error('🔴🔴🔴 DALLE.TS - OpenAI test call failed:', error.message, '🔴🔴🔴');
      });
  } else {
    console.warn('🔴🔴🔴 DALLE.TS - openai.models.list is not a function, skipping test 🔴🔴🔴');
  }
} catch (testError) {
  console.error('🔴🔴🔴 DALLE.TS - Error during OpenAI client test:', testError, '🔴🔴🔴');
}

// Initialize Supabase client for uploading base64 images
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Control how image enhancement works with environment variables
const ENHANCEMENT_TIMEOUT = parseInt(process.env.ENHANCEMENT_TIMEOUT || '70000', 10); // 70 seconds default for production (increased)
const SKIP_LOCAL_FILES = process.env.SKIP_LOCAL_FILES === 'true';

// Set a stricter timeout for enhancement within the 60-second Vercel function limit
// In production, we need to finish enhancement within a reasonable time to leave time for other operations
// In development, we can be more generous
const ENHANCEMENT_STRICT_TIMEOUT = IS_PRODUCTION ? 55000 : 90000; // 55 seconds in production (increased), 90 in development

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
 * Returns:
 * - A URL string if OpenAI returns a URL
 * - A URL string from Supabase if OpenAI returns base64
 * - null if enhancement fails or returns no valid data
 */
export async function enhanceWithDirectGeneration(
  pokemon1Name: string,
  pokemon2Name: string,
  imageUrl: string,
  retryCount = 0,
  requestId = `gpt-image-${Date.now()}`
): Promise<string | null> {
  const startTime = Date.now();
  
  // SUPER VISIBLE LOGGING FOR DEBUGGING
  console.warn('🔴🔴🔴 DALLE.TS - enhanceWithDirectGeneration FUNCTION CALLED 🔴🔴🔴');
  console.warn('🔴🔴🔴 Pokemon names:', pokemon1Name, '+', pokemon2Name, '🔴🔴🔴');
  console.warn('🔴🔴🔴 Image URL:', imageUrl?.substring(0, 50) + '...', '🔴🔴🔴');
  
  // Force log this message to ensure it's visible in production
  console.warn(`[${requestId}] GPT ENHANCEMENT - START - ${pokemon1Name} + ${pokemon2Name} at ${new Date().toISOString()}`);
  console.log(`[${requestId}] GPT ENHANCEMENT - Original image URL: ${imageUrl?.substring(0, 50)}...`);
  
  // Check for required environment variables
  console.warn(`[${requestId}] GPT ENHANCEMENT - Environment checks:`, {
    USE_GPT_VISION_ENHANCEMENT: process.env.USE_GPT_VISION_ENHANCEMENT,
    USE_OPENAI_MODEL: process.env.USE_OPENAI_MODEL,
    hasKey: !!process.env.OPENAI_API_KEY,
    keyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    supabaseSetup: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      clientAvailable: !!supabaseAdmin
    },
    openaiConfig: {
      timeout: openai.timeout,
      maxRetries: openai.maxRetries,
      apiKey: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'missing'
    }
  });
  
  // If we have an image source and no OpenAI API key, return null
  if (!process.env.OPENAI_API_KEY) {
    console.warn(`[${requestId}] GPT ENHANCEMENT - SKIPPED - No OpenAI API key`);
    return null;
  }
  
  // Check if Supabase is available (needed for base64 handling)
  if (!supabaseAdmin) {
    console.warn(`[${requestId}] GPT ENHANCEMENT - WARNING - Supabase not available, base64 responses cannot be handled`);
    // Continue anyway, as we might get a URL response
  }
  
  try {
    // Create a timeout controller
    const timeoutId = setTimeout(() => {
      console.warn(`[${requestId}] GPT ENHANCEMENT - Request aborted due to timeout after ${ENHANCEMENT_STRICT_TIMEOUT}ms`);
    }, ENHANCEMENT_STRICT_TIMEOUT);
    
    try {
      // Force log this to ensure it appears in production logs
      console.warn(`[${requestId}] GPT ENHANCEMENT - API CALL STARTING at ${new Date().toISOString()}`);
      console.warn('🔴🔴🔴 DALLE.TS - ABOUT TO CALL OPENAI API 🔴🔴🔴');
      console.log(`[${requestId}] GPT ENHANCEMENT - Using exactly the same parameters as test file`);
      
      // Use Promise.race to add an additional timeout layer
      try {
        console.warn('🔴🔴🔴 DALLE.TS - Inside inner try block before API call 🔴🔴🔴');
        
        // Download the image from the URL 
        console.warn('🔴🔴🔴 DALLE.TS - Attempting to download image from URL 🔴🔴🔴');
        let imageData;
        try {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          imageData = Buffer.from(imageResponse.data).toString('base64');
          console.warn('🔴🔴🔴 DALLE.TS - Successfully downloaded and converted image to base64 🔴🔴🔴');
        } catch (dlError) {
          console.error(`[${requestId}] GPT ENHANCEMENT - Failed to download image:`, dlError);
          console.warn('🔴🔴🔴 DALLE.TS - Failed to download image, using URL directly 🔴🔴��');
          imageData = imageUrl; // Fallback to using URL directly
        }
        
        const response = await Promise.race([
          openai.images.generate({
            model: "gpt-image-1",
            prompt: ENHANCEMENT_PROMPT,
            n: 1,
            size: "1024x1024",
            quality: "high",
            background: "transparent",
            moderation: "low",
            image: imageData // Use the base64 data instead of URL
          }),
          timeout(ENHANCEMENT_STRICT_TIMEOUT * 0.9) // 90% of the strict timeout to allow for cleanup
        ]).catch(err => {
          console.warn('🔴🔴🔴 DALLE.TS - OpenAI API Error:', err.message, '🔴🔴🔴');
          console.error(`[${requestId}] GPT ENHANCEMENT - API call failed:`, err);
          return null;
        });
        
        console.warn('🔴🔴🔴 DALLE.TS - After OpenAI API call - Response received?', !!response, '🔴🔴🔴');
        
        // If we got null from the catch block, return null
        if (!response) {
          console.log(`[${requestId}] GPT ENHANCEMENT - Returning null due to API error`);
          return null;
        }
        
        console.log(`[${requestId}] GPT ENHANCEMENT - Generation completed`);
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        const requestDuration = Date.now() - startTime;
        console.warn(`[${requestId}] GPT ENHANCEMENT - API CALL COMPLETED in ${requestDuration}ms`);
        
        // Debug the response structure
        console.log(`[${requestId}] GPT ENHANCEMENT - Response structure:`, JSON.stringify({
          type: typeof response,
          keys: Object.keys(response || {}),
          hasData: !!response?.data,
          dataType: response?.data ? (Array.isArray(response.data) ? 'array' : typeof response.data) : 'missing',
          firstItemKeys: response?.data?.[0] ? Object.keys(response.data[0]) : [],
          hasUrl: !!response?.data?.[0]?.url,
          hasB64: !!response?.data?.[0]?.b64_json
        }));
        
        // Handle the response - First check for URL (more common with dall-e-3)
        if (response?.data?.[0]?.url) {
          const newImageUrl = response.data[0].url;
          console.warn(`[${requestId}] GPT ENHANCEMENT - SUCCESS: Generated URL: ${newImageUrl.substring(0, 50)}...`);
          return newImageUrl;
        }
        
        // Handle base64 data (more common with gpt-image-1)
        if (response?.data?.[0]?.b64_json) {
          console.warn(`[${requestId}] GPT ENHANCEMENT - Received base64 image data`);
          
          // If Supabase isn't available, we can't handle base64 data
          if (!supabaseAdmin) {
            console.error(`[${requestId}] GPT ENHANCEMENT - Cannot handle base64 data without Supabase`);
            return null;
          }
          
          try {
            // Extract the base64 data
            const b64Data = response.data[0].b64_json;
            
            // Generate a unique filename
            const fileName = `fusion-gpt-enhanced-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.png`;
            
            // Convert base64 to binary data (remove data:image/png;base64, prefix if present)
            const base64Data = b64Data.includes('base64,') ? b64Data.split('base64,')[1] : b64Data;
            
            // Define bucket name
            const bucketName = 'fusions';
            
            // Upload to Supabase Storage
            console.log(`[${requestId}] GPT ENHANCEMENT - Uploading base64 image to Supabase: ${fileName}`);
            
            // Upload the image to Supabase
            const { data: storageData, error: storageError } = await supabaseAdmin
              .storage
              .from(bucketName)
              .upload(fileName, Buffer.from(base64Data, 'base64'), {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: true
              });
            
            if (storageError) {
              console.error(`[${requestId}] GPT ENHANCEMENT - Supabase upload error:`, storageError);
              return null;
            }
            
            // Get the public URL
            const { data: publicUrlData } = supabaseAdmin
              .storage
              .from(bucketName)
              .getPublicUrl(fileName);
            
            if (publicUrlData?.publicUrl) {
              const newImageUrl = publicUrlData.publicUrl;
              console.warn(`[${requestId}] GPT ENHANCEMENT - SUCCESS: Uploaded to Supabase and generated URL: ${newImageUrl.substring(0, 50)}...`);
              return newImageUrl;
            } else {
              console.error(`[${requestId}] GPT ENHANCEMENT - Failed to get public URL from Supabase`);
              return null;
            }
          } catch (uploadError) {
            console.error(`[${requestId}] GPT ENHANCEMENT - Error handling base64 image:`, uploadError);
            return null;
          }
        }
        
        console.log(`[${requestId}] GPT ENHANCEMENT - No valid URL or base64 data in response, returning null`);
        return null;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[${requestId}] GPT ENHANCEMENT - Error:`, error);
        return null; // Return null on error
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`[${requestId}] GPT ENHANCEMENT - Error:`, error);
      return null; // Return null on error
    }
  } catch (error) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Unexpected error:`, error);
    return null; // Return null on unexpected error
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
