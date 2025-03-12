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
        prompt: `Create a brand-new creature inspired by ${pokemon1Name} and ${pokemon2Name}.
                The creature should have a powerful and still kid-friendly appearance, combining ${pokemon1Name} aspect-like form with ${pokemon2Name} aspect-like form.
                It should have the most recognizable physical traits of both images into a seamless, single creature.
                The color palette should be a mix of both images, seamlessly blending their elemental nature.
                The art style should be highly detailed, resembling fantasy RPG concept art with a smooth, animated look.
                The background must be pure white, without any additional elements, to keep the focus on the creature.`,
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