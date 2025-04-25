import OpenAI from 'openai';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createCanvas, loadImage } from 'canvas';

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

/**
 * Generate a mask that makes specific regions of the source image transparent
 * This helps control which parts of the image will be modified by the edit endpoint
 */
async function generateMask(imagePath: string, maskType: 'lower-half' | 'upper-half' | 'right-half' | 'left-half' = 'lower-half'): Promise<string> {
  try {
    console.log(`Creating mask (${maskType}) for image: ${imagePath}`);
    
    // Load the source image
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the source image
    ctx.drawImage(image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Set transparency based on mask type
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        
        let shouldBeMasked = false;
        
        switch (maskType) {
          case 'lower-half':
            shouldBeMasked = y > canvas.height / 2;
            break;
          case 'upper-half':
            shouldBeMasked = y < canvas.height / 2;
            break;
          case 'right-half':
            shouldBeMasked = x > canvas.width / 2;
            break;
          case 'left-half':
            shouldBeMasked = x < canvas.width / 2;
            break;
        }
        
        // If this pixel should be masked, make it transparent
        if (shouldBeMasked) {
          data[idx + 3] = 0; // Alpha channel
        }
      }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Save to a file
    const maskDir = path.dirname(imagePath);
    const maskPath = path.join(maskDir, `mask-${path.basename(imagePath)}`);
    const out = fs.createWriteStream(maskPath);
    const stream = canvas.createPNGStream();
    
    await new Promise<void>((resolve, reject) => {
      stream.pipe(out);
      out.on('finish', () => resolve());
      out.on('error', reject);
    });
    
    console.log(`Mask created at: ${maskPath}`);
    return maskPath;
  } catch (error) {
    console.error('Error generating mask:', error);
    throw error;
  }
}

/**
 * Generate a fusion image using OpenAI's image editing endpoint
 * This uses the actual images as input instead of just names
 */
export async function generateWithImageEditing(
  pokemon1Name: string,
  pokemon2Name: string,
  pokemon1ImageUrl: string,
  pokemon2ImageUrl: string,
  maskType: 'lower-half' | 'upper-half' | 'right-half' | 'left-half' = 'lower-half'
): Promise<string | null> {
  try {
    console.log('OpenAI Image Edit - Starting generation');
    console.log('OpenAI Image Edit - API Key format check:', process.env.OPENAI_API_KEY?.startsWith('sk-'));
    console.log('OpenAI Image Edit - Using mask type:', maskType);

    // Create a temporary directory to store the downloaded images
    const tempDir = path.join(os.tmpdir(), 'fusion-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const image1Path = path.join(tempDir, `source1-${Date.now()}.png`);
    const image2Path = path.join(tempDir, `source2-${Date.now()}.png`);

    try {
      // Download the source images
      console.log('OpenAI Image Edit - Downloading source images');
      const [image1Response, image2Response] = await Promise.all([
        axios.get(pokemon1ImageUrl, { responseType: 'arraybuffer' }),
        axios.get(pokemon2ImageUrl, { responseType: 'arraybuffer' })
      ]);

      fs.writeFileSync(image1Path, Buffer.from(image1Response.data));
      fs.writeFileSync(image2Path, Buffer.from(image2Response.data));
      
      // Generate a mask for the base image
      const maskPath = await generateMask(image1Path, maskType);

      // Create the prompt for the fusion without explicitly mentioning Pokémon
      const prompt = `Create a character fusion that combines visual elements from both reference images:
        - Use the first image as the base structure and maintain its pose
        - Incorporate key visual elements from the second image such as color patterns, distinctive features, and thematic elements
        - Focus on modifying only the parts indicated by the transparent areas of the mask
        - Maintain the same art style as both original images
        - The fusion should appear cohesive and natural, as if it were a new original character
        - Keep a clean white background with no additional elements`;

      console.log('OpenAI Image Edit - Sending request with visual-focused prompt and mask');

      // Call the OpenAI image edit endpoint with mask
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: fs.createReadStream(image1Path),
        mask: fs.createReadStream(maskPath),
        prompt: prompt,
        n: 1, 
        size: "1024x1024"
      });

      // Clean up temporary files
      try {
        fs.unlinkSync(image1Path);
        fs.unlinkSync(image2Path);
        fs.unlinkSync(maskPath);
      } catch (cleanupError) {
        console.warn('OpenAI Image Edit - Error cleaning up temporary files:', cleanupError);
      }

      if (!response.data || response.data.length === 0) {
        console.error('OpenAI Image Edit - No image data in response');
        return null;
      }

      // Handle the response (URL or base64)
      if (response.data[0].url) {
        console.log('OpenAI Image Edit - Successfully generated image URL');
        return response.data[0].url;
      } else if (response.data[0].b64_json) {
        console.log('OpenAI Image Edit - Got base64 data, converting to URL would be needed');
        // For now, just like in the other function, we'll return null since we expect URLs
        return null;
      }

      console.error('OpenAI Image Edit - No image URL or base64 in response data');
      return null;

    } catch (apiError) {
      // Log the specific API error
      console.error('OpenAI Image Edit - API Error:', {
        error: apiError,
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
        name: apiError instanceof Error ? apiError.name : 'Unknown error type'
      });
      
      // Check for organization verification error
      if (apiError instanceof Error && 
          apiError.message && 
          apiError.message.includes('organization verification')) {
        console.error('OpenAI Image Edit - Organization verification required. Please visit: https://help.openai.com/en/articles/10910291-api-organization-verification');
      }

      // Check for content policy violation
      if (apiError instanceof Error && 
          (apiError.message?.includes('content policy') || apiError.message?.includes('safety system'))) {
        console.error('OpenAI Image Edit - Content policy violation: The request was rejected by the moderation system');
      }
      
      return null;
    }
  } catch (error) {
    console.error('OpenAI Image Edit - Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
} 