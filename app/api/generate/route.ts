import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Get the Replicate API token
const replicateApiToken = process.env.REPLICATE_API_TOKEN || '';
console.log('Generate API - Replicate API token available:', !!replicateApiToken);

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
      
      // Create a prediction using the Replicate API directly
      console.log("Generate API - Creating prediction with Replicate API");
      
      // Set a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${replicateApiToken}`
          },
          body: JSON.stringify({
            version: "db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
            input: {
              image_1: pokemon1,
              image_2: pokemon2,
              prompt: `a fusion of ${name1} and ${name2}, pokemon style, digital art`,
              merge_mode: "left_right",
              upscale_2x: true,
              negative_prompt: "ugly, deformed, noisy, blurry, distorted",
            }
          }),
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Generate API - Error creating prediction:", errorData);
          throw new Error(`Failed to create prediction: ${response.status} ${response.statusText}`);
        }
        
        const prediction = await response.json();
        console.log("Generate API - Prediction created:", prediction.id);
        
        // Generate a unique ID for the fusion
        const fusionId = uuidv4();
        
        // Return the fusion data with the prediction ID
        // The frontend will need to poll for the result
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          predictionId: prediction.id,
          predictionUrl: prediction.urls.get,
          isProcessing: true,
          createdAt: new Date().toISOString()
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error("Generate API - Fetch error:", fetchError);
        throw fetchError;
      }
      
    } catch (error) {
      console.error("Generate API - Error in fusion generation:", error);
      console.log("Generate API - Using fallback fusion approach due to server error");
      
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