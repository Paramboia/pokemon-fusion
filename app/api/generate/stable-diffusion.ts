import Replicate from 'replicate';

// Initialize Replicate client with timeout
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  // Add timeout configuration within Vercel's limits
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(50000) // 50 second timeout for each request
    });
  }
});

/**
 * Generate a Pokemon fusion using Stable Diffusion 3.5 via Replicate
 * This function uses only Pokemon names as inputs for text-to-image generation
 */
export async function generatePokemonFusionWithStableDiffusion(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null> {
  try {
    console.log('Stable Diffusion - Starting generation for:', { pokemon1Name, pokemon2Name });
    console.log('Replicate API Token check:', !!process.env.REPLICATE_API_TOKEN);

    // Check if the feature is enabled
    if (process.env.USE_STABLE_DIFFUSION !== 'true') {
      console.log('Stable Diffusion - Feature is disabled');
      return null;
    }

    // Create the fusion prompt using the provided template
    const fusionPrompt = `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                Design: Incorporate key physical features from both ${pokemon1Name} and ${pokemon2Name}, blending them into a seamless and natural-looking hybrid. 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Three-quarter front-facing angle like typical official Pokémon artwork.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`;

    // Create the input for Stable Diffusion 3.5 (text-to-image)
    const input = {
      prompt: fusionPrompt,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 8.0,  // Higher guidance scale to better follow the prompt
      apply_watermark: false,
      negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry, multiple pokemon, text, watermark, signature, disfigured"
    };

    console.log('Stable Diffusion - Running model with text prompt only');
    
    // Run the model with retries for resilience
    let output;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount < maxRetries) {
      try {
        output = await replicate.run(
          "stability-ai/stable-diffusion-3.5-large",
          { input }
        );
        break; // If successful, exit the retry loop
      } catch (retryError) {
        retryCount++;
        console.error(`Stable Diffusion - Attempt ${retryCount} failed:`, retryError);
        if (retryCount === maxRetries) {
          throw retryError; // Re-throw if all retries failed
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      }
    }

    // The output should be an array with the URL to the generated image
    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error('Stable Diffusion - No output from model');
      return null;
    }

    // Return the first image URL from the output
    console.log('Stable Diffusion - Successfully generated image');
    return output[0] as string;
  } catch (error) {
    console.error('Stable Diffusion - Error generating image:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for common Replicate errors
    if (error instanceof Error) {
      if (error.message.includes('API token')) {
        console.error('Stable Diffusion - API token error. Please check your REPLICATE_API_TOKEN environment variable.');
      } else if (error.message.includes('rate limit')) {
        console.error('Stable Diffusion - Rate limit reached. Please try again later.');
      }
    }
    
    return null;
  }
}

/**
 * Enhanced version that uses a more detailed prompt
 * But still only uses the Pokemon names, not their images
 */
export async function generateAdvancedPokemonFusion(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null> {
  try {
    console.log('Stable Diffusion Advanced - Starting advanced fusion for:', { pokemon1Name, pokemon2Name });
    
    // Check if the feature is enabled
    if (process.env.USE_STABLE_DIFFUSION !== 'true') {
      console.log('Stable Diffusion Advanced - Feature is disabled');
      return null;
    }
    
    // Create the enhanced fusion prompt with more specific details
    const featureDetailsPrompt = `The fusion should include these specific elements:
                - Combine the body structure of both Pokémon with emphasis on their most distinctive features
                - Blend the color schemes from both Pokémon
                - Incorporate signature visual elements from both (like fins, wings, spikes, etc.)
                - Blend visual indicators of both Pokémon's elemental types
                - Combine any notable patterns, markings or textures from both Pokémon`;
    
    // Combine with the base prompt template
    const fusionPrompt = `Create a brand-new Pokémon that is a perfect fusion of ${pokemon1Name} and ${pokemon2Name}. 
                ${featureDetailsPrompt} 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Three-quarter front-facing angle like typical official Pokémon artwork.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`;

    // Create the input for Stable Diffusion 3.5 with enhanced parameters
    const input = {
      prompt: fusionPrompt,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 9.0,         // Higher guidance scale for better prompt following
      apply_watermark: false,
      negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry, multiple pokemon, text, watermark, signature, disfigured"
    };

    console.log('Stable Diffusion Advanced - Running model with detailed text prompt');
    
    // Run the model
    const output = await replicate.run(
      "stability-ai/stable-diffusion-3.5-large",
      { input }
    );

    // Check output
    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error('Stable Diffusion Advanced - No output from model');
      return null;
    }

    // Return the first image URL from the output
    console.log('Stable Diffusion Advanced - Successfully generated fusion image');
    return output[0] as string;
  } catch (error) {
    console.error('Stable Diffusion Advanced - Error:', error);
    return null;
  }
}

// Helper function is no longer needed since we're not using images
// But keeping it for backward compatibility
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