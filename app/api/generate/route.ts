import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth, currentUser } from '@clerk/nextjs/server';
import { saveFusion, uploadImageFromUrl } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';

// Log environment variables for debugging
console.log('Generate API - REPLICATE_API_TOKEN available:', !!process.env.REPLICATE_API_TOKEN);
console.log('Generate API - NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Generate API - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Direct API call function as a fallback
async function callReplicateDirectly(pokemon1Url: string, pokemon2Url: string, name1: string, name2: string) {
  console.log('Generate API - Attempting direct API call to Replicate');
  
  if (!process.env.REPLICATE_API_TOKEN) {
    console.log('Generate API - No token available for direct API call');
    return null;
  }
  
  try {
    // Create prediction
    console.log('Generate API - Creating prediction via direct API call');
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
        input: {
          image_1: pokemon1Url,
          image_2: pokemon2Url,
          merge_mode: "full",
          prompt: `a fusion of ${name1} and ${name2} pokemon, high quality, detailed`,
          negative_prompt: "low quality, blurry, distorted",
          upscale_2x: false
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Generate API - Direct API call failed:', errorData);
      return null;
    }
    
    const prediction = await response.json();
    console.log('Generate API - Prediction created:', prediction.id);
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      console.log(`Generate API - Polling attempt ${attempts + 1}/${maxAttempts}`);
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!statusResponse.ok) {
        console.error('Generate API - Failed to check prediction status');
        break;
      }
      
      const status = await statusResponse.json();
      console.log('Generate API - Prediction status:', status.status);
      
      if (status.status === 'succeeded') {
        console.log('Generate API - Prediction succeeded!');
        console.log('Generate API - Output:', status.output);
        return status.output;
      }
      
      if (status.status === 'failed') {
        console.error('Generate API - Prediction failed:', status.error);
        return null;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    console.log('Generate API - Exceeded maximum polling attempts');
    return null;
  } catch (error) {
    console.error('Generate API - Error in direct API call:', error);
    return null;
  }
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
      console.error("Generate API - Missing required fields");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // For testing purposes, return a mock response
    console.log("Generate API - Returning mock response for testing");
    
    // Generate a random UUID for the fusion
    const fusionId = uuidv4();
    
    // Get the user ID from the session or generate a test user ID
    let userId;
    try {
      const session = await auth();
      userId = session?.userId;
      console.log('User ID from auth():', userId);
    } catch (authError) {
      console.error('Error getting user ID from auth():', authError);
      // Generate a test user ID for testing
      userId = uuidv4();
      console.log('Generated test user ID:', userId);
    }
    
    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not available');
      return NextResponse.json({ 
        error: 'Supabase credentials not available',
        supabaseUrlAvailable: !!supabaseUrl,
        supabaseServiceKeyAvailable: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a test user if it doesn't exist
    const testUserId = uuidv4();
    console.log('Creating test user with ID:', testUserId);
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        name: 'Test User',
        email: `test-${Date.now()}@example.com`
      })
      .select();
    
    if (userError) {
      console.error('Error creating test user:', userError);
      return NextResponse.json({ 
        error: 'Error creating test user',
        details: userError
      }, { status: 500 });
    }
    
    console.log('Test user created successfully:', userData);
    
    // Save the fusion to the database
    console.log('Saving fusion to database...');
    try {
      // Create a test image URL
      const testImageUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
      
      // Save the fusion
      const result = await saveFusion({
        userId: testUserId,
        pokemon1Id: parseInt(pokemon1Id),
        pokemon2Id: parseInt(pokemon2Id),
        fusionName,
        fusionImage: testImageUrl
      });
      
      if (result.error) {
        console.error('Error saving fusion:', result.error);
        return NextResponse.json({ 
          error: `Error saving fusion: ${result.error}`,
          details: result.error
        }, { status: 500 });
      }
      
      console.log('Fusion saved successfully:', result.data);
      
      // Return the result
      return NextResponse.json({
        id: fusionId,
        output: testImageUrl,
        fusionName,
        pokemon1Id,
        pokemon2Id,
        fusionData: result.data,
        message: 'Fusion generated successfully (mock response)'
      });
    } catch (error) {
      console.error('Error in generate route:', error);
      return NextResponse.json({ 
        error: 'Error in generate route',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
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