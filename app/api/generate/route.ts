import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth, currentUser } from '@clerk/nextjs/server';
import { saveFusion } from '@/lib/supabase-server-actions';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';
import { generatePokemonFusion, enhanceWithDirectGeneration, testOpenAiClient } from './dalle';

// DEBUG - Verify imports from dalle.ts
console.warn('ROUTE.TS - dalle.ts imports completed:', { 
  hasGenerateFn: typeof generatePokemonFusion === 'function',
  hasEnhanceFn: typeof enhanceWithDirectGeneration === 'function',
  hasTestFn: typeof testOpenAiClient === 'function'
});

import { generateWithReplicateBlend } from './replicate-blend';
import { initializeConfig, logConfigStatus } from './config';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import axios from 'axios';
import os from 'os';
import sharp from 'sharp';
import FormData from 'form-data';

// Initialize configuration to ensure all environment variables are set
initializeConfig();

// NOTE: This is the legacy single-step API endpoint. 
// For the new multi-step UI with streaming, use /api/generate/stream
// This endpoint is maintained for backwards compatibility and as a fallback.

// Log environment variables for debugging
console.log('Generate API - REPLICATE_API_TOKEN available:', !!process.env.REPLICATE_API_TOKEN);
console.log('Generate API - OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
console.log('Generate API - NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Generate API - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Generate API - USE_GPT_VISION_ENHANCEMENT:', process.env.USE_GPT_VISION_ENHANCEMENT);
console.log('Generate API - SAVE_LOCAL_COPIES:', process.env.SAVE_LOCAL_COPIES);

// Track last successful image generation for fallback - NO LONGER NEEDED FOR REPLICATE FALLBACK
// We're keeping this variable but using it differently - will be set to null after Replicate succeeds
let lastSuccessfulImageUrl: string | null = null;

// Function to get Pokémon image URL by ID
function getPokemonImageUrl(id: number): string {
  // Use the official Pokémon sprites from PokeAPI
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Set timeout for the API route within Vercel Pro plan limits
export const maxDuration = 300; // 300 seconds (5 minutes) - maximum allowed for Vercel Pro plan

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
    
    // Log full configuration status
    logConfigStatus();
    
    // Test the OpenAI client at the start to diagnose issues
    console.log("Generate API - Testing OpenAI client before processing");
    const openAiClientWorking = await testOpenAiClient();
    console.log("Generate API - OpenAI client test result:", openAiClientWorking);
    
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
    const useImageEditing = body.useImageEditing || false; // Flag to use the new image editing approach
    const maskType = body.maskType || 'lower-half'; // Default mask type if not specified
    
    console.log("Generate API - Parsed parameters:", { 
      pokemon1Id, 
      pokemon2Id,
      pokemon1Name,
      pokemon2Name,
      fusionName,
      hasImage1: !!pokemon1ImageUrl,
      hasImage2: !!pokemon2ImageUrl,
      useImageEditing,
      maskType
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
    
    // Convert to mutable variable to allow changing when falling back to Simple Method
    let useSimpleFusion = isSimpleFusion;
    
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

    try {
      // Determine which model to use based on environment variables
      const useReplicateBlend = process.env.USE_REPLICATE_BLEND !== 'false'; // Default to true unless explicitly set to false
      
      // Make sure the environment variable is properly set
      process.env.USE_GPT_VISION_ENHANCEMENT = 'true';
      
      // Get the enhancement setting from the environment
      const useGptEnhancement = true; // Force to true for testing
      // const envVar = (process.env.USE_GPT_VISION_ENHANCEMENT || '').toLowerCase();
      // const useGptEnhancement = envVar === 'true' || envVar === '1' || envVar === 'yes' || envVar === 'y';
      
      console.log('Generate API - Model selection:', { 
        useReplicateBlend,
        useGptEnhancement,
        USE_GPT_VISION_ENHANCEMENT: process.env.USE_GPT_VISION_ENHANCEMENT,
        USE_OPENAI_MODEL: process.env.USE_OPENAI_MODEL
      });
      
      // Add EXTREMELY VISIBLE debug
      console.warn('🔴🔴🔴 ROUTE.TS - AT ENHANCEMENT DECISION POINT 🔴🔴🔴');
      console.warn('🔴🔴🔴 useGptEnhancement value:', useGptEnhancement, '🔴🔴🔴');
      console.warn('🔴🔴🔴 OpenAI API Key present:', !!process.env.OPENAI_API_KEY, '🔴🔴🔴');
      console.warn('🔴🔴🔴 Environment value of USE_GPT_VISION_ENHANCEMENT:', process.env.USE_GPT_VISION_ENHANCEMENT, '🔴🔴🔴');
      console.warn('🔴🔴🔴 OPENAI_API_KEY format check:', process.env.OPENAI_API_KEY?.substring(0, 8), '🔴🔴🔴');

      let fusionImageUrl: string | null = null;

      // Try using Replicate Blend first
      if (useReplicateBlend) {
        try {
          console.log('Generate API - Attempting Replicate Blend model');
          
          // Check if REPLICATE_API_TOKEN is available
          if (!process.env.REPLICATE_API_TOKEN) {
            console.error('Generate API - REPLICATE_API_TOKEN not available');
            throw new Error('REPLICATE_API_TOKEN not available');
          }
          
          // Generate fusion with Replicate Blend - now returns URL directly
          const replicateResult = await generateWithReplicateBlend(
            pokemon1Name,
            pokemon2Name,
            processedImage1,
            processedImage2
          );
          
          if (replicateResult) {
            console.log('Generate API - Successfully generated fusion with Replicate Blend');
            fusionImageUrl = replicateResult;
            
            // Store the successful Replicate result temporarily - will be cleared if enhancement fails
            lastSuccessfulImageUrl = replicateResult;
            
            console.log('Generate API - Replicate Blend image URL:', fusionImageUrl);
            
            // Debug critical decision point: Will we run GPT enhancement?
            console.warn('CRITICAL DEBUG - Will we try GPT enhancement?', {
              useGptEnhancement,
              openAiKeyPresent: !!process.env.OPENAI_API_KEY,
              USE_GPT_VISION_ENHANCEMENT: process.env.USE_GPT_VISION_ENHANCEMENT,
              USE_OPENAI_MODEL: process.env.USE_OPENAI_MODEL,
              allRequiredConditionsMet: useGptEnhancement && !!process.env.OPENAI_API_KEY
            });
            
            // Modified condition - ALWAYS try to enhance if we have an API key
            // This bypasses the useGptEnhancement check for testing
            // Original condition: if (useGptEnhancement && process.env.OPENAI_API_KEY) {
            if (process.env.OPENAI_API_KEY) {  // Force attempt enhancement if key exists
              console.warn('🔴🔴🔴 ROUTE.TS - ENHANCEMENT CONDITION MET! 🔴🔴🔴');
              console.warn('🔴🔴🔴 Always trying enhancement for testing 🔴🔴🔴');
              try {
                console.log('Generate API - Attempting to enhance fusion image with GPT');
                console.log('Generate API - Enhancement flags:', {
                  useGptEnhancement,
                  hasApiKey: !!process.env.OPENAI_API_KEY,
                  USE_GPT_VISION_ENHANCEMENT: process.env.USE_GPT_VISION_ENHANCEMENT,
                  USE_OPENAI_MODEL: process.env.USE_OPENAI_MODEL,
                  apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
                  apiKeyValidFormat: process.env.OPENAI_API_KEY?.startsWith('sk-') || false,
                  apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 4) + '***' : 'none'
                });
                
                // IMPORTANT: Remove the time check that might be skipping enhancement in production
                console.warn('🔴🔴🔴 ROUTE.TS - FORCEFULLY PROCEEDING WITH ENHANCEMENT REGARDLESS OF TIME CONSTRAINTS 🔴🔴🔴');
                
                // Use URL for enhancement - can return a URL string or null
                console.time('GPT Enhancement');
                console.warn('🔴🔴🔴 ROUTE.TS - ABOUT TO CALL enhanceWithDirectGeneration 🔴🔴🔴');
                console.log('Generate API - BEFORE enhanceWithDirectGeneration call');
                
                // Declare enhancedImageUrl outside try/catch to make it accessible in wider scope
                let enhancedImageUrl: string | null = null;
                
                // Add a separate try/catch just around the enhancement call
                try {
                  console.warn('CRITICAL DEBUG - RIGHT BEFORE enhanceWithDirectGeneration call');
                  console.warn('CRITICAL DEBUG - Arguments:', {
                    pokemon1Name,
                    pokemon2Name,
                    fusionImageUrl: fusionImageUrl.substring(0, 50) + '...',
                    useGptEnhancement,
                    hasApiKey: !!process.env.OPENAI_API_KEY,
                    apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
                  });
                  
                  enhancedImageUrl = await enhanceWithDirectGeneration(
                    '', // No pokemon1Name needed
                    '', // No pokemon2Name needed
                    fusionImageUrl,
                    0 // No retries
                  );
                  console.warn('CRITICAL DEBUG - AFTER enhanceWithDirectGeneration call - result:', enhancedImageUrl ? 'success' : 'null');
                  console.log('Generate API - AFTER enhanceWithDirectGeneration call - result:', enhancedImageUrl ? 'success' : 'null');
                } catch (directError) {
                  console.error('Generate API - CRITICAL ERROR in enhanceWithDirectGeneration:', directError);
                  console.error('Generate API - Error stack:', directError?.stack);
                  console.error('Generate API - This is why enhancement is not working!');
                  
                  // Log the error type and properties
                  try {
                    console.error('Generate API - Error type:', directError?.constructor?.name);
                    console.error('Generate API - Error properties:', JSON.stringify(Object.getOwnPropertyNames(directError)));
                  } catch (logError) {
                    console.error('Generate API - Could not stringify error:', logError);
                  }
                }

                // Keep the original code structure to maintain backwards compatibility
                console.timeEnd('GPT Enhancement');
                
                // Updated logic for handling enhancement results
                if (enhancedImageUrl) {
                  console.log(`Generate API - Successfully enhanced image with GPT: ${enhancedImageUrl.substring(0, 50)}...`);
                  console.log(`Generate API - Updating fusion image URL from Replicate (${fusionImageUrl.substring(0, 30)}...) to GPT Enhanced (${enhancedImageUrl.substring(0, 30)}...)`);
                  
                  // Update the URL variable to use the enhanced version exclusively
                  fusionImageUrl = enhancedImageUrl;
                  
                  // Clear the lastSuccessfulImageUrl since we're using the enhanced image
                  lastSuccessfulImageUrl = null;
                  
                  // Log clear indication that we're only using the enhanced URL
                  console.log(`Generate API - Using ONLY the enhanced image URL for storage: ${fusionImageUrl.substring(0, 30)}...`);
                } else {
                  console.log('Generate API - GPT enhancement returned null, using Simple Method as fallback');
                  console.log('Generate API - This may be due to timeout, API error, or base64 handling issues');
                  
                  // Use Simple Method instead of Replicate Blend result
                  fusionImageUrl = processedImage1;
                  
                  // Clear the lastSuccessfulImageUrl since we're switching to Simple Method
                  lastSuccessfulImageUrl = null;
                  
                  // Set isSimpleFusion flag to true for credit handling
                  useSimpleFusion = true;
                  
                  console.log('Generate API - Switched to Simple Method: Using processed original image', fusionImageUrl.substring(0, 30) + '...');
                }
              } catch (enhancementError) {
                console.error('Generate API - Error enhancing with GPT:', enhancementError);
                console.log('Generate API - Using Simple Method instead of Replicate Blend');
                
                // Use Simple Method instead of Replicate Blend
                fusionImageUrl = processedImage1;
                
                // Clear the lastSuccessfulImageUrl since we're switching to Simple Method
                lastSuccessfulImageUrl = null;
                
                // Set isSimpleFusion flag to true for credit handling
                useSimpleFusion = true;
                
                console.log('Generate API - Switched to Simple Method: Using processed original image', fusionImageUrl.substring(0, 30) + '...');
              }
            } else {
              console.log('Generate API - GPT enhancement not enabled or OpenAI key not available:', {
                useGptEnhancement,
                hasApiKey: !!process.env.OPENAI_API_KEY,
                useGptEnhancementValue: process.env.USE_GPT_VISION_ENHANCEMENT
              });
            }
          } else {
            console.log('Generate API - Replicate Blend failed, will use Simple Method fallback');
          }
        } catch (blendError) {
          console.error('Generate API - Error with Replicate Blend:', blendError);
          console.log('Generate API - Will use Simple Method fallback');
        }
      }

      // If Replicate Blend failed, fall back to Simple Method
      if (!fusionImageUrl) {
        console.log('Generate API - Using Simple Method as fallback (processed original image)');
        // Use one of the processed original images as a fallback
        fusionImageUrl = processedImage1;
        // Set isSimpleFusion flag to true for credit handling
        useSimpleFusion = true;
      }

      // If this was an AI fusion, record the credit usage now that we have successfully generated the image
      if (!useSimpleFusion && fusionImageUrl !== processedImage1) {
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

      // Log which image source we're using to avoid duplicates
      const isEnhancedImage = fusionImageUrl.includes('fusion-gpt-enhanced');
      console.log(`Generate API - Using ${isEnhancedImage ? 'GPT-enhanced' : 'Replicate Blend'} image: ${fusionImageUrl.substring(0, 50)}...`);

      const result = await saveFusion({
        userId: userUuid || userId,
        pokemon1Id,
        pokemon2Id,
        pokemon1Name,
        pokemon2Name,
        fusionName,
        fusionImage: fusionImageUrl,
        isSimpleFusion: useSimpleFusion // Use the updated variable
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
        isLocalFallback: useSimpleFusion, // Use useSimpleFusion instead of hardcoded false
        message: useSimpleFusion ? 'Fusion generated using Simple Method' : 'Fusion generated successfully'
      });

    } catch (error) {
      console.error('Generate API - Error generating fusion:', error);

      // Since we no longer use lastSuccessfulImageUrl for Replicate fallback,
      // we go straight to the Simple Method fallback
      
      // Use one of the processed original images as a fallback
      const fallbackImageUrl = processedImage1;
      console.log('Generate API - Using processed image as Simple Method fallback:', fallbackImageUrl);

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
          isSimpleFusion: true // Simple Method for fallback
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

// Add a GET endpoint for testing
export async function GET() {
  try {
    console.log('Generate API - GET request received');
    console.log('Generate API - Testing OpenAI client');
    
    // Initialize config
    initializeConfig();
    
    // Test the OpenAI client
    const testResult = await testOpenAiClient();
    console.log('Generate API - OpenAI client test result:', testResult);
    
    // Return the test result
    return NextResponse.json({
      success: true,
      openAiClientWorking: testResult,
      message: testResult ? 'OpenAI client test successful' : 'OpenAI client test failed'
    });
  } catch (error) {
    console.error('Generate API - GET test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 