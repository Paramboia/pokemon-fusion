import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { auth } from '@clerk/nextjs/server';
import { dbService } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Initialize Replicate with the API token
// Prefer the server-side environment variable
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN || '',
});

// Fallback function to generate a fusion image locally
// This is a simple implementation that just returns one of the original Pokemon images
// In a real implementation, you would use a local image processing library
const generateLocalFusion = (pokemon1Url: string, pokemon2Url: string, name1: string, name2: string) => {
  console.log('Using local fusion generation as fallback');
  // For now, just return the first Pokemon image
  // In a real implementation, you would combine the images
  return pokemon1Url;
};

export async function POST(req: Request) {
  try {
    // Get the current user ID from Clerk
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the API token is defined
    const isReplicateConfigured = !!(process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN);
    
    if (!isReplicateConfigured) {
      console.warn('Replicate API token is not defined, using local fallback');
    }

    // Parse the request body
    const body = await req.json();
    const { pokemon1, pokemon2, name1, name2, pokemon1Id, pokemon2Id } = body;

    // Validate the request parameters
    if (!pokemon1 || !pokemon2 || !name1 || !name2 || !pokemon1Id || !pokemon2Id) {
      console.error('Missing required parameters:', { 
        pokemon1: !!pokemon1, 
        pokemon2: !!pokemon2, 
        name1: !!name1, 
        name2: !!name2,
        pokemon1Id: !!pokemon1Id,
        pokemon2Id: !!pokemon2Id
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Generating fusion for:', { name1, name2 });
    console.log('Image URLs length:', { 
      pokemon1Length: pokemon1.length, 
      pokemon2Length: pokemon2.length 
    });
    
    // Save Pokemon data to Supabase if they don't exist
    await Promise.all([
      dbService.savePokemon({
        id: pokemon1Id,
        name: name1,
        image_url: pokemon1,
        type: [] // You would need to fetch this from the PokeAPI
      }),
      dbService.savePokemon({
        id: pokemon2Id,
        name: name2,
        image_url: pokemon2,
        type: [] // You would need to fetch this from the PokeAPI
      })
    ]);

    let fusionImageUrl: string;
    let isLocalFallback = false;
    
    if (isReplicateConfigured) {
      console.log('Using API token:', process.env.REPLICATE_API_TOKEN ? 'Server-side token' : 'Public token');

      // Define the model input
      const modelInput = {
        image_1: pokemon1,
        image_2: pokemon2,
        image_1_strength: 1,
        image_2_strength: 1,
        prompt: `a clean fusion of ${name1} and ${name2}, official pokemon artwork style, white background, no shadows, clean vector art, game freak style, ken sugimori style, official pokemon illustration, simple, minimalist, flat colors`,
        negative_prompt: "garish, soft, ugly, broken, distorted, deformed, noisy, blurry, background, texture, shadows, realistic, 3d, complex, detailed background",
        merge_mode: "full", // Options: "full", "left_right", "top_bottom"
        width: 768,
        height: 768,
        steps: 20,
        upscale_2x: true,
        upscale_steps: 20,
      };

      console.log('Calling Replicate API with model:', "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867");

      try {
        // Call the Replicate API
        const output = await replicate.run(
          "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
          { input: modelInput }
        );

        console.log('Replicate API response:', output);

        // Validate the output
        if (!output || !Array.isArray(output) || output.length === 0) {
          console.error('Invalid output from Replicate:', output);
          return NextResponse.json(
            { error: 'Failed to generate fusion image' },
            { status: 500 }
          );
        }

        fusionImageUrl = output[0];
      } catch (error: any) {
        // Check for payment required error
        if (error.response && error.response.status === 402) {
          console.error('Payment required for Replicate API');
          return NextResponse.json(
            { 
              error: 'This feature requires a paid Replicate account. Please set up billing at https://replicate.com/account/billing',
              paymentRequired: true
            },
            { status: 402 }
          );
        }
        
        // Re-throw for general error handling
        throw error;
      }
    } else {
      // Use local fallback if Replicate is not configured
      fusionImageUrl = generateLocalFusion(pokemon1, pokemon2, name1, name2);
      isLocalFallback = true;
    }

    // Generate a fusion name by combining the two Pokemon names
    const fusionName = `${name1.slice(0, Math.ceil(name1.length / 2))}${name2.slice(Math.floor(name2.length / 2))}`;
    
    // Generate a unique ID for the fusion
    const fusionId = uuidv4();
    
    // Save the fusion to Supabase
    const fusion = await dbService.saveFusion({
      id: fusionId,
      user_id: userId,
      pokemon_1_id: pokemon1Id,
      pokemon_2_id: pokemon2Id,
      fusion_name: fusionName,
      fusion_image: fusionImageUrl,
      likes: 0
    });

    if (!fusion) {
      console.error('Failed to save fusion to Supabase');
      return NextResponse.json(
        { error: 'Failed to save fusion' },
        { status: 500 }
      );
    }

    // Return the generated fusion
    return NextResponse.json({ 
      url: fusionImageUrl, 
      id: fusionId,
      name: fusionName,
      isLocalFallback
    });
  } catch (error) {
    // Log the error
    console.error('Error generating fusion:', error instanceof Error ? error.message : 'Unknown error', error);
    
    // Return an error response
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate fusion' },
      { status: 500 }
    );
  }
} 