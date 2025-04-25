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
 * This function takes both Pokemon names and their images as inputs
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

    // Ensure we have at least the first image (used as base)
    if (!processedImage1) {
      console.error('Stable Diffusion - Missing base image data');
      return null;
    }

    // Prepare the image inputs
    const baseImage = prepareImageForReplicate(processedImage1);
    
    // Create the fusion prompt using the provided template
    const fusionPrompt = `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                The new Pokémon should retain the same pose, angle, and overall body positioning as ${pokemon1Name}'s official artwork. 
                Design: Incorporate key physical features from both ${pokemon1Name} and ${pokemon2Name}, blending them into a seamless and natural-looking hybrid. 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Match the exact pose and three-quarter front-facing angle of ${pokemon1Name}.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`;

    // Create the input for Stable Diffusion 3.5
    const input = {
      prompt: fusionPrompt,
      image: baseImage,  // Use the base Pokemon image as input
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 7.5,  // Controls how closely the image follows the prompt
      image_guidance_scale: 1.5,  // Controls how much influence the input image has
      apply_watermark: false,
      negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry, multiple pokemon, text, watermark, signature, disfigured"
    };

    console.log('Stable Diffusion - Running model with inputs');
    
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
 * Enhanced version that attempts to use both Pokemon images
 * This experimentally tries to incorporate both images for better fusion results
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
    
    // Ensure we have both images
    if (!processedImage1) {
      console.error('Stable Diffusion Advanced - Missing base image data');
      return null;
    }

    // Prepare the image inputs
    const baseImage = prepareImageForReplicate(processedImage1);
    
    // Create the enhanced fusion prompt that references the second image's features
    const featureDetailsPrompt = `The fusion should maintain the body structure of ${pokemon1Name} but incorporate these specific visual elements from ${pokemon2Name}:
                - Color scheme: Use ${pokemon2Name}'s primary colors for parts of the body
                - Distinctive features: Add ${pokemon2Name}'s signature visual elements (like fins, wings, spikes, etc.)
                - Type attributes: Visual indicators of ${pokemon2Name}'s elemental type
                - Patterns: Any notable patterns, markings or textures from ${pokemon2Name}`;
    
    // Combine with the base prompt template
    const fusionPrompt = `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                The new Pokémon should retain the same pose, angle, and overall body positioning as ${pokemon1Name}'s official artwork.
                ${featureDetailsPrompt} 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Match the exact pose and three-quarter front-facing angle of ${pokemon1Name}.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`;

    // Create the input for Stable Diffusion 3.5 with enhanced parameters
    const input = {
      prompt: fusionPrompt,
      image: baseImage,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 8.0,         // Slightly higher guidance scale for better prompt following
      image_guidance_scale: 1.5,    // Balance between keeping original structure and allowing changes
      apply_watermark: false,
      negative_prompt: "deformed, ugly, bad anatomy, poor drawing, poorly drawn, lowres, blurry, multiple pokemon, text, watermark, signature, disfigured"
    };

    console.log('Stable Diffusion Advanced - Running model with enhanced parameters');
    
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