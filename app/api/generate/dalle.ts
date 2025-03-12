import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWithDallE(
  pokemon1Name: string,
  pokemon2Name: string,
  processedImage1: string,
  processedImage2: string
): Promise<string | null> {
  try {
    console.log('DALL·E 3 - Starting generation for:', { pokemon1Name, pokemon2Name });
    console.log('DALL·E 3 - API Key format check:', process.env.OPENAI_API_KEY?.startsWith('sk-proj-'));

    // Create the image generation request
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Create a new Fakemon that seamlessly blend the most recognizable physical traits of ${pokemon1Name} and ${pokemon2Name}. 
                Use ${pokemon1Name} as the base, integrating key features of ${pokemon2Name} in a balanced, organic way while keeping the original art style. 
                Art Style: Official Fakemon-style, kid-friendly, highly detailed, cel-shaded, clean outlines, smooth shading, and soft lighting, polished, animated look, reminiscent of fantasy RPG concept art.
                Viewpoint: Single three-quarter front-facing view (like official Fakemon artwork).
                Background: Pure white, no gradients, no shadows.
                Composition: Only ONE full-body Fakemon, no extra versions, no concept art breakdowns, no alternative angles.
                MANDATORY: No text, no labels, no evolution process, no fusion schematics, no mechanical parts, no duplicate angles.`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      });

      if (!response.data || response.data.length === 0) {
        console.error('DALL·E 3 - No image data in response');
        return null;
      }

      const imageUrl = response.data[0].url;
      if (!imageUrl) {
        console.error('DALL·E 3 - No image URL in response data');
        return null;
      }

      console.log('DALL·E 3 - Successfully generated image:', imageUrl);
      return imageUrl;
    } catch (apiError) {
      // Log the specific API error
      console.error('DALL·E 3 - API Error:', {
        error: apiError,
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
        name: apiError instanceof Error ? apiError.name : 'Unknown error type'
      });
      return null;
    }
  } catch (error) {
    console.error('DALL·E 3 - Error generating image:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
} 