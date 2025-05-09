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

// Add environment details to help debug production vs development issues
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_VERCEL = !!process.env.VERCEL;
console.warn(`🌎 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}, Platform: ${IS_VERCEL ? 'VERCEL' : 'LOCAL'}`);

// Reduce timeouts for production to avoid Vercel function timeouts
// On hobby plan, we need to complete everything within 60 seconds
const API_TIMEOUT = IS_PRODUCTION ? 290000 : 180000; // 290 seconds in production, 3 minutes in development

// Validate API key format and log details to help with debugging
const apiKey = process.env.OPENAI_API_KEY || '';
console.warn('🔴🔴🔴 DALLE.TS - OpenAI API Key Format Check 🔴🔴🔴');
console.warn('API Key exists:', !!apiKey);
console.warn('API Key length:', apiKey.length);
if (apiKey) {
  console.warn('API Key starts with:', apiKey.substring(0, 3) + '***'); // Show only first few chars for security
  console.warn('Is API Key properly formatted:', apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'));
} else {
  console.warn('⚠️ NO API KEY FOUND - Enhancement will not work!');
}

// Initialize OpenAI client with a simpler approach
function getOpenAiClient() {
  try {
    // Create a fresh client instance with the current API key
    console.warn('🔴🔴🔴 DALLE.TS - Creating OpenAI client 🔴🔴🔴');
    // Check for a valid API key before attempting to create client
    if (!apiKey || apiKey.length < 20 || (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-'))) {
      console.error('🔴🔴🔴 DALLE.TS - Invalid API key format, client will not be created 🔴🔴🔴');
      return null;
    }
    
    const openaiClient = new OpenAI({
      apiKey: apiKey,
      timeout: IS_PRODUCTION ? 45000 : 120000,  // 45 seconds timeout in production, 2 minutes in development
      maxRetries: IS_PRODUCTION ? 1 : 2     // Fewer retries in production to avoid timeouts
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

// Set shorter timeouts for production environments
const ENHANCEMENT_TIMEOUT = parseInt(process.env.ENHANCEMENT_TIMEOUT || (IS_PRODUCTION ? '290000' : '150000'), 10);
const SKIP_LOCAL_FILES = process.env.SKIP_LOCAL_FILES === 'true';

// Stricter timeout in production
const ENHANCEMENT_STRICT_TIMEOUT = IS_PRODUCTION ? 290000 : 150000;

// Define the enhancement prompt once to avoid duplication - using generic terms
const ENHANCEMENT_PROMPT = `Use the uploaded image as the design reference for the output.
Recreate the same anime creature, keeping the body structure, pose, key features intact, and same color palette.
Only improve the artistic quality by using clean, smooth outlines, cel-shaded coloring, soft shading, and vivid colors.
The final style should be teenager-friendly, early 2000s anime-inspired, and polished.
Do not change the anime creature into a different one, and do not change its overall body orientation.
This is not a redesign, it's an illustration upgrade.
Ensure the background is transparent.`;

// Define the image description prompt for GPT-4V
const DESCRIPTION_PROMPT = `Please describe this image for use in a clean, stylized illustration prompt. I want you to break it down into:

Body structure and pose:
Color palette:
Key features:
Texture and surface:
Species influence or type vibe (avoid direct naming):
Attitude and expression:
Notable accessories or markings:

The goal is to create an original creature description that will later be turned into a polished illustration.
Describe it generically, avoiding any existing character names or IP references.`;

// Function to create a timeout promise that rejects after a specified time
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

/**
 * New function to describe an image using GPT-4 Vision
 * Takes an image URL and returns a detailed description
 */
async function describeImageWithGpt4(
  imageUrl: string,
  requestId = `gpt-describe-${Date.now()}`
): Promise<string | null> {
  console.warn(`[${requestId}] GPT DESCRIPTION - Starting image description with GPT-4 Vision`);
  
  // Validate API key and client
  if (!apiKey) {
    console.error(`[${requestId}] GPT DESCRIPTION - Missing OpenAI API key`);
    return null;
  }
  
  const openai = getOpenAiClientSafe();
  if (!openai) {
    console.error(`[${requestId}] GPT DESCRIPTION - Failed to get OpenAI client`);
    return null;
  }
  
  try {
    // Download the image
    console.warn(`[${requestId}] GPT DESCRIPTION - Downloading image from URL`);
    let imageData: string;
    
    try {
      const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: IS_PRODUCTION ? 5000 : 10000 // Shorter timeout in production
      });
      imageData = Buffer.from(imageResponse.data).toString('base64');
      console.warn(`[${requestId}] GPT DESCRIPTION - Successfully downloaded and converted image (${imageData.length / 1024} KB)`);
    } catch (downloadError) {
      console.error(`[${requestId}] GPT DESCRIPTION - Failed to download image:`, downloadError);
      imageData = imageUrl; // Fall back to using the URL directly
    }
    
    // Prepare the image parameter based on what we have
    const imageParam = imageData.startsWith('http') 
      ? imageData  // It's a URL
      : `data:image/png;base64,${imageData}`; // It's base64 data
    
    // Make the OpenAI API call with GPT-4 Vision
    console.warn(`[${requestId}] GPT DESCRIPTION - Starting chat completion with GPT-4 Vision`);
    
    // Set a timeout
    const descriptionTimeout = IS_PRODUCTION ? 20000 : 30000; // 20 seconds in production, 30 in development
    
    // Create a promise that will reject after a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`GPT-4 Vision description call timed out after ${descriptionTimeout}ms`));
      }, descriptionTimeout);
    });
    
    // Call the API with a race against the timeout
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: DESCRIPTION_PROMPT },
              { 
                type: "image_url", 
                image_url: {
                  url: imageParam,
                  detail: "low" // Use low detail to reduce tokens
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
      timeoutPromise
    ]);
    
    // Check if we got a valid response
    if (!response?.choices?.[0]?.message?.content) {
      console.error(`[${requestId}] GPT DESCRIPTION - No valid content in response`);
      return null;
    }
    
    // Get the description text
    const description = response.choices[0].message.content;
    console.warn(`[${requestId}] GPT DESCRIPTION - Successfully generated description (${description.length} chars)`);
    
    return description;
  } catch (error) {
    console.error(`[${requestId}] GPT DESCRIPTION - Error describing image:`, error);
    return null;
  }
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
  
  // Extract any existing ID from the Replicate URL to maintain relationship
  // This helps avoid creating disconnected duplicates
  let originalId = '';
  try {
    // Try to extract an ID from the URL like "fusion_1746225604693.png"
    const match = imageUrl.match(/fusion[_-](\d+)/);
    if (match && match[1]) {
      originalId = match[1];
      console.warn(`[${requestId}] GPT ENHANCEMENT - Found original ID: ${originalId}`);
    }
  } catch (e) {
    // Ignore extraction errors
  }
  
  // Log environment info to help debug production issues
  console.warn(`🔴🔴🔴 DALLE.TS - [${requestId}] enhanceWithDirectGeneration CALLED - ENV: ${IS_PRODUCTION ? 'PROD' : 'DEV'}, PLATFORM: ${IS_VERCEL ? 'VERCEL' : 'LOCAL'} 🔴🔴🔴`);
  console.warn('🔴🔴🔴 Image URL:', imageUrl?.substring(0, 50) + '...', '🔴🔴🔴');
  
  // Additional API key validation for production
  if (IS_PRODUCTION) {
    console.warn(`[${requestId}] PRODUCTION CHECK - API key exists: ${!!apiKey}, length: ${apiKey.length}, starts with: ${apiKey.substring(0, 3)}***`);
  }
  
  // Validate input parameters
  if (!imageUrl) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Missing required image URL`);
    return null;
  }
  
  // Check for OpenAI API key
  if (!apiKey) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Missing OpenAI API key`);
    return null;
  }

  // Additional format validation
  if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Invalid API key format (doesn't start with sk-)`);
    return null;
  }

  // Get the OpenAI client
  const openai = getOpenAiClientSafe();
  if (!openai) {
    console.error(`[${requestId}] GPT ENHANCEMENT - Failed to get OpenAI client`);
    return null;
  }
  
  try {
    // STEP 1: Describe the image using GPT-4 Vision
    console.warn(`[${requestId}] GPT ENHANCEMENT - STEP 1: Generating image description with GPT-4 Vision`);
    const imageDescription = await describeImageWithGpt4(imageUrl, requestId);
    
    if (!imageDescription) {
      console.warn(`[${requestId}] GPT ENHANCEMENT - Failed to get image description, using generic prompt`);
      // Fall back to the generic enhancement prompt
      return await generateImageWithPrompt(ENHANCEMENT_PROMPT, imageUrl, requestId, originalId);
    }
    
    // STEP 2: Create an improved prompt using the description
    console.warn(`[${requestId}] GPT ENHANCEMENT - STEP 2: Creating prompt from description`);
    console.warn(`[${requestId}] GPT ENHANCEMENT - Description: ${imageDescription.substring(0, 200)}...`);
    
    // Extract key elements from the description
    let bodyStructure = "unknown body structure";
    let colorPalette = "vibrant colors";
    let keyFeatures = "distinctive features";
    let textureAndSurface = "smooth surface";
    let speciesInfluence = "unique creature type";
    let attitudeAndExpression = "neutral expression";
    let notableAccessories = "no distinctive markings";
    
    // Try to extract the sections from the description
    const bodyMatch = imageDescription.match(/Body structure and pose:([\s\S]*?)(?:Color palette:|$)/);
    if (bodyMatch && bodyMatch[1]) {
      bodyStructure = bodyMatch[1].trim();
    }
    
    const colorMatch = imageDescription.match(/Color palette:([\s\S]*?)(?:Key features:|$)/);
    if (colorMatch && colorMatch[1]) {
      colorPalette = colorMatch[1].trim();
    }
    
    const featuresMatch = imageDescription.match(/Key features:([\s\S]*?)(?:Texture and surface:|$)/);
    if (featuresMatch && featuresMatch[1]) {
      keyFeatures = featuresMatch[1].trim();
    }
    
    const textureMatch = imageDescription.match(/Texture and surface:([\s\S]*?)(?:Species influence or type vibe:|$)/);
    if (textureMatch && textureMatch[1]) {
      textureAndSurface = textureMatch[1].trim();
    }
    
    const speciesMatch = imageDescription.match(/Species influence or type vibe.*?:([\s\S]*?)(?:Attitude and expression:|$)/);
    if (speciesMatch && speciesMatch[1]) {
      speciesInfluence = speciesMatch[1].trim();
    }
    
    const expressionMatch = imageDescription.match(/Attitude and expression:([\s\S]*?)(?:Notable accessories or markings:|$)/);
    if (expressionMatch && expressionMatch[1]) {
      attitudeAndExpression = expressionMatch[1].trim();
    }
    
    const accessoriesMatch = imageDescription.match(/Notable accessories or markings:([\s\S]*?)$/);
    if (accessoriesMatch && accessoriesMatch[1]) {
      notableAccessories = accessoriesMatch[1].trim();
    }
    
    // Create a new prompt based on the description
    const customPrompt = `Illustrate an original cartoon creature with ${bodyStructure}, using a ${colorPalette}. 
The creature features ${keyFeatures} with ${textureAndSurface}.
It has a ${speciesInfluence} aesthetic, displaying a ${attitudeAndExpression}.
Additional details include ${notableAccessories}.
The creature should be whimsical, expressive, and anime-inspired. 
Style it for a teenager-friendly, early 2000s anime look. Use smooth, clean outlines, cel-shading, soft shadows, and vibrant colors. 
Creature it's not equal to a dragon, it might resemble another cartoon species.
Do not recreate or reference any existing character or franchise.
Keep the background transparent.`;
    
    console.warn(`[${requestId}] GPT ENHANCEMENT - Created custom prompt: ${customPrompt.substring(0, 200)}...`);
    
    // STEP 3: Generate the final image with the custom prompt
    console.warn(`[${requestId}] GPT ENHANCEMENT - STEP 3: Generating final image with custom prompt`);
    return await generateImageWithPrompt(customPrompt, imageUrl, requestId, originalId);
    
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
 * Helper function to generate an image with gpt-image-1 using a specified prompt
 * This is used by enhanceWithDirectGeneration to avoid code duplication
 */
async function generateImageWithPrompt(
  prompt: string,
  referenceImageUrl: string,
  requestId: string,
  originalId: string = ''
): Promise<string | null> {
  // Get the OpenAI client
  const openai = getOpenAiClientSafe();
  if (!openai) {
    console.error(`[${requestId}] GPT IMAGE GENERATION - Failed to get OpenAI client`);
    return null;
  }
  
  try {
    // Download the image (just for reference, not used in the API call)
    console.warn(`[${requestId}] GPT IMAGE GENERATION - Downloading reference image`);
    let imageData: string;
    
    try {
      const imageResponse = await axios.get(referenceImageUrl, { 
        responseType: 'arraybuffer',
        timeout: IS_PRODUCTION ? 5000 : 10000 // Shorter timeout in production
      });
      imageData = Buffer.from(imageResponse.data).toString('base64');
      console.warn(`[${requestId}] GPT IMAGE GENERATION - Successfully downloaded reference image (${imageData.length / 1024} KB)`);
    } catch (downloadError) {
      console.error(`[${requestId}] GPT IMAGE GENERATION - Failed to download reference image:`, downloadError);
      imageData = referenceImageUrl; // Fall back to using the URL directly
    }
    
    // Make the OpenAI API call with gpt-image-1 only
    console.warn(`[${requestId}] GPT IMAGE GENERATION - Starting image generation with gpt-image-1`);
    
    // Create params specifically for gpt-image-1 based on documentation
    const gptImageParams = {
      model: "gpt-image-1" as const,
      prompt: prompt,
      n: 1,
      size: "1024x1024" as const,
      quality: "high" as any,
      moderation: "low" as any,
      background: "transparent" as any
    };
    
    // Log the start time before calling API
    const apiStartTime = Date.now();
    console.warn(`[${requestId}] GPT IMAGE GENERATION - API call to gpt-image-1 started at ${new Date(apiStartTime).toISOString()}`);
    
    // Use a shorter timeout in production
    const actualTimeout = IS_PRODUCTION ? ENHANCEMENT_STRICT_TIMEOUT : ENHANCEMENT_TIMEOUT;
    console.warn(`[${requestId}] GPT IMAGE GENERATION - Using timeout of ${actualTimeout}ms for gpt-image-1`);
    
    // Create a promise that will reject after a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`gpt-image-1 API call timed out after ${actualTimeout}ms`));
      }, actualTimeout);
    });
    
    // Race the API call against the timeout
    const response = await Promise.race([
      openai.images.generate(gptImageParams),
      timeoutPromise
    ]);
    
    // Calculate and log duration
    const apiDuration = Date.now() - apiStartTime;
    console.warn(`[${requestId}] GPT IMAGE GENERATION - gpt-image-1 call succeeded after ${apiDuration}ms!`);
    
    // Add success log
    console.warn(`[${requestId}] GPT IMAGE GENERATION - OpenAI API call succeeded!`);
    
    // Process URL response
    if (response?.data?.[0]?.url) {
      const newImageUrl = response.data[0].url;
      console.warn(`[${requestId}] GPT IMAGE GENERATION - SUCCESS - Got URL response: ${newImageUrl.substring(0, 50)}...`);
      return newImageUrl;
    }
    
    // Process base64 response
    if (response?.data?.[0]?.b64_json) {
      console.warn(`[${requestId}] GPT IMAGE GENERATION - Got base64 response`);
      
      if (!supabaseAdmin) {
        console.error(`[${requestId}] GPT IMAGE GENERATION - Cannot handle base64 data without Supabase`);
        return null;
      }
      
      // Extract and process the base64 data
      const b64Data = response.data[0].b64_json;
      
      // Generate a consistent filename that keeps association with original
      // If we have the original ID, use it, otherwise use current timestamp
      const timestamp = originalId || Date.now().toString();
      const randomId = Math.random().toString(36).substring(2, 6);
      
      // Create a filename that clearly shows this is a GPT-enhanced version
      // Format: fusion-gpt-enhanced-{timestamp}-{randomId}.png
      const fileName = `fusion-gpt-enhanced-${timestamp}-${randomId}.png`;
      
      console.warn(`[${requestId}] GPT IMAGE GENERATION - Using consistent filename: ${fileName}`);
      
      const base64Data = b64Data.includes('base64,') ? b64Data.split('base64,')[1] : b64Data;
      const bucketName = 'fusions';
      
      try {
        // Upload to Supabase with the consistent filename
        console.warn(`[${requestId}] GPT IMAGE GENERATION - Uploading to Supabase: ${fileName}`);
        
        const { error: storageError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .upload(fileName, Buffer.from(base64Data, 'base64'), {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true // Will replace if exists
          });
        
        if (storageError) {
          console.error(`[${requestId}] GPT IMAGE GENERATION - Supabase upload error:`, storageError);
          return null;
        }
        
        // Get the public URL
        const { data: publicUrlData } = supabaseAdmin
          .storage
          .from(bucketName)
          .getPublicUrl(fileName);
        
        if (publicUrlData?.publicUrl) {
          const newImageUrl = publicUrlData.publicUrl;
          console.warn(`[${requestId}] GPT IMAGE GENERATION - SUCCESS - Uploaded to Supabase: ${newImageUrl}`);
          return newImageUrl;
        } else {
          console.error(`[${requestId}] GPT IMAGE GENERATION - Failed to get public URL from Supabase`);
          return null;
        }
      } catch (uploadError) {
        console.error(`[${requestId}] GPT IMAGE GENERATION - Error during Supabase upload:`, uploadError);
        return null;
      }
    }
    
    // If we got here, we didn't get a valid response
    console.error(`[${requestId}] GPT IMAGE GENERATION - No valid URL or base64 data in response`);
    return null;
  } catch (error) {
    // Error handler
    console.error(`[${requestId}] GPT IMAGE GENERATION - Error:`, error);
    return null;
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
