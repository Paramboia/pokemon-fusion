import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@clerk/nextjs/server';
import { saveFusion } from '@/lib/supabase-server-actions';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { generateWithReplicateBlend } from '../replicate-blend';
import { enhanceWithDirectGeneration, testOpenAiClient } from '../dalle';
import { initializeConfig, logConfigStatus } from '../config';
import { StepResponse } from '@/types/fusion';
import sharp from 'sharp';
import axios from 'axios';

// Initialize configuration
initializeConfig();

// Helper function to get Pokemon image URL
function getPokemonImageUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

// Helper function to convert transparent backgrounds to white
async function convertTransparentToWhite(imageUrl: string): Promise<string> {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    const processedBuffer = await sharp(buffer)
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
    
    return `data:image/png;base64,${processedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting transparent background:', error);
    return imageUrl;
  }
}

// Helper function to send SSE event
function sendSSEEvent(encoder: TextEncoder, controller: ReadableStreamDefaultController, event: StepResponse) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(encoder.encode(data));
}

export async function POST(req: Request) {
  // Check if multi-step UI is enabled
  if (process.env.ENABLE_MULTI_STEP_UI !== 'true') {
    return NextResponse.json({ error: 'Multi-step UI is not enabled' }, { status: 404 });
  }

  try {
    console.log("Generate Stream API - POST request received");
    
    // Log configuration status
    logConfigStatus();
    
    // Parse request body
    const body = await req.json();
    console.log("Generate Stream API - Request body:", body);
    
    // Extract and validate parameters
    const pokemon1Id = body.pokemon1Id ? parseInt(body.pokemon1Id) : null;
    const pokemon2Id = body.pokemon2Id ? parseInt(body.pokemon2Id) : null;
    const pokemon1Name = body.pokemon1Name || '';
    const pokemon2Name = body.pokemon2Name || '';
    const fusionName = body.fusionName || '';
    const pokemon1ImageUrl = body.pokemon1ImageUrl || '';
    const pokemon2ImageUrl = body.pokemon2ImageUrl || '';
    
    // Validate required fields
    if (!pokemon1Id || !pokemon2Id || !fusionName || !pokemon1Name || !pokemon2Name) {
      console.error("Generate Stream API - Missing required fields");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Authenticate user
    const authResult = await auth();
    const userId = authResult.userId;
    if (!userId) {
      console.error('Generate Stream API - No authenticated user');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get Supabase client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Generate Stream API - Failed to get Supabase client');
      return NextResponse.json({ error: 'Failed to get Supabase client' }, { status: 500 });
    }
    
    // Check user credits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, credits_balance')
      .eq('clerk_id', userId)
      .single();

    if (userError) {
      console.error('Generate Stream API - Error fetching user:', userError);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    const userUuid = userData.id;
    const currentBalance = userData?.credits_balance || 0;
    
    if (currentBalance <= 0) {
      console.error('Generate Stream API - Insufficient credits');
      return NextResponse.json({ 
        error: 'Insufficient credits',
        paymentRequired: true
      }, { status: 402 });
    }

    console.log('Generate Stream API - User has sufficient credits:', currentBalance);

    // Create readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        console.log("Generate Stream API - Starting streaming response");
        
        // Send initial connection event
        sendSSEEvent(encoder, controller, {
          step: 'capturing',
          status: 'started',
          timestamp: Date.now()
        });
        
        // Start the generation process
        generateFusionWithSteps(
          encoder,
          controller,
          pokemon1Id,
          pokemon2Id,
          pokemon1Name,
          pokemon2Name,
          fusionName,
          pokemon1ImageUrl,
          pokemon2ImageUrl,
          userUuid,
          supabase
        ).catch(error => {
          console.error('Generate Stream API - Error in generation process:', error);
          
          // Always try to provide a fallback result even if there's an error
          const fallbackImageUrl = getPokemonImageUrl(pokemon1Id);
          
          sendSSEEvent(encoder, controller, {
            step: 'entering',
            status: 'completed',
            data: {
              finalUrl: fallbackImageUrl,
              fusionId: `fallback-${Date.now()}`,
              fusionName: pokemon1Name,
              isLocalFallback: true,
              message: 'Using Simple Method due to system error'
            },
            timestamp: Date.now()
          });
          
          controller.close();
        });
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    
  } catch (error) {
    console.error("Generate Stream API - Error:", error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function generateFusionWithSteps(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  pokemon1Id: number,
  pokemon2Id: number,
  pokemon1Name: string,
  pokemon2Name: string,
  fusionName: string,
  pokemon1ImageUrl: string,
  pokemon2ImageUrl: string,
  userUuid: string,
  supabase: any
) {
  let fusionImageUrl: string | null = null;
  let useSimpleFusion = false;
  
  try {
    // Get image URLs
    const image1 = pokemon1ImageUrl || getPokemonImageUrl(pokemon1Id);
    const image2 = pokemon2ImageUrl || getPokemonImageUrl(pokemon2Id);
    
    // Pre-process images
    console.log('Generate Stream API - Converting backgrounds');
    const processedImage1 = await convertTransparentToWhite(image1);
    const processedImage2 = await convertTransparentToWhite(image2);
    
    // Step 1: Capturing Pokémons (Replicate Blend)
    console.log('Generate Stream API - Starting Step 1: Capturing Pokémons');
    sendSSEEvent(encoder, controller, {
      step: 'capturing',
      status: 'started',
      timestamp: Date.now()
    });
    
    const useReplicateBlend = process.env.USE_REPLICATE_BLEND !== 'false';
    
    if (useReplicateBlend && process.env.REPLICATE_API_TOKEN) {
      try {
        // Set timeout for Step 1
        const step1Timeout = process.env.NODE_ENV === 'production' ? 120000 : 90000;
        const step1Promise = generateWithReplicateBlend(
          pokemon1Name,
          pokemon2Name,
          processedImage1,
          processedImage2
        );
        
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Step 1 timeout')), step1Timeout);
        });
        
        fusionImageUrl = await Promise.race([step1Promise, timeoutPromise]);
        
        if (fusionImageUrl) {
          console.log('Generate Stream API - Step 1 completed successfully');
          sendSSEEvent(encoder, controller, {
            step: 'capturing',
            status: 'completed',
            data: { imageUrl: fusionImageUrl },
            timestamp: Date.now()
          });
        } else {
          throw new Error('Replicate Blend returned null');
        }
        
      } catch (error) {
        console.error('Generate Stream API - Step 1 failed:', error);
        sendSSEEvent(encoder, controller, {
          step: 'capturing',
          status: 'failed',
          error: error.message || 'Failed to capture Pokémons',
          timestamp: Date.now()
        });
        throw error;
      }
    } else {
      throw new Error('Replicate Blend not available');
    }
    
    // Step 2: Merging Pokémons (GPT-4 Vision Description)
    console.log('Generate Stream API - Starting Step 2: Merging Pokémons');
    sendSSEEvent(encoder, controller, {
      step: 'merging',
      status: 'started',
      timestamp: Date.now()
    });
    
    let enhancedImageUrl: string | null = null;
    
    if (process.env.OPENAI_API_KEY) {
      try {
        // Set timeout for Step 2 + Step 3 combined
        const step2Timeout = 60000; // 1 minute for description
        const step3Timeout = process.env.NODE_ENV === 'production' ? 240000 : 180000;
        
        // Step 2: Get description (this is internal to enhanceWithDirectGeneration)
        const enhancementPromise = enhanceWithDirectGeneration(
          '',
          '',
          fusionImageUrl,
          0
        );
        
        const totalTimeout = step2Timeout + step3Timeout;
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Enhancement timeout')), totalTimeout);
        });
        
        enhancedImageUrl = await Promise.race([enhancementPromise, timeoutPromise]);
        
        if (enhancedImageUrl) {
          console.log('Generate Stream API - Step 2 completed successfully');
          sendSSEEvent(encoder, controller, {
            step: 'merging',
            status: 'completed',
            timestamp: Date.now()
          });
          
          // Step 3: Pokédex Entering (GPT Image Enhancement)
          console.log('Generate Stream API - Starting Step 3: Pokédex Entering');
          sendSSEEvent(encoder, controller, {
            step: 'entering',
            status: 'started',
            timestamp: Date.now()
          });
          
          // The enhancement is already complete
          fusionImageUrl = enhancedImageUrl;
          
          console.log('Generate Stream API - Step 3 completed successfully');
          sendSSEEvent(encoder, controller, {
            step: 'entering',
            status: 'completed',
            data: { finalUrl: fusionImageUrl },
            timestamp: Date.now()
          });
          
        } else {
          throw new Error('GPT enhancement returned null');
        }
        
      } catch (error) {
        console.error('Generate Stream API - Step 2/3 failed:', error);
        sendSSEEvent(encoder, controller, {
          step: 'merging',
          status: 'failed',
          error: error.message || 'Failed to merge Pokémons',
          timestamp: Date.now()
        });
        throw error;
      }
    } else {
      throw new Error('OpenAI API key not available');
    }
    
  } catch (error) {
    console.error('Generate Stream API - Generation failed, using Simple Method:', error);
    
    // CRITICAL: Fallback to Simple Method
    console.log('Generate Stream API - Falling back to Simple Method');
    fusionImageUrl = processedImage1;
    useSimpleFusion = true;
    
    // Send fallback notification - mark the failed step as failed first
    sendSSEEvent(encoder, controller, {
      step: 'capturing',
      status: 'failed',
      error: 'Using Simple Method fallback',
      timestamp: Date.now()
    });
    
    // Then immediately show the Simple Method result
    sendSSEEvent(encoder, controller, {
      step: 'entering',
      status: 'completed',
      data: { 
        finalUrl: fusionImageUrl,
        isLocalFallback: true,
        message: 'Using Simple Method due to AI service unavailable'
      },
      timestamp: Date.now()
    });
  }
  
  // Save fusion to database
  try {
    console.log('Generate Stream API - Saving fusion to database');
    
    // Record credit usage if not simple fusion
    if (!useSimpleFusion) {
      const { error: transactionError } = await supabase
        .from('credits_transactions')
        .insert({
          user_id: userUuid,
          amount: -1,
          description: `Fusion of ${pokemon1Name} and ${pokemon2Name}`,
          transaction_type: 'usage'
        });

      if (transactionError) {
        console.error('Generate Stream API - Error recording transaction:', transactionError);
      }
    }
    
    const result = await saveFusion({
      userId: userUuid,
      pokemon1Id,
      pokemon2Id,
      pokemon1Name,
      pokemon2Name,
      fusionName,
      fusionImage: fusionImageUrl,
      isSimpleFusion: useSimpleFusion
    });
    
    if (result.error) {
      throw new Error(`Error saving fusion: ${result.error}`);
    }
    
    // Get fusion ID
    let fusionId = uuidv4();
    if (result.data && typeof result.data === 'object') {
      if ('id' in result.data) {
        fusionId = String(result.data.id);
      } else if (Array.isArray(result.data) && result.data.length > 0 && 
                typeof result.data[0] === 'object' && 'id' in result.data[0]) {
        fusionId = String(result.data[0].id);
      }
    }
    
    // Send final success event
    sendSSEEvent(encoder, controller, {
      step: 'entering',
      status: 'completed',
      data: {
        finalUrl: fusionImageUrl,
        fusionId,
        fusionName,
        isLocalFallback: useSimpleFusion
      },
      timestamp: Date.now()
    });
    
    console.log('Generate Stream API - Generation completed successfully');
    
  } catch (error) {
    console.error('Generate Stream API - Error saving fusion:', error);
    
    // Even if saving fails, still try to send the result to the user
    // This ensures they get something even if the database operation fails
    sendSSEEvent(encoder, controller, {
      step: 'entering',
      status: 'completed',
      data: {
        finalUrl: fusionImageUrl || processedImage1,
        fusionId: uuidv4(),
        fusionName,
        isLocalFallback: true,
        message: 'Fusion generated but not saved to database'
      },
      timestamp: Date.now()
    });
  }
  
  // Close the stream
  controller.close();
} 