// DEBUG - Log module loading
console.warn('DALLE.TS MODULE LOADED - This should appear in logs');

// Import OpenAI with ES modules approach instead of CommonJS
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import FormData from 'form-data';

// Set environment-specific timeouts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Increase timeout for gpt-image-1 which can take up to 2 minutes according to documentation
const API_TIMEOUT = IS_PRODUCTION ? 180000 : 240000; // 3 minutes in production, 4 minutes in development

// Validate API key format
const apiKey = process.env.OPENAI_API_KEY || '';
console.warn('🔴🔴🔴 DALLE.TS - OpenAI API Key Format Check 🔴🔴🔴');
console.warn('API Key starts with:', apiKey.substring(0, 10) + '...');
console.warn('API Key length:', apiKey.length);
console.warn('Is API Key properly formatted:', apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));

// Initialize OpenAI client with a simpler approach
function getOpenAiClient() {
  try {
    // Create a fresh client instance with the current API key
    console.warn('🔴🔴🔴 DALLE.TS - Creating OpenAI client 🔴🔴🔴');
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120000,  // 2 minutes timeout
      maxRetries: 2     // 2 retries
    });
    console.warn('🔴🔴🔴 DALLE.TS - OpenAI client successfully created 🔴🔴🔴');
    return openaiClient;
  } catch (error) {
    console.error('🔴🔴🔴 DALLE.TS - ERROR CREATING OPENAI CLIENT:', error, '🔴🔴🔴');
    // Return null to indicate failure
    return null;
  }
}

// Use a function to get the client to ensure we always have the latest environment variables
function getOpenAiClientSafe() {
  const client = getOpenAiClient();
  if (!client) {
    console.error('🔴🔴🔴 DALLE.TS - No OpenAI client available, creating dummy client 🔴🔴🔴');
    return {
      chat: {
        completions: {
          create: async () => {
            console.error('🔴🔴🔴 DUMMY CHAT COMPLETIONS CALLED 🔴🔴🔴');
            return null;
          }
        }
      },
      images: {
        generate: async () => {
          console.error('🔴🔴🔴 DUMMY IMAGES GENERATE CALLED 🔴🔴🔴');
          return null;
        }
      }
    };
  }
  return client;
}

// Initialize Supabase client for uploading base64 images
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Control how image enhancement works with environment variables
// Documentation indicates GPT-image-1 can take up to 2 minutes to process
const ENHANCEMENT_TIMEOUT = parseInt(process.env.ENHANCEMENT_TIMEOUT || '150000', 10); // 2.5 minutes for gpt-image-1
const SKIP_LOCAL_FILES = process.env.SKIP_LOCAL_FILES === 'true';

// Set a stricter timeout for enhancement within the 60-second Vercel function limit
// In production, we need to finish enhancement within a reasonable time to leave time for other operations
// In development, we can be more generous
const ENHANCEMENT_STRICT_TIMEOUT = IS_PRODUCTION ? 100000 : 150000; // Increase to 100 seconds in production, 150 in development

// Define the enhancement prompt once to avoid duplication - using generic terms
const ENHANCEMENT_PROMPT = `Use the uploaded image as inspiration.
Recreate the same figure design, keeping the body structure, pose, key features intact, and same color palette.
Only improve the artistic quality by using clean, smooth outlines, cel-shaded coloring, soft shading, and vivid colors.
The final style should be teenager-friendly, early 2000s anime-inspired, and polished.
Do not change the figure into a different animal, and do not change its overall body orientation.
Ensure the background is transparent.`;

// We won't be using pokemon names in the prompt anymore
// function createPokemonEnhancementPrompt(pokemon1Name: string, pokemon2Name: string): string {
//   return `${ENHANCEMENT_PROMPT}
//
// This specific image is a fusion between ${pokemon1Name} and ${pokemon2Name}.
// Enhance the quality while preserving all the characteristic features from both creatures.
// Follow a clean, animated art style with smooth lines and vibrant colors.`;
// }

// Function to create a timeout promise that rejects after a specified time
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

