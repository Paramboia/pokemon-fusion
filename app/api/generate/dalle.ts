import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the quality type for GPT-image-1 model
type GptImageQuality = 'low' | 'medium' | 'high' | 'auto';

export async function generateWithDallE(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null> {
  try {
    console.log('GPT-image-1 - Starting generation for:', { pokemon1Name, pokemon2Name });
    console.log('GPT-image-1 - API Key format check:', process.env.OPENAI_API_KEY?.startsWith('sk-'));

    // Create the image generation request
    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `Create a brand-new Pokémon that merges the traits of ${pokemon1Name} and ${pokemon2Name}, using ${pokemon1Name} as the base. 
                The new Pokémon should retain the same pose, angle, and overall body positioning as ${pokemon1Name}'s official artwork. 
                Design: Incorporate key physical features from both ${pokemon1Name} and ${pokemon2Name}, blending them into a seamless and natural-looking hybrid. 
                Art Style: Strictly follow Official Pokémon-style, cel-shaded, with clean outlines and smooth shading.
                Viewpoint: Match the exact pose and three-quarter front-facing angle of ${pokemon1Name}.
                Background: Pure white, no shadows, no extra elements.
                Composition: Only ONE full-body Pokémon in the image—no alternative angles, no evolution steps, no fusion schematics.
                Restrictions: No text, no labels, no extra Pokémon, no mechanical parts, no unnatural color combinations.`,
        n: 1,
        size: "1024x1024",
        quality: "high" as any,
      });

      if (!response.data || response.data.length === 0) {
        console.error('GPT-image-1 - No image data in response');
        return null;
      }

      // GPT-image-1 can return either a URL or a base64 encoded image
      let imageUrl = null;
      if (response.data[0].url) {
        imageUrl = response.data[0].url;
      } else if (response.data[0].b64_json) {
        // Handle base64 if needed, though the API typically returns URLs
        // You'd need to convert this to a URL or handle differently if necessary
        console.log('GPT-image-1 - Got base64 data instead of URL');
        // For now, we'll return null in this case as we expect URLs
        return null;
      }

      if (!imageUrl) {
        console.error('GPT-image-1 - No image URL in response data');
        return null;
      }

      console.log('GPT-image-1 - Successfully generated image:', imageUrl);
      return imageUrl;
    } catch (apiError) {
      // Log the specific API error
      console.error('GPT-image-1 - API Error:', {
        error: apiError,
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
        name: apiError instanceof Error ? apiError.name : 'Unknown error type'
      });
      
      // Check for organization verification error specifically
      if (apiError instanceof Error && 
          apiError.message && 
          apiError.message.includes('organization verification')) {
        console.error('GPT-image-1 - Organization verification required. Please visit: https://help.openai.com/en/articles/10910291-api-organization-verification');
      }
      
      return null;
    }
  } catch (error) {
    console.error('GPT-image-1 - Error generating image:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
} 