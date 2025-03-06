import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth, currentUser } from '@clerk/nextjs/server';
import { saveFusion } from '@/lib/supabase-server-actions';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

// Log environment variables for debugging
console.log('Generate API - REPLICATE_API_TOKEN available:', !!process.env.REPLICATE_API_TOKEN);
console.log('Generate API - NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Generate API - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Function to get Pokémon image URL by ID
function getPokemonImageUrl(id: number): string {
  // Use the official Pokémon sprites from PokeAPI
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Set a longer timeout for the API route
export const maxDuration = 60; // 60 seconds timeout for the API route

// Function to convert transparent background to white background
async function convertTransparentToWhite(imageUrl: string): Promise<string> {
  try {
    console.log(`Converting transparent background to white for: ${imageUrl}`);
    
    // Check if we have the API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN not available for background conversion');
      return imageUrl; // Return original if no API token
    }
    
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Use the rembg model to remove background and add white background
    const output = await replicate.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      { 
        input: {
          image: imageUrl,
          return_mask: false,
          alpha_matting: true, // Enable alpha matting for better edge detection
          alpha_matting_foreground_threshold: 240, // Higher threshold to ensure white background
          alpha_matting_background_threshold: 10, // Lower threshold to ensure no black
          alpha_matting_erode_size: 10, // Increase erode size to remove more of the black edges
          background_color: "white" // Set white background
        }
      }
    );
    
    if (!output || typeof output !== 'string') {
      console.error('Failed to convert image background:', output);
      return imageUrl; // Return original if conversion fails
    }
    
    // At this point, output is confirmed to be a string
    const outputStr: string = output;
    console.log(`Successfully converted background to white: ${outputStr.substring(0, 100)}...`);
    return outputStr;
  } catch (error) {
    console.error('Error converting image background:', error);
    return imageUrl; // Return original if conversion fails
  }
}