/**
 * Enhance a Pokemon fusion image using GPT-image-1 model only
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
  // Start timing the function
  const startTime = Date.now();
  
  // SUPER VISIBLE LOGGING FOR DEBUGGING
  console.warn('🔴🔴🔴 DALLE.TS - enhanceWithDirectGeneration FUNCTION CALLED 🔴🔴🔴');
  // Don't log pokemon names to avoid content policy issues
  console.warn('🔴🔴🔴 Image URL:', imageUrl?.substring(0, 50) + '...', '🔴🔴🔴');
  
  // Validate input parameters
  if (!imageUrl) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Missing required image URL`);
    return null;
  }
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Missing OpenAI API key`);
    return null;
  }

  // Get the OpenAI client
  const openai = getOpenAiClientSafe();
  if (!openai) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Failed to get OpenAI client`);
    return null;
  }

  // Use only the generic prompt - no creature names
  const enhancementPrompt = ENHANCEMENT_PROMPT;
  console.warn(`[${requestId}] GPT ENHANCEMENT - Using generic prompt:`, enhancementPrompt.substring(0, 100) + '...');
  
  try {
    // Download the image
    console.warn(`[${requestId}] GPT ENHANCEMENT - Downloading image from URL`);
    let imageData: string;
    
    try {
      const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000 // 10 second timeout for image download
      });
      imageData = Buffer.from(imageResponse.data).toString('base64');
      console.warn(`[${requestId}] GPT ENHANCEMENT - Successfully downloaded and converted image (${imageData.length / 1024} KB)`);
    } catch (downloadError) {
      console.error(`[${requestId}] GPT ENHANCEMENT - Failed to download image:`, downloadError);
      imageData = imageUrl; // Fall back to using the URL directly
    }
    
    // Prepare the image parameter based on what we have
    const imageParam = imageData.startsWith('http') 
      ? imageData  // It's a URL
      : `data:image/png;base64,${imageData}`; // It's base64 data
    
    // Make the OpenAI API call with gpt-image-1 only
    console.warn(`[${requestId}] GPT ENHANCEMENT - Starting image generation with gpt-image-1 (may take up to 2 minutes per docs)`);
    
    // Create params specifically for gpt-image-1 based on documentation
    const gptImageParams: any = {
      model: "gpt-image-1", // Only using gpt-image-1 as requested
      prompt: enhancementPrompt,
      n: 1, // Generate a single image
      size: "1024x1024", // Square format for consistent results
      quality: "low", // Low quality (options per docs: low, medium, high, auto)
      background: "transparent", // Enable transparent background
      moderation: "low" // Less restrictive filtering
    };
    
    // Log the start time before calling API
    const apiStartTime = Date.now();
    console.warn(`[${requestId}] GPT ENHANCEMENT - API call to gpt-image-1 started at ${new Date(apiStartTime).toISOString()}`);
    
    // Create a promise that will reject after a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`gpt-image-1 API call timed out after ${ENHANCEMENT_TIMEOUT}ms`));
      }, ENHANCEMENT_TIMEOUT);
    });
    
    // Race the API call against the timeout
    const response = await Promise.race([
      openai.images.generate(gptImageParams),
      timeoutPromise
    ]);
    
    // Calculate and log duration
    const apiDuration = Date.now() - apiStartTime;
    console.warn(`[${requestId}] GPT ENHANCEMENT - gpt-image-1 call succeeded after ${apiDuration}ms!`);
    
    // Add missing log statement
    console.warn(`[${requestId}] GPT ENHANCEMENT - OpenAI API call succeeded!`);
    
    // Process URL response
    if (response?.data?.[0]?.url) {
      const newImageUrl = response.data[0].url;
      console.warn(`[${requestId}] GPT ENHANCEMENT - SUCCESS - Got URL response: ${newImageUrl.substring(0, 50)}...`);
      return newImageUrl;
    }
    
    // Process base64 response
    if (response?.data?.[0]?.b64_json) {
      console.warn(`[${requestId}] GPT ENHANCEMENT - Got base64 response`);
      
      if (!supabaseAdmin) {
        console.error(`[${requestId}] GPT ENHANCEMENT - Cannot handle base64 data without Supabase`);
        return null;
      }
      
      // Extract and process the base64 data
      const b64Data = response.data[0].b64_json;
      const fileName = `fusion-gpt-enhanced-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.png`;
      const base64Data = b64Data.includes('base64,') ? b64Data.split('base64,')[1] : b64Data;
      const bucketName = 'fusions';
      
      // Upload to Supabase
      console.warn(`[${requestId}] GPT ENHANCEMENT - Uploading to Supabase: ${fileName}`);
      
      const { error: storageError } = await supabaseAdmin
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
        console.warn(`[${requestId}] GPT ENHANCEMENT - SUCCESS - Uploaded to Supabase: ${newImageUrl}`);
        return newImageUrl;
      } else {
        console.error(`[${requestId}] GPT ENHANCEMENT - Failed to get public URL from Supabase`);
        return null;
      }
    }
    
    // If we got here, we didn't get a valid response
    console.error(`[${requestId}] GPT ENHANCEMENT - No valid URL or base64 data in response`);
    return null;
    
  } catch (error) {
    // Global error handler
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error(`[${requestId}] GPT ENHANCEMENT - Critical error: ${errorMessage}`);
    console.error(`[${requestId}] GPT ENHANCEMENT - Stack: ${errorStack}`);
    
    // Try to get more information about the error
    if (error && typeof error === 'object') {
      try {
        console.error(`[${requestId}] GPT ENHANCEMENT - Error details:`, JSON.stringify(error));
      } catch (jsonError) {
        console.error(`[${requestId}] GPT ENHANCEMENT - Could not stringify error`);
      }
    }
    
    return null;
  } finally {
    // Log timing information
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] GPT ENHANCEMENT - Function completed in ${duration}ms`);
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

/**
 * Test if the OpenAI client is working by making an image generation request
 * Returns true if the test succeeds, false otherwise
 * Note: We use dall-e-2 for testing as it's more widely available,
 * but the actual enhancement still uses gpt-image-1
 */
