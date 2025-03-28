import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth, currentUser } from '@clerk/nextjs/server';
import { saveFusion } from '@/lib/supabase-server-actions';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';
import { generateWithDallE } from './dalle';

// Log environment variables for debugging
console.log('Generate API - REPLICATE_API_TOKEN available:', !!process.env.REPLICATE_API_TOKEN);
console.log('Generate API - OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
console.log('Generate API - NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Generate API - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Function to get Pokémon image URL by ID
function getPokemonImageUrl(id: number): string {
  // Use the official Pokémon sprites from PokeAPI
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Set timeout for the API route within Vercel's limits
export const maxDuration = 60; // 60 seconds timeout for the API route (Vercel hobby plan limit)

// Function to convert transparent background to white background
async function convertTransparentToWhite(imageUrl: string): Promise<string> {
  // Since we're using DALL·E 3 which already generates images with white backgrounds,
  // we can simply return the original image URL
  console.log('Background conversion skipped - using original image:', imageUrl);
  return imageUrl;
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
    
    // Get the Supabase admin client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Generate API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }
    
    // Determine if this is a simple fusion
    const isSimpleFusion = req.headers.get('X-Simple-Fusion') === 'true';
    console.log('Generate API - Is simple fusion:', isSimpleFusion);
    
    // Variable to store the user's UUID
    let userUuid: string | undefined;
    
    // Check and use credits before generating the fusion
    try {
      // Only use credits for AI-generated fusions
      if (!isSimpleFusion) {
        // Get the user's UUID and credit balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, credits_balance')
          .eq('clerk_id', userId)
          .single();

        if (userError) {
          console.error('Generate API - Error fetching user:', userError);
          return NextResponse.json({ 
            error: 'Failed to verify user',
            details: userError
          }, { status: 500 });
        }

        // Store the user's UUID for later use
        userUuid = userData.id;
        console.log('Generate API - User UUID:', userUuid);

        const currentBalance = userData?.credits_balance || 0;
        if (currentBalance <= 0) {
          return NextResponse.json({ 
            error: 'Insufficient credits',
            paymentRequired: true
          }, { status: 402 });
        }
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
    
    // Check if OPENAI_API_KEY is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('Generate API - OPENAI_API_KEY not available');
      return NextResponse.json({ error: 'OPENAI_API_KEY not available' }, { status: 500 });
    }

    try {
      // Determine which model to use (default to DALL·E 3)
      const useReplicate = process.env.USE_REPLICATE_MODEL === 'true';
      console.log('Generate API - Using Replicate model:', useReplicate);

      let fusionImageUrl: string | null = null;

      if (useReplicate) {
        // Check if REPLICATE_API_TOKEN is available
        if (!process.env.REPLICATE_API_TOKEN) {
          console.error('Generate API - REPLICATE_API_TOKEN not available');
          return NextResponse.json({ error: 'REPLICATE_API_TOKEN not available' }, { status: 500 });
        }

        console.log('Generate API - Initializing Replicate client');
        const replicate = new Replicate({
          auth: process.env.REPLICATE_API_TOKEN,
          // Add timeout configuration within Vercel's limits
          fetch: (url, options = {}) => {
            return fetch(url, {
              ...options,
              signal: AbortSignal.timeout(50000) // 50 second timeout for each request to leave buffer for other operations
            });
          }
        });
        
        // Prepare the input for the image-merger model
        const modelInput = {
          image_1: processedImage1,
          image_2: processedImage2,
          control_image: processedImage1,
          merge_mode: "left_right",
          prompt: `a fusion of ${pokemon1Name} and ${pokemon2Name} by merging the carachteristics of both in a single new Pokemon, clean Pokémon-style illustration with solid white background, game concept art, animation or video game character design, with smooth shading, soft lighting, and a balanced color palette, friendly animation style, kid friendly style, completely white background with no black or gray, transparent background`,
          negative_prompt: "blurry, realistic, 3D, distorted, messy, uncanny, color background, garish, ugly, broken, futuristic, render, digital, black background, dark background, dark color palette, dark shading, dark lighting",
          upscale_2x: true
        };
        
        console.log('Generate API - Running image-merger model with processed images');
        
        // Run the model with retries and shorter timeouts
        let output;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount < maxRetries) {
          try {
            output = await replicate.run(
              "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
              { input: modelInput }
            );
            break; // If successful, exit the retry loop
          } catch (retryError) {
            retryCount++;
            console.error(`Generate API - Replicate attempt ${retryCount} failed:`, retryError);
            if (retryCount === maxRetries) {
              throw retryError; // Re-throw if all retries failed
            }
            // Wait before retrying (shorter backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          }
        }
        
        console.log('Generate API - Replicate output:', output);
        
        if (!output || !Array.isArray(output) || output.length === 0) {
          console.error('Generate API - No output from Replicate');
          throw new Error('No valid output from Replicate');
        }
        
        // Get the first image from the output
        fusionImageUrl = output[0];
        console.log('Generate API - Fusion image URL:', fusionImageUrl);
      } else {
        // Generate fusion using DALL·E 3
        fusionImageUrl = await generateWithDallE(
          pokemon1Name,
          pokemon2Name,
          processedImage1,
          processedImage2
        );

        if (!fusionImageUrl) {
          throw new Error('Failed to generate fusion with DALL·E 3');
        }
      }

      // If this was an AI fusion, record the credit usage now that we have successfully generated the image
      if (!isSimpleFusion) {
        // Add transaction record after successful generation
        const { error: transactionError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: userUuid,
            amount: -1,
            description: `Fusion of ${pokemon1Name} and ${pokemon2Name}`,
            transaction_type: 'usage'
          });

        if (transactionError) {
          console.error('Generate API - Error recording transaction:', transactionError);
          return NextResponse.json({ 
            error: 'Failed to use credits',
            details: transactionError
          }, { status: 500 });
        }
        
        console.log('Generate API - Credits used successfully');
      }

      // Save the fusion to the database
      console.log('Generate API - Saving fusion to database with user ID:', userUuid || userId);
      const result = await saveFusion({
        userId: userUuid || userId,
        pokemon1Id,
        pokemon2Id,
        pokemon1Name,
        pokemon2Name,
        fusionName,
        fusionImage: fusionImageUrl,
        isSimpleFusion: false
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
      let fusionId = uuidv4();
      if (result.data && typeof result.data === 'object') {
        if ('id' in result.data) {
          fusionId = String(result.data.id);
        } else if (Array.isArray(result.data) && result.data.length > 0 && typeof result.data[0] === 'object' && 'id' in result.data[0]) {
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

    } catch (error) {
      console.error('Generate API - Error generating fusion:', error);

      // Use one of the processed original images as a fallback
      const fallbackImageUrl = processedImage1;
      console.log('Generate API - Using processed image as fallback:', fallbackImageUrl);

      // Try to save the fallback fusion
      try {
        // Set isSimpleFusion to true for fallback to avoid credit usage
        const fallbackResult = await saveFusion({
          userId: userUuid || userId,
          pokemon1Id,
          pokemon2Id,
          pokemon1Name,
          pokemon2Name,
          fusionName,
          fusionImage: fallbackImageUrl,
          isSimpleFusion: true
        });

        if (fallbackResult.error) {
          console.error('Generate API - Error saving fallback fusion:', fallbackResult.error);
          return NextResponse.json({ 
            error: 'Error generating fusion and fallback also failed',
            details: error instanceof Error ? error.message : String(error),
            fallbackError: fallbackResult.error
          }, { status: 500 });
        }

        // Safely access the fusion ID
        let fusionId = uuidv4();
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
          fusionName,
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
          error: 'Error generating fusion with both AI and fallback',
          details: error instanceof Error ? error.message : String(error),
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