export async function POST(req: Request) {
  try {
    console.log("Generate API - POST request received");
    
    // Parse the request body
    const body = await req.json();
    console.log("Generate API - Raw request body:", body);
    
    // Extract parameters with type conversion
    const pokemon1Id = body.pokemon1Id ? parseInt(body.pokemon1Id) : null;
    const pokemon2Id = body.pokemon2Id ? parseInt(body.pokemon2Id) : null;
    const pokemon1Name = body.pokemon1Name || '';
    const pokemon2Name = body.pokemon2Name || '';
    const fusionName = body.fusionName || '';
    const pokemon1ImageUrl = body.pokemon1ImageUrl || '';
    const pokemon2ImageUrl = body.pokemon2ImageUrl || '';
    
    console.log("Generate API - Parsed parameters:", { 
      pokemon1Id, 
      pokemon2Id,
      pokemon1Name,
      pokemon2Name,
      fusionName,
      hasImage1: !!pokemon1ImageUrl,
      hasImage2: !!pokemon2ImageUrl
    });
    
    // Validate the input
    if (!pokemon1Id || !pokemon2Id || !fusionName || !pokemon1Name || !pokemon2Name) {
      console.error("Generate API - Missing required fields in request:", {
        hasPokemon1Id: !!pokemon1Id,
        hasPokemon2Id: !!pokemon2Id,
        hasPokemon1Name: !!pokemon1Name,
        hasPokemon2Name: !!pokemon2Name,
        hasFusionName: !!fusionName
      });
      return NextResponse.json({ 
        error: 'Missing required fields in request',
        details: {
          hasPokemon1Id: !!pokemon1Id,
          hasPokemon2Id: !!pokemon2Id,
          hasPokemon1Name: !!pokemon1Name,
          hasPokemon2Name: !!pokemon2Name,
          hasFusionName: !!fusionName,
          receivedBody: body
        }
      }, { status: 400 });
    }
    
    // Get the authenticated user
    const authResult = await auth();
    const userId = authResult.userId;
    if (!userId) {
      console.error('Generate API - No authenticated user found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check and use credits before generating the fusion
    try {
      // Only use credits for AI-generated fusions
      const isSimpleFusion = req.headers.get('X-Simple-Fusion') === 'true';
      
      if (!isSimpleFusion) {
        const creditResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/credits/use`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            description: `Fusion of ${pokemon1Name} and ${pokemon2Name}`
          })
        });
        
        if (!creditResponse.ok) {
          const creditError = await creditResponse.json();
          console.error('Generate API - Credit usage error:', creditError);
          
          // If the user doesn't have enough credits, return a payment required error
          if (creditResponse.status === 402) {
            return NextResponse.json({ 
              error: 'Insufficient credits',
              paymentRequired: true
            }, { status: 402 });
          }
          
          return NextResponse.json({ 
            error: 'Failed to use credits',
            details: creditError
          }, { status: creditResponse.status });
        }
        
        console.log('Generate API - Credits used successfully');
      } else {
        console.log('Generate API - Simple fusion, skipping credit usage');
      }
    } catch (creditError) {
      console.error('Generate API - Error processing credits:', creditError);
      return NextResponse.json({ 
        error: 'Error processing credits',
        details: creditError instanceof Error ? creditError.message : String(creditError)
      }, { status: 500 });
    }
    
    // Get the Supabase admin client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Generate API - Failed to get Supabase admin client');
      
      // Since we already used credits, we should refund them if we can't proceed
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/credits/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            description: `Refund for failed fusion of ${pokemon1Name} and ${pokemon2Name}`
          })
        });
      } catch (refundError) {
        console.error('Generate API - Failed to refund credits:', refundError);
      }
      
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }
    
    // Use the provided image URLs or get them from the Pokemon ID
    const image1 = pokemon1ImageUrl || getPokemonImageUrl(pokemon1Id);
    const image2 = pokemon2ImageUrl || getPokemonImageUrl(pokemon2Id);
    
    console.log('Generate API - Pokémon image URLs:', {
      image1,
      image2
    });
    
    // Pre-process images to convert transparent backgrounds to white
    console.log('Generate API - Starting background conversion for Pokemon images');
    let processedImage1 = image1;
    let processedImage2 = image2;
    
    try {
      console.log('Generate API - Converting background for Pokemon 1');
      processedImage1 = await convertTransparentToWhite(image1);
      
      console.log('Generate API - Converting background for Pokemon 2');
      processedImage2 = await convertTransparentToWhite(image2);
      
      console.log('Generate API - Background conversion completed successfully');
    } catch (conversionError) {
      console.error('Generate API - Error during background conversion:', conversionError);
      // Continue with original images if conversion fails
      processedImage1 = image1;
      processedImage2 = image2;
    }
    
    console.log('Generate API - Processed image URLs:', {
      processedImage1,
      processedImage2,
      usingProcessedImages: processedImage1 !== image1 || processedImage2 !== image2
    });
    
    // Check if REPLICATE_API_TOKEN is available
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('Generate API - REPLICATE_API_TOKEN not available');
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not available' }, { status: 500 });
    }
    
    try {
      console.log('Generate API - Initializing Replicate client');
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      
      // Prepare the input for the image-merger model
      const modelInput = {
        image_1: processedImage1,
        image_2: processedImage2,
        control_image: processedImage1,
        merge_mode: "left_right", // Options: full, left_right, up_down, center_square
        prompt: `a fusion of ${pokemon1Name} and ${pokemon2Name} by merging the carachteristics of both in a single new Pokemon, clean Pokémon-style illustration with a pure white background, solid white background, game concept art, animation or video game character design, with smooth shading, soft lighting, and a balanced color palette, friendly animation style, kid friendly style, completely white background with no black or gray, transparent background`,
        negative_prompt: "blurry, realistic, 3D, distorted, messy, uncanny, color background, garish, soft, ugly, broken, distorted, futuristic, render, digital, black background, dark background, dark color palette, dark shading, dark lighting, any background other than white",
        upscale_2x: true // Enable upscaling for better quality
      };
      
      console.log('Generate API - Running image-merger model with processed images');
      
      // Run the model
      const output = await replicate.run(
        "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
        { input: modelInput }
      );
      
      console.log('Generate API - Replicate output:', output);
      
      if (!output || !Array.isArray(output) || output.length === 0) {
        console.error('Generate API - No output from Replicate');
        return NextResponse.json({ 
          error: 'No output from Replicate',
          replicateOutput: output
        }, { status: 500 });
      }
      
      // Get the first image from the output
      const fusionImageUrl = output[0];
      console.log('Generate API - Fusion image URL:', fusionImageUrl);
      
      // Save the fusion to the database
      console.log('Generate API - Saving fusion to database with user ID:', userId);
      const result = await saveFusion({
        userId,
        pokemon1Id,
        pokemon2Id,
        pokemon1Name,
        pokemon2Name,
        fusionName,
        fusionImage: fusionImageUrl
      });
      
      if (result.error) {
        console.error('Generate API - Error saving fusion:', result.error);
        return NextResponse.json({ 
          error: `Error saving fusion: ${result.error}`,
          details: result.error
        }, { status: 500 });
      }
      
      console.log('Generate API - Fusion saved successfully:', result.data);
      
      // Safely access the fusion ID
      let fusionId = uuidv4(); // Default to a new UUID
      if (result.data && typeof result.data === 'object') {
        // If result.data is an object with an id property
        if ('id' in result.data) {
          fusionId = String(result.data.id);
        } 
        // If result.data is an array with at least one object that has an id
        else if (Array.isArray(result.data) && result.data.length > 0 && typeof result.data[0] === 'object' && 'id' in result.data[0]) {
          fusionId = String(result.data[0].id);
        }
      }
      
      // Return the result
      return NextResponse.json({
        id: fusionId,
        output: fusionImageUrl,
        fusionName,
        pokemon1Id,
        pokemon2Id,
        pokemon1Name,
        pokemon2Name,
        fusionData: result.data,
        message: 'Fusion generated successfully'
      });
      
    } catch (replicateError) {
      console.error('Generate API - Error with Replicate:', replicateError);
      
      // If there's an error with Replicate, use a fallback approach
      console.log('Generate API - Using fallback fusion approach due to server error');
      
      // Create a simple fusion name if not provided
      const fallbackName = fusionName || `${pokemon1Name}-${pokemon2Name}`;
      
      // Use one of the processed original images as a fallback
      const fallbackImageUrl = processedImage1;
      console.log('Generate API - Using processed image as fallback:', fallbackImageUrl);
      
      // Try to save the fallback fusion
      try {
        const fallbackResult = await saveFusion({
          userId,
          pokemon1Id,
          pokemon2Id,
          pokemon1Name,
          pokemon2Name,
          fusionName: fallbackName,
          fusionImage: fallbackImageUrl
        });
        
        if (fallbackResult.error) {
          console.error('Generate API - Error saving fallback fusion:', fallbackResult.error);
          return NextResponse.json({ 
            error: 'Error generating fusion with Replicate and fallback also failed',
            details: replicateError instanceof Error ? replicateError.message : String(replicateError),
            fallbackError: fallbackResult.error
          }, { status: 500 });
        }
        
        // Safely access the fusion ID
        let fusionId = uuidv4(); // Default to a new UUID
        if (fallbackResult.data && typeof fallbackResult.data === 'object') {
          if ('id' in fallbackResult.data) {
            fusionId = String(fallbackResult.data.id);
          } else if (Array.isArray(fallbackResult.data) && fallbackResult.data.length > 0 && 
                    typeof fallbackResult.data[0] === 'object' && 'id' in fallbackResult.data[0]) {
            fusionId = String(fallbackResult.data[0].id);
          }
        }
        
        // Return the fallback result
        return NextResponse.json({
          id: fusionId,
          output: fallbackImageUrl,
          fusionName: fallbackName,
          pokemon1Id,
          pokemon2Id,
          pokemon1Name,
          pokemon2Name,
          fusionData: fallbackResult.data,
          isLocalFallback: true,
          message: 'Fusion generated using fallback method due to AI service error'
        });
      } catch (fallbackError) {
        console.error('Generate API - Error with fallback fusion:', fallbackError);
        return NextResponse.json({ 
          error: 'Error generating fusion with both Replicate and fallback',
          details: replicateError instanceof Error ? replicateError.message : String(replicateError),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error("Generate API - Error in POST handler:", error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 