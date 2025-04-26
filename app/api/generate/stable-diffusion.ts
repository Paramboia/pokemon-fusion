import Replicate from 'replicate';

// Set environment-specific timeouts
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_TIMEOUT = IS_PRODUCTION ? 25000 : 45000; // 25 seconds in production (to fit within 60s limit), 45 seconds in development
const MAX_RETRIES = parseInt(process.env.REPLICATE_MAX_RETRIES || '2', 10);

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

/**
 * Generate a Pokemon fusion using Stable Diffusion 3.5 via Replicate
 * This function uses Pokemon names as inputs for text-to-image generation
 */
export async function generatePokemonFusionWithStableDiffusion(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null> {
  const requestId = `stable-diffusion-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  
  try {
    // Log the start of the process
    console.warn(`[${requestId}] STABLE DIFFUSION - START - ${pokemon1Name} + ${pokemon2Name} at ${new Date().toISOString()}`);
    console.log(`[${requestId}] STABLE DIFFUSION - API Token check: ${process.env.REPLICATE_API_TOKEN ? 'present' : 'missing'}`);

    // Check if the feature is enabled
    if (process.env.USE_STABLE_DIFFUSION !== 'true') {
      console.warn(`[${requestId}] STABLE DIFFUSION - SKIPPED - Feature is disabled`);
      return null;
    }

    // Create the fusion prompt using the provided template
    const fusionPrompt = `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                Design: Incorporate key physical features from both ${pokemon1Name} and ${pokemon2Name}, blending them into a seamless and natural-looking hybrid. 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading, kid friendly.
                Viewpoint: Three-quarter front-facing angle like typical official Pokémon artwork.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.`;

    // Create the input for Stable Diffusion 3.5 (text-to-image)
    const input = {
      prompt: fusionPrompt,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 8.5,  // Higher guidance scale to better follow the prompt
      apply_watermark: false,
      negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry, multiple pokemon, text, watermark, signature, disfigured"
    };

    console.log(`[${requestId}] STABLE DIFFUSION - Running model with text prompt`);
    console.warn(`[${requestId}] STABLE DIFFUSION - API CALL STARTING at ${new Date().toISOString()}`);
    
    // Run the model with retries for resilience
    let output;
    let retryCount = 0;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        output = await replicate.run(
          "stability-ai/stable-diffusion-3.5-large",
          { input }
        );
        break; // If successful, exit the retry loop
      } catch (retryError) {
        retryCount++;
        const retryWaitTime = 500 * Math.pow(2, retryCount); // Exponential backoff
        
        console.error(`[${requestId}] STABLE DIFFUSION - Attempt ${retryCount} failed:`, {
          error: retryError,
          message: retryError instanceof Error ? retryError.message : 'Unknown error'
        });
        
        if (retryCount > MAX_RETRIES) {
          console.warn(`[${requestId}] STABLE DIFFUSION - All ${MAX_RETRIES} retries failed`);
          throw retryError; // Re-throw if all retries failed
        }
        
        // Wait before retrying (exponential backoff)
        console.log(`[${requestId}] STABLE DIFFUSION - Retrying in ${retryWaitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryWaitTime));
      }
    }

    const requestDuration = Date.now() - startTime;
    console.warn(`[${requestId}] STABLE DIFFUSION - API CALL COMPLETED in ${requestDuration}ms`);

    // The output should be an array with the URL to the generated image
    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error(`[${requestId}] STABLE DIFFUSION - ERROR - No output from model`);
      return null;
    }

    // Return the first image URL from the output
    const imageUrl = output[0] as string;
    console.warn(`[${requestId}] STABLE DIFFUSION - SUCCESS - Generated image URL: ${imageUrl ? imageUrl.substring(0, 50) + '...' : 'invalid format'}`);
    return imageUrl;
  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error(`[${requestId}] STABLE DIFFUSION - ERROR - Failed after ${requestDuration}ms:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for common Replicate errors
    if (error instanceof Error) {
      if (error.message.includes('API token')) {
        console.error(`[${requestId}] STABLE DIFFUSION - API token error. Please check your REPLICATE_API_TOKEN environment variable.`);
      } else if (error.message.includes('rate limit')) {
        console.error(`[${requestId}] STABLE DIFFUSION - Rate limit reached. Please try again later.`);
      } else if (error.message.includes('timeout')) {
        console.error(`[${requestId}] STABLE DIFFUSION - Request timed out after ${API_TIMEOUT}ms.`);
      }
    }
    
    return null;
  }
}

// For backward compatibility, export the main function as the "advanced" function too
export const generateAdvancedPokemonFusion = generatePokemonFusionWithStableDiffusion;

// Helper function is kept for backward compatibility
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