export async function testOpenAiClient(): Promise<boolean> {
  const startTime = Date.now();
  const requestId = 'test-' + Date.now();
  console.warn(`[${requestId}] TESTING OPENAI CLIENT - Beginning test`);
  
  // Check if an API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(`[${requestId}] TESTING OPENAI CLIENT - No API key found in environment variables`);
    return false;
  }
  
  // Log key format (not the actual key) for debugging
  const keyFormat = apiKey.startsWith('sk-') 
    ? `starts with 'sk-' and is ${apiKey.length} characters long` 
    : "doesn't start with 'sk-'";
  console.log(`[${requestId}] TESTING OPENAI CLIENT - API key ${keyFormat}`);
  
  // Get the OpenAI client
  try {
    // Create a fresh client instance with timeout and retry settings
    console.warn(`[${requestId}] TESTING OPENAI CLIENT - Creating OpenAI client`);
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 seconds timeout
      maxRetries: 1
    });
    console.warn(`[${requestId}] TESTING OPENAI CLIENT - OpenAI client created successfully`);
    
    // Test image generation with dall-e-2 (more widely available for testing)
    console.warn(`[${requestId}] TESTING OPENAI CLIENT - Testing image generation with dall-e-2 model`);
    const imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: "A simple blue creature on a white background",
      n: 1,
      size: "256x256", // Using smallest size for quicker test
    });
    
    // Log success
    console.warn(`[${requestId}] TESTING OPENAI CLIENT - Image generation successful, received response:`, 
      !!imageResponse ? "Response received" : "No response");
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.warn(`[${requestId}] TESTING OPENAI CLIENT - Test completed successfully in ${duration.toFixed(2)}s`);
    
    return true;
  } catch (error) {
    // Log any errors
    console.error(`[${requestId}] TESTING OPENAI CLIENT - ERROR:`, error.message);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(`[${requestId}] TESTING OPENAI CLIENT - Test failed after ${duration.toFixed(2)}s`);
    
    return false;
  }
}
