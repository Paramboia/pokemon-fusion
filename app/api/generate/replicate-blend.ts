import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// Set environment-specific timeouts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_TIMEOUT = IS_PRODUCTION ? 75000 : 90000; // 75 seconds in production, 90 seconds in development
const MAX_RETRIES = parseInt(process.env.REPLICATE_MAX_RETRIES || '2', 10);
const SAVE_LOCAL_COPIES = process.env.SAVE_LOCAL_COPIES !== 'false'; // Default to true

// Function to create a timeout promise that rejects after a specified time
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

// Initialize Replicate client with timeout
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  // Add timeout configuration within Vercel's limits
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(API_TIMEOUT) // Timeout for each request
    });
  }
});

// Helper function to download and save an image
async function downloadAndSaveImage(imageUrl: string, pokemon1Name: string, pokemon2Name: string, requestId: string): Promise<{ remoteUrl: string, localUrl: string | null }> {
  try {
    // Create directory path if it doesn't exist
    const outputDirPath = path.join(process.cwd(), 'public', 'pending_enhancement_output');
    if (!fs.existsSync(outputDirPath)) {
      try {
        fs.mkdirSync(outputDirPath, { recursive: true });
        console.log(`[${requestId}] Created directory: ${outputDirPath}`);
      } catch (dirError) {
        console.error(`[${requestId}] Error creating directory: ${dirError instanceof Error ? dirError.message : String(dirError)}`);
        // Continue even if directory creation fails - might already exist with different permissions
      }
    }

    // Generate a unique filename based on Pokemon names and timestamp
    const timestamp = Date.now();
    const sanitizedPokemon1 = pokemon1Name.replace(/[^a-zA-Z0-9]/g, '');
    const sanitizedPokemon2 = pokemon2Name.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `replicate-blend_${sanitizedPokemon1}_${sanitizedPokemon2}_${timestamp}.png`;
    const filePath = path.join(outputDirPath, filename);
    const relativeFilePath = `/pending_enhancement_output/${filename}`;

    // Download the image with a timeout
    console.log(`[${requestId}] Downloading image from ${imageUrl.substring(0, 50)}...`);
    try {
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer', 
        timeout: 15000, // Increase timeout to 15 seconds
        maxContentLength: 10 * 1024 * 1024 // 10MB max size
      });
      
      // Save the image using sharp to ensure proper format
      await sharp(Buffer.from(response.data))
        .toFormat('png')
        .toFile(filePath);

      console.log(`[${requestId}] Saved image to ${filePath}`);
      
      // Verify the file was actually saved
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          console.log(`[${requestId}] Verified file exists with size: ${stats.size} bytes`);
          // Return both the remote URL and local path
          return {
            remoteUrl: imageUrl,
            localUrl: relativeFilePath
          };
        } else {
          console.error(`[${requestId}] File was created but has 0 bytes: ${filePath}`);
          // File exists but is empty, treat as failure
          return {
            remoteUrl: imageUrl,
            localUrl: null
          };
        }
      } else {
        console.error(`[${requestId}] Failed to save image - file doesn't exist after save operation: ${filePath}`);
        return {
          remoteUrl: imageUrl,
          localUrl: null
        };
      }
    } catch (downloadError) {
      console.error(`[${requestId}] Error downloading image: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
      return {
        remoteUrl: imageUrl,
        localUrl: null
      };
    }
  } catch (error) {
    console.error(`[${requestId}] Error in downloadAndSaveImage: ${error instanceof Error ? error.message : String(error)}`);
    // If we can't save locally, just return the remote URL
    return {
      remoteUrl: imageUrl,
      localUrl: null
    };
  }
}

export async function generateWithReplicateBlend(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null | { remoteUrl: string, localUrl: string | null }> {
  const requestId = `replicate-blend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  
  try {
    // Log the start of the process
    console.warn(`[${requestId}] REPLICATE BLEND - START - ${pokemon1Name} + ${pokemon2Name} at ${new Date().toISOString()}`);
    console.log(`[${requestId}] REPLICATE BLEND - API Token check: ${process.env.REPLICATE_API_TOKEN ? 'present' : 'missing'}`);

    // Check if the feature is enabled (default to true if not set)
    const useReplicateBlend = process.env.USE_REPLICATE_BLEND !== 'false';
    if (!useReplicateBlend) {
      console.warn(`[${requestId}] REPLICATE BLEND - SKIPPED - Feature is explicitly disabled`);
      return null;
    }

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
    console.warn(`[${requestId}] REPLICATE BLEND - API CALL STARTING at ${new Date().toISOString()}`);
    
    // Run the model with retries for resilience
    let output;
    let retryCount = 0;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        // Use a race between the API call and a timeout
        output = await Promise.race([
          replicate.run(
            "charlesmccarthy/blend-images:1ed8aaaa04fa84f0c1191679e765d209b94866f6503038416dcbcb340fede892",
            { input }
          ),
          timeout(API_TIMEOUT - 1000) // Slightly shorter than the fetch timeout to ensure we get a clean error
        ]);
        break; // If successful, exit the retry loop
      } catch (retryError) {
        retryCount++;
        const retryWaitTime = 500 * Math.pow(2, retryCount); // Exponential backoff
        
        console.error(`[${requestId}] REPLICATE BLEND - Attempt ${retryCount} failed:`, {
          error: retryError,
          message: retryError instanceof Error ? retryError.message : 'Unknown error'
        });
        
        if (retryCount > MAX_RETRIES) {
          console.warn(`[${requestId}] REPLICATE BLEND - All ${MAX_RETRIES} retries failed`);
          throw retryError; // Re-throw if all retries failed
        }
        
        // Wait before retrying (exponential backoff)
        console.log(`[${requestId}] REPLICATE BLEND - Retrying in ${retryWaitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryWaitTime));
      }
    }

    const requestDuration = Date.now() - startTime;
    console.warn(`[${requestId}] REPLICATE BLEND - API CALL COMPLETED in ${requestDuration}ms`);

    // The output should be a URL to the generated image
    if (!output) {
      console.error(`[${requestId}] REPLICATE BLEND - ERROR - No output from model`);
      return null;
    }

    console.warn(`[${requestId}] REPLICATE BLEND - SUCCESS - Generated image URL: ${typeof output === 'string' ? output.substring(0, 50) + '...' : 'invalid format'}`);
    
    // If output is not a string (URL), just return it as is
    if (typeof output !== 'string') {
      console.error(`[${requestId}] REPLICATE BLEND - ERROR - Output is not a string URL`);
      return output as string;
    }
    
    // Save the image locally if enabled
    if (SAVE_LOCAL_COPIES) {
      console.log(`[${requestId}] REPLICATE BLEND - Saving image to local storage`);
      try {
        // Use timeout to prevent hanging if download takes too long
        const downloadPromise = downloadAndSaveImage(output, pokemon1Name, pokemon2Name, requestId);
        const savedImage = await Promise.race([
          downloadPromise,
          timeout(20000) // 20 second timeout for image download/save
        ]).catch(err => {
          console.error(`[${requestId}] REPLICATE BLEND - Image save timed out: ${err.message}`);
          return { remoteUrl: output, localUrl: null };
        });
        
        console.log(`[${requestId}] REPLICATE BLEND - Image saved successfully to ${savedImage.localUrl || 'unknown'}`);
        return savedImage;
      } catch (saveError) {
        console.error(`[${requestId}] REPLICATE BLEND - Error saving image:`, saveError);
        // Return just the URL if saving fails
        return output;
      }
    } else {
      console.log(`[${requestId}] REPLICATE BLEND - Skipping local storage (disabled)`);
      return output;
    }
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error(`[${requestId}] REPLICATE BLEND - ERROR - Failed after ${requestDuration}ms:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for common Replicate errors
    if (error instanceof Error) {
      if (error.message.includes('API token')) {
        console.error(`[${requestId}] REPLICATE BLEND - API token error. Please check your REPLICATE_API_TOKEN environment variable.`);
      } else if (error.message.includes('rate limit')) {
        console.error(`[${requestId}] REPLICATE BLEND - Rate limit reached. Please try again later.`);
      } else if (error.message.includes('timeout')) {
        console.error(`[${requestId}] REPLICATE BLEND - Request timed out after ${API_TIMEOUT}ms.`);
      } else if (error.message.includes('abort') || error.message.includes('aborted')) {
        console.error(`[${requestId}] REPLICATE BLEND - Request was aborted: ${error.message}`);
      }
    }
    
    return null;
  }
}

// Helper function to handle different image format inputs
export function prepareImageForReplicate(imageInput: string): string {
  // If the image is already a URL, return it as is
  if (imageInput.startsWith('http')) {
    return imageInput;
  }
  
  // If it's a base64 data URL, it's already in the right format
  if (imageInput.startsWith('data:')) {
    return imageInput;
  }
  
  // If it's a base64 string without the data URI prefix, add it
  if (imageInput.match(/^[A-Za-z0-9+/=]+$/)) {
    return `data:image/png;base64,${imageInput}`;
  }
  
  // Return as is for other cases
  return imageInput;
} 