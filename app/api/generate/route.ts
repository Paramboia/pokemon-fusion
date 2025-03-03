import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

console.log('Generate API - Replicate client initialized with token:', !!process.env.REPLICATE_API_TOKEN);

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
    
    console.log("Generate API - Generating fusion for:", { name1, name2 });
    
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
      
      // Call the Replicate API to generate the fusion image using the image-merger model
      const output = await replicate.run(
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
      
      console.log("Generate API - Replicate API response:", output);
      
      // Check if we got a valid output
      if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 