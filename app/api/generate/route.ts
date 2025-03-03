import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';

// Check if Replicate API key is available
const replicateApiKey = process.env.REPLICATE_API_KEY || '';
console.log('Generate API - Replicate API key available:', !!replicateApiKey);
console.log('Generate API - Replicate API key length:', replicateApiKey ? replicateApiKey.length : 0);
console.log('Generate API - Replicate API key first 4 chars:', replicateApiKey ? replicateApiKey.substring(0, 4) : 'none');

// Initialize Replicate client
let replicate = null;
try {
  if (replicateApiKey) {
    replicate = new Replicate({
      auth: replicateApiKey,
    });
    console.log('Generate API - Replicate client initialized successfully');
  } else {
    console.log('Generate API - No Replicate API key available, client not initialized');
  }
} catch (error) {
  console.error('Generate API - Error initializing Replicate client:', error);
}

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
    
    try {
      // Generate a fusion name
      const fusionName = `${name1.substring(0, Math.floor(name1.length / 2))}${name2.substring(Math.floor(name2.length / 2))}`;
      const capitalizedFusionName = fusionName.charAt(0).toUpperCase() + fusionName.slice(1);
      
      console.log("Generate API - Generated fusion name:", capitalizedFusionName);
      
      let fusionImageUrl = null;
      let isLocalFallback = false;
      
      // Try to generate the fusion image with Replicate if client is available
      if (replicate) {
        try {
          console.log("Generate API - Attempting to use Replicate for fusion generation");
          
          // Use the image-merger model
          console.log("Generate API - Using image-merger model");
          
          const output = await replicate.run(
            "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
            {
              input: {
                image_1: pokemon1,
                image_2: pokemon2,
                prompt: `a fusion of ${name1} and ${name2}, pokemon style, digital art`,
                merge_mode: "left_right",
                upscale_2x: true,
                negative_prompt: "ugly, deformed, noisy, blurry, distorted",
              }
            }
          );
          
          console.log("Generate API - Replicate output received:", output);
          
          if (Array.isArray(output) && output.length > 0) {
            fusionImageUrl = output[0];
            console.log("Generate API - Fusion image URL:", fusionImageUrl);
          } else if (typeof output === 'string') {
            fusionImageUrl = output;
            console.log("Generate API - Fusion image URL (string):", fusionImageUrl);
          } else {
            console.log("Generate API - Unexpected output format:", output);
          }
        } catch (replicateError) {
          console.error("Generate API - Replicate API error:", replicateError);
        }
      } else {
        console.log("Generate API - Replicate client not available, using fallback");
      }
      
      // If Replicate failed or is not available, use local fallback
      if (!fusionImageUrl) {
        console.log("Generate API - Using fallback fusion approach");
        fusionImageUrl = pokemon1; // Use the first Pokemon image as a fallback
        isLocalFallback = true;
      }
      
      // Generate a unique ID for the fusion
      const fusionId = uuidv4();
      
      // Return the fusion data
      return NextResponse.json({
        id: fusionId,
        pokemon1Id,
        pokemon2Id,
        fusionName: capitalizedFusionName,
        fusionImage: fusionImageUrl,
        isLocalFallback,
        createdAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Generate API - Error in fusion generation:", error);
      
      // Create a fallback response
      const fallbackName = `${name1.substring(0, Math.floor(name1.length / 2))}${name2.substring(Math.floor(name2.length / 2))}`;
      const capitalizedFallbackName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
      
      return NextResponse.json({
        id: uuidv4(),
        pokemon1Id,
        pokemon2Id,
        fusionName: capitalizedFallbackName,
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