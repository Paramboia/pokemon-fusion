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
        prompt: `Create a brand-new Pokemon that is a fusion of ${pokemon1Name} and ${pokemon2Name}. 
                The design should blend the most recognizable physical traits of both Pokemon into a seamless, single creature. 
                Use ${pokemon1Name} as the base, incorporating key features from ${pokemon2Name} while maintaining a balanced and original look. 
                The art style should be Japanese anime-style, kid-friendly, highly detailed, cel-shaded, with clean outlines and soft lighting. 
                The creature should have a polished, animated look, reminiscent of fantasy RPG concept art.
                It should appear dynamic and expressive, with a strong yet friendly appearance. 
                The background must be solid white with no shadows, gradients, or other elements. 
                The new fusion Pokemon should be shown from a single front-facing, slightly turned angle, similar to the typical angle used in official Pokemon art. 
                The image must only feature the new fusion Pokemon, with no additional parts, text, or extra content.
                Only one Pokemon in the image, no text, logos, or other creatures. 
                It should not contain any text, labels, borders, measurements nor design elements of any kind.
                No evolution process in the image—just the fusion of the two Pokemon.
                No mechanical parts, excessive spikes, or unnatural color combinations.
                No multiple angled views—only one angle, no duplicates, and nothing cropped off-screen.
                Very IMPORTANT, make the image a Pokemon character illustration, not a concept art.`,
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