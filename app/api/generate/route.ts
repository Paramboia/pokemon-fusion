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
    
    // Get the Supabase admin client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Generate API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }
    
    // Get the user ID from Clerk auth
    let userId;
    try {
      const session = await auth();
      const clerkUserId = session?.userId;
      console.log('Generate API - User ID from auth():', clerkUserId);
      
      if (!clerkUserId) {
        console.error('Generate API - No authenticated user');
        return NextResponse.json({ 
          error: 'Authentication required',
          details: 'No user ID found in the session'
        }, { status: 401 });
      }
      
      // Get the Supabase user ID from the Clerk ID
      userId = await getSupabaseUserIdFromClerk(clerkUserId);
      
      if (!userId) {
        console.error('Generate API - Failed to get Supabase user ID');
        return NextResponse.json({ 
          error: 'User not found in database',
          details: 'The authenticated user does not exist in the Supabase users table and could not be created automatically'
        }, { status: 404 });
      }
      
      console.log('Generate API - User verified in Supabase:', userId);
    } catch (authError) {
      console.error('Generate API - Error getting user ID from auth():', authError);
      return NextResponse.json({ 
        error: 'Authentication error',
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 401 });
    }
    
    // Use the provided image URLs or get them from the Pokemon ID
    const image1 = pokemon1ImageUrl || getPokemonImageUrl(pokemon1Id);
    const image2 = pokemon2ImageUrl || getPokemonImageUrl(pokemon2Id);
    
    console.log('Generate API - Pokémon image URLs:', {
      image1,
      image2
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
        image_1: image1,
        image_2: image2,
        merge_mode: "full", // Options: full, left_right, up_down, center_square
        prompt: `a fusion of ${pokemon1Name} and ${pokemon2Name} pokemon, high quality, detailed, digital art`,
        negative_prompt: "low quality, blurry, distorted, ugly, broken",
        upscale_2x: true // Enable upscaling for better quality
      };
      
      console.log('Generate API - Running image-merger model with input:', modelInput);
      
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
      
      // Use one of the original images as a fallback
      const fallbackImageUrl = image1;
      
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