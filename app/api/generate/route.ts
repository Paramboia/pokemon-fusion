import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Generate API - Supabase URL:', supabaseUrl);
console.log('Generate API - Service Key available:', !!supabaseServiceKey);

// Check if Replicate API token is available
const replicateToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN || '';
console.log('Generate API - Replicate token available:', !!replicateToken);
console.log('Generate API - Replicate token length:', replicateToken ? replicateToken.length : 0);
console.log('Generate API - Replicate token first 4 chars:', replicateToken ? replicateToken.substring(0, 4) : 'none');

// Direct API call to Replicate
async function callReplicateAPI(model: string, input: any) {
  if (!replicateToken) {
    console.log("Generate API - No Replicate token available");
    return null;
  }

  try {
    console.log(`Generate API - Calling Replicate API for model: ${model}`);
    
    // Create prediction
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: model,
        input: input
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`Generate API - Error creating prediction: ${createResponse.status} ${errorText}`);
      return null;
    }

    const prediction = await createResponse.json();
    console.log(`Generate API - Prediction created with ID: ${prediction.id}`);

    // Poll for completion
    let completed = false;
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second delay = 60 seconds max

    while (!completed && attempts < maxAttempts) {
      attempts++;
      
      // Wait 2 seconds between polling attempts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get prediction status
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${replicateToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`Generate API - Error checking prediction status: ${statusResponse.status} ${errorText}`);
        break;
      }

      const status = await statusResponse.json();
      console.log(`Generate API - Prediction status: ${status.status}, attempt ${attempts}/${maxAttempts}`);

      if (status.status === "succeeded") {
        completed = true;
        result = status.output;
        console.log("Generate API - Prediction completed successfully");
      } else if (status.status === "failed" || status.status === "canceled") {
        console.error(`Generate API - Prediction ${status.status}: ${status.error || "Unknown error"}`);
        break;
      }
    }

    if (!completed) {
      console.log("Generate API - Prediction timed out or failed");
      return null;
    }

    return result;
  } catch (error) {
    console.error("Generate API - Error calling Replicate API:", error);
    return null;
  }
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
      
      // Try to generate the fusion image with Replicate if token is available
      if (replicateToken) {
        try {
          console.log("Generate API - Attempting to use Replicate for fusion generation");
          
          // Try SDXL model first
          const sdxlModel = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
          const sdxlInput = {
            prompt: `a fusion of two pokemon, one is ${name1} and the other is ${name2}, digital art, sharp, solid color, thick outline, game art style, official pokemon art style`,
            negative_prompt: "garish, soft, ugly, broken, distorted, deformed, low quality, blurry",
            width: 768,
            height: 768,
            refine: "expert_ensemble_refiner",
            scheduler: "K_EULER",
            lora_scale: 0.6,
            num_outputs: 1,
            guidance_scale: 7.5,
            apply_watermark: false,
            high_noise_frac: 0.8,
            prompt_strength: 0.8,
            num_inference_steps: 30
          };
          
          const sdxlOutput = await callReplicateAPI(sdxlModel, sdxlInput);
          
          if (sdxlOutput) {
            if (Array.isArray(sdxlOutput) && sdxlOutput.length > 0) {
              fusionImageUrl = sdxlOutput[0];
            } else if (typeof sdxlOutput === 'string') {
              fusionImageUrl = sdxlOutput;
            }
          }
          
          // If SDXL failed, try the image-merger model
          if (!fusionImageUrl) {
            console.log("Generate API - SDXL failed, trying image-merger model");
            
            const mergerModel = "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867";
            const mergerInput = {
              image_1: pokemon1,
              image_2: pokemon2,
              merge_mode: "left_right",
              upscale_2x: true,
              prompt: "a pokemon, digital art, sharp, solid color, thick outline",
              negative_prompt: "garish, soft, ugly, broken, distorted"
            };
            
            const mergerOutput = await callReplicateAPI(mergerModel, mergerInput);
            
            if (mergerOutput) {
              if (Array.isArray(mergerOutput) && mergerOutput.length > 0) {
                fusionImageUrl = mergerOutput[0];
              } else if (typeof mergerOutput === 'string') {
                fusionImageUrl = mergerOutput;
              }
            }
          }
        } catch (replicateError) {
          console.error("Generate API - Replicate API error:", replicateError);
        }
      } else {
        console.log("Generate API - Replicate token not available, using fallback");
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