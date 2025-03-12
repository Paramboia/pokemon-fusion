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
        prompt: `Create a brand-new creature that is a fusion of ${pokemon1Name} and ${pokemon2Name}. 
                The design should blend the most recognizable physical traits of both creatures in a seamless way, 
                resulting in an entirely new original species. It must be a single creature in the new image.
                Use the first image as bit more of ground base, but still taking carachteristics from both and merging them.

                Art style: Japanese Anime kid cartoon creature style. Highly detailed, cel-shaded, and inspired by game concept art for fantasy RPG creatures.
                The design should have a smooth, polished, and animated, kids friendly look with clean outlines, soft lighting, 
                and a balanced color palette. 

                The creature should be dynamic and expressive, with a strong but friendly appearance. 
                The background must be completely white with no shadows or gray areas.

                No excessive spikes, mechanical features, robotic parts, or unnatural color combinations. 
                Do not include extra elements like additional characters, scenery, or text.
                No text or logos.`,
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