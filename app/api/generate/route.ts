import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth } from '@clerk/nextjs/server';
import { saveFusion } from '@/lib/supabase-server-actions';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

// Log environment variables for debugging
console.log('Generate API - REPLICATE_API_TOKEN available:', !!process.env.REPLICATE_API_TOKEN);
console.log('Generate API - NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Generate API - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Function to get Pokémon image URL by ID
function getPokemonImageUrl(id: number): string {
  // Use the official Pokémon sprites from PokeAPI
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// Set a longer timeout for the API route
export const maxDuration = 60; // 60 seconds timeout for the API route

export async function POST(req: Request) {
  try {
    console.log("Generate API - POST request received");
    
    // Parse the request body
    const body = await req.json();
    const { pokemon1Id, pokemon2Id, fusionName } = body;
    
    console.log("Generate API - Request body:", { pokemon1Id, pokemon2Id, fusionName });
    
    // Validate the input
    if (!pokemon1Id || !pokemon2Id || !fusionName) {
      console.error("Generate API - Missing required fields in request");
      return NextResponse.json({ error: 'Missing required fields in request' }, { status: 400 });
    }
    
    // Get the Supabase admin client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Generate API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }
    
    // Get the user ID from the session or create a test user
    let userId;
    try {
      const session = await auth();
      userId = session?.userId;
      console.log('Generate API - User ID from auth():', userId);
      
      if (!userId) {
        // Create a test user if no authenticated user
        console.log('Generate API - No authenticated user, creating test user');
        const testUserId = uuidv4();
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            id: testUserId,
            name: 'Test User',
            email: `test-${Date.now()}@example.com`
          })
          .select();
        
        if (userError) {
          console.error('Generate API - Error creating test user:', userError);
          return NextResponse.json({ 
            error: 'Error creating test user',
            details: userError
          }, { status: 500 });
        }
        
        userId = testUserId;
        console.log('Generate API - Test user created with ID:', userId);
      }
    } catch (authError) {
      console.error('Generate API - Error getting user ID from auth():', authError);
      return NextResponse.json({ 
        error: 'Authentication error',
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 401 });
    }
    
    // Get Pokémon data from the database
    console.log('Generate API - Fetching Pokémon data from database');
    const { data: pokemon1Data, error: pokemon1Error } = await supabase
      .from('pokemon')
      .select('id, name')
      .eq('id', pokemon1Id)
      .single();
    
    if (pokemon1Error || !pokemon1Data) {
      console.error('Generate API - Error fetching Pokémon 1:', pokemon1Error);
      return NextResponse.json({ 
        error: 'Error fetching Pokémon 1',
        details: pokemon1Error
      }, { status: 404 });
    }
    
    const { data: pokemon2Data, error: pokemon2Error } = await supabase
      .from('pokemon')
      .select('id, name')
      .eq('id', pokemon2Id)
      .single();
    
    if (pokemon2Error || !pokemon2Data) {
      console.error('Generate API - Error fetching Pokémon 2:', pokemon2Error);
      return NextResponse.json({ 
        error: 'Error fetching Pokémon 2',
        details: pokemon2Error
      }, { status: 404 });
    }
    
    console.log('Generate API - Pokémon data retrieved:', {
      pokemon1: pokemon1Data,
      pokemon2: pokemon2Data
    });
    
    // Get image URLs for both Pokémon
    const pokemon1ImageUrl = getPokemonImageUrl(pokemon1Data.id);
    const pokemon2ImageUrl = getPokemonImageUrl(pokemon2Data.id);
    
    console.log('Generate API - Pokémon image URLs:', {
      pokemon1ImageUrl,
      pokemon2ImageUrl
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
      
      console.log('Generate API - Running image-merger model');
      const output = await replicate.run(
        "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
        {
          input: {
            image_1: pokemon1ImageUrl,
            image_2: pokemon2ImageUrl,
            merge_mode: "full",
            prompt: `a fusion of ${pokemon1Data.name} and ${pokemon2Data.name} pokemon, high quality, detailed`,
            negative_prompt: "low quality, blurry, distorted",
            upscale_2x: false
          }
        }
      );
      
      console.log('Generate API - Replicate output:', output);
      
      if (!output || !Array.isArray(output) || output.length === 0) {
        console.error('Generate API - No output from Replicate');
        return NextResponse.json({ error: 'No output from Replicate' }, { status: 500 });
      }
      
      // Get the first image from the output
      const fusionImageUrl = output[0];
      
      // Save the fusion to the database
      console.log('Generate API - Saving fusion to database');
      const result = await saveFusion({
        userId,
        pokemon1Id: parseInt(pokemon1Id),
        pokemon2Id: parseInt(pokemon2Id),
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
        fusionData: result.data,
        message: 'Fusion generated successfully'
      });
      
    } catch (replicateError) {
      console.error('Generate API - Error with Replicate:', replicateError);
      return NextResponse.json({ 
        error: 'Error generating fusion with Replicate',
        details: replicateError instanceof Error ? replicateError.message : String(replicateError)
      }, { status: 500 });
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