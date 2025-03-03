import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth } from '@clerk/nextjs/server';
import { saveFusion } from '@/lib/supabase-server-actions';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

console.log('Generate API - Replicate client initialized with token:', !!process.env.REPLICATE_API_TOKEN);
console.log('Generate API - REPLICATE_API_TOKEN environment variable:', process.env.REPLICATE_API_TOKEN ? 'Present (starts with: ' + process.env.REPLICATE_API_TOKEN.substring(0, 5) + '...)' : 'Missing');

// Set a longer timeout for the API route
export const maxDuration = 60; // 60 seconds timeout for the API route

export async function POST(req: Request) {
  try {
    console.log("Generate API - POST request received");
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Generate API - No valid authorization header");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get the user ID from Clerk
    const { userId } = await auth();
    if (!userId) {
      console.log("Generate API - No user ID found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.log("Generate API - User ID:", userId);
    
    // Parse the request body
    const body = await req.json();
    console.log("Generate API - Request body received");
    
    // Extract the pokemon data from the request
    const { 
      pokemon1, 
      pokemon2, 
      name1, 
      name2, 
      pokemon1Id, 
      pokemon2Id 
    } = body;
    
    // Validate the request
    if (!pokemon1Id || !pokemon2Id || !pokemon1 || !pokemon2 || !name1 || !name2) {
      console.log("Generate API - Missing required data in request");
      return NextResponse.json(
        { error: "Missing required Pokemon data" },
        { status: 400 }
      );
    }
    
    console.log("Generate API - Generating fusion for:", { name1, name2, pokemon1Id, pokemon2Id });
    
    // Generate a fusion name
    const fusionName = `${name1.substring(0, Math.floor(name1.length / 2))}${name2.substring(Math.floor(name2.length / 2))}`;
    const capitalizedFusionName = fusionName.charAt(0).toUpperCase() + fusionName.slice(1);
    
    console.log("Generate API - Generated fusion name:", capitalizedFusionName);
    
    // Generate a unique ID for this fusion
    const fusionId = uuidv4();
    
    try {
      // Check if we have a Replicate API token
      if (!process.env.REPLICATE_API_TOKEN) {
        console.log("Generate API - No Replicate API token found, using fallback");
        
        // Create the fusion data
        const fusionData = {
          id: fusionId,
          user_id: userId,
          pokemon_1_id: pokemon1Id,
          pokemon_2_id: pokemon2Id,
          fusion_name: capitalizedFusionName,
          fusion_image: pokemon1, // Use the first Pokemon image as a fallback
          likes: 0
        };
        
        // Save the fusion to Supabase
        console.log("Generate API - Saving fallback fusion to Supabase");
        const savedFusion = await saveFusion(fusionData);
        console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
        
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          fusionImage: pokemon1, // Use the first Pokemon image as a fallback
          isLocalFallback: true,
          createdAt: new Date().toISOString()
        });
      }
      
      console.log("Generate API - Calling Replicate API with images:", {
        pokemon1: pokemon1.substring(0, 50) + "...",
        pokemon2: pokemon2.substring(0, 50) + "..."
      });
      
      // Log the model ID we're using
      console.log("Generate API - Using Replicate model: fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867");
      
      // Log the input parameters
      console.log("Generate API - Input parameters:", {
        merge_mode: "overlay",
        prompt: `a fusion of ${name1} and ${name2} pokemon, high quality, detailed`,
        negative_prompt: "low quality, blurry, distorted",
        upscale_2x: false
      });
      
      // Call the Replicate API to generate the fusion image using the image-merger model
      console.log("Generate API - Starting Replicate API call...");
      const output: any = await replicate.run(
        "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
        {
          input: {
            image_1: pokemon1,
            image_2: pokemon2,
            merge_mode: "overlay",
            prompt: `a fusion of ${name1} and ${name2} pokemon, high quality, detailed`,
            negative_prompt: "low quality, blurry, distorted",
            upscale_2x: false
          }
        }
      );
      
      console.log("Generate API - Replicate API call completed");
      console.log("Generate API - Replicate API response type:", typeof output);
      console.log("Generate API - Replicate API response is array?", Array.isArray(output));
      
      // Handle different output types with proper type checking
      if (Array.isArray(output)) {
        console.log("Generate API - Replicate API response array length:", output.length);
        if (output.length > 0) {
          console.log("Generate API - First item type:", typeof output[0]);
          if (typeof output[0] === 'string') {
            console.log("Generate API - First item preview:", output[0].substring(0, 50) + "...");
          } else {
            console.log("Generate API - First item is not a string");
          }
        }
      } else if (typeof output === 'string') {
        console.log("Generate API - Output string preview:", output.substring(0, 50) + "...");
      } else if (output === null) {
        console.log("Generate API - Output is null");
      } else if (output && typeof output === 'object') {
        console.log("Generate API - Output keys:", Object.keys(output));
      } else {
        console.log("Generate API - Output is of unexpected type:", typeof output);
      }
      
      // Check if we got a valid output
      if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
        console.log("Generate API - Valid array output, returning first item");
        
        // Create the fusion data
        const fusionData = {
          id: fusionId,
          user_id: userId,
          pokemon_1_id: pokemon1Id,
          pokemon_2_id: pokemon2Id,
          fusion_name: capitalizedFusionName,
          fusion_image: output[0],
          likes: 0
        };
        
        // Save the fusion to Supabase
        console.log("Generate API - Saving fusion to Supabase");
        const savedFusion = await saveFusion(fusionData);
        console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
        
        // Return the fusion data with the generated image
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          fusionImage: output[0],
          isLocalFallback: false,
          createdAt: new Date().toISOString()
        });
      } else if (typeof output === 'string') {
        console.log("Generate API - Valid string output, returning it directly");
        
        // Create the fusion data
        const fusionData = {
          id: fusionId,
          user_id: userId,
          pokemon_1_id: pokemon1Id,
          pokemon_2_id: pokemon2Id,
          fusion_name: capitalizedFusionName,
          fusion_image: output,
          likes: 0
        };
        
        // Save the fusion to Supabase
        console.log("Generate API - Saving fusion to Supabase");
        const savedFusion = await saveFusion(fusionData);
        console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
        
        // Sometimes the output might be a single string instead of an array
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          fusionImage: output,
          isLocalFallback: false,
          createdAt: new Date().toISOString()
        });
      } else {
        console.log("Generate API - Invalid output from Replicate API, using fallback");
        
        // Create the fusion data
        const fusionData = {
          id: fusionId,
          user_id: userId,
          pokemon_1_id: pokemon1Id,
          pokemon_2_id: pokemon2Id,
          fusion_name: capitalizedFusionName,
          fusion_image: pokemon1, // Use the first Pokemon image as a fallback
          likes: 0
        };
        
        // Save the fusion to Supabase
        console.log("Generate API - Saving fallback fusion to Supabase");
        const savedFusion = await saveFusion(fusionData);
        console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
        
        // Fallback to using the first Pokemon image
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          fusionImage: pokemon1, // Use the first Pokemon image as a fallback
          isLocalFallback: true,
          createdAt: new Date().toISOString()
        });
      }
    } catch (replicateError) {
      console.error("Generate API - Error calling Replicate API:", replicateError);
      console.error("Generate API - Error name:", replicateError.name);
      console.error("Generate API - Error message:", replicateError.message);
      if (replicateError.response) {
        console.error("Generate API - Error response status:", replicateError.response.status);
        console.error("Generate API - Error response data:", replicateError.response.data);
      }
      
      // Create the fusion data
      const fusionData = {
        id: fusionId,
        user_id: userId,
        pokemon_1_id: pokemon1Id,
        pokemon_2_id: pokemon2Id,
        fusion_name: capitalizedFusionName,
        fusion_image: pokemon1, // Use the first Pokemon image as a fallback
        likes: 0
      };
      
      // Save the fusion to Supabase
      console.log("Generate API - Saving fallback fusion to Supabase after error");
      const savedFusion = await saveFusion(fusionData);
      console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
      
      // Fallback to using the first Pokemon image
      return NextResponse.json({
        id: fusionId,
        pokemon1Id,
        pokemon2Id,
        fusionName: capitalizedFusionName,
        fusionImage: pokemon1, // Use the first Pokemon image as a fallback
        isLocalFallback: true,
        createdAt: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("Generate API - Error in POST handler:", error);
    console.error("Generate API - Error name:", error.name);
    console.error("Generate API - Error message:", error.message);
    if (error.stack) {
      console.error("Generate API - Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 