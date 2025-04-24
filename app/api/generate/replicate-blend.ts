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

export async function generateWithReplicateBlend(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null> {
  try {
    console.log('Replicate Blend - Starting generation for:', { pokemon1Name, pokemon2Name });
    console.log('Replicate API Token check:', !!process.env.REPLICATE_API_TOKEN);

    // Ensure we have both images
    if (!processedImage1 || !processedImage2) {
      console.error('Replicate Blend - Missing image data');
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

    console.log('Replicate Blend - Running model with inputs');
    
    // Run the model with retries for resilience
    let output;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount < maxRetries) {
      try {
        output = await replicate.run(
          "charlesmccarthy/blend-images:1ed8aaaa04fa84f0c1191679e765d209b94866f6503038416dcbcb340fede892",
          { input }
        );
        break; // If successful, exit the retry loop
      } catch (retryError) {
        retryCount++;
        console.error(`Replicate Blend - Attempt ${retryCount} failed:`, retryError);
        if (retryCount === maxRetries) {
          throw retryError; // Re-throw if all retries failed
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      }
    }

    // The output should be a URL to the generated image
    if (!output) {
      console.error('Replicate Blend - No output from model');
      return null;
    }

    console.log('Replicate Blend - Successfully generated image:', output);
    return output as string;
  } catch (error) {
    console.error('Replicate Blend - Error generating image:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for common Replicate errors
    if (error instanceof Error) {
      if (error.message.includes('API token')) {
        console.error('Replicate Blend - API token error. Please check your REPLICATE_API_TOKEN environment variable.');
      } else if (error.message.includes('rate limit')) {
        console.error('Replicate Blend - Rate limit reached. Please try again later.');
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