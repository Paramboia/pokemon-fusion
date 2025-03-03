import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { auth } from '@clerk/nextjs/server';
import { saveFusion, uploadImageFromUrl } from '@/lib/supabase-server-actions';

// Log environment variables for debugging
console.log('Generate API - Environment variables check:');
console.log('REPLICATE_API_TOKEN exists:', !!process.env.REPLICATE_API_TOKEN);
console.log('REPLICATE_API_TOKEN length:', process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.length : 0);
console.log('REPLICATE_API_TOKEN first 5 chars:', process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.substring(0, 5) : 'none');

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

console.log('Generate API - Replicate client initialized with token:', !!process.env.REPLICATE_API_TOKEN);

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
          merge_mode: "overlay",
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
    let userId = null;
    try {
      const authResult = await auth();
      userId = authResult?.userId;
      console.log("Generate API - User ID:", userId);
    } catch (authError) {
      console.error("Generate API - Error getting user ID:", authError);
      // Continue without user ID, we'll still generate the fusion but won't save it to Supabase
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
        
        // Try to save the fusion to Supabase if we have a user ID
        if (userId) {
          try {
            // Upload the fallback image to Supabase Storage
            const storagePath = `${userId}/${fusionId}.png`;
            console.log("Generate API - Uploading fallback image to Supabase Storage");
            const uploadedImageUrl = await uploadImageFromUrl(pokemon1, 'fusions', storagePath);
            console.log("Generate API - Image uploaded to Supabase Storage:", !!uploadedImageUrl);
            
            // Create the fusion data with the uploaded image URL
            const fusionData = {
              id: fusionId,
              user_id: userId,
              pokemon_1_id: pokemon1Id,
              pokemon_2_id: pokemon2Id,
              fusion_name: capitalizedFusionName,
              fusion_image: uploadedImageUrl || pokemon1, // Use uploaded URL or fallback to original URL
              likes: 0
            };
            
            // Save the fusion to Supabase
            console.log("Generate API - Saving fallback fusion to Supabase");
            const savedFusion = await saveFusion(fusionData);
            console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
          } catch (saveError) {
            console.error("Generate API - Error saving fusion to Supabase:", saveError);
            // Continue without saving to Supabase
          }
        }
        
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
      
      // Try using the Replicate client library first
      let output: any = null;
      let usedDirectApi = false;
      
      try {
        console.log("Generate API - Starting Replicate API call using client library...");
        output = await replicate.run(
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
        console.log("Generate API - Replicate client library call completed");
      } catch (clientError) {
        console.error("Generate API - Error using client library:", clientError);
        console.log("Generate API - Falling back to direct API call");
        
        // Try direct API call as fallback
        output = await callReplicateDirectly(pokemon1, pokemon2, name1, name2);
        usedDirectApi = true;
      }
      
      console.log("Generate API - Replicate API call completed");
      console.log("Generate API - Used direct API:", usedDirectApi);
      console.log("Generate API - Replicate API response type:", typeof output);
      console.log("Generate API - Replicate API response is array?", Array.isArray(output));
      
      // Handle different output types with proper type checking
      if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'string') {
        console.log("Generate API - Valid array output, returning first item");
        const fusionImageUrl = output[0];
        
        // Try to save the fusion to Supabase if we have a user ID
        if (userId) {
          try {
            // Upload the generated image to Supabase Storage
            const storagePath = `${userId}/${fusionId}.png`;
            console.log("Generate API - Uploading generated image to Supabase Storage");
            const uploadedImageUrl = await uploadImageFromUrl(fusionImageUrl, 'fusions', storagePath);
            console.log("Generate API - Image uploaded to Supabase Storage:", !!uploadedImageUrl);
            
            // Create the fusion data with the uploaded image URL
            const fusionData = {
              id: fusionId,
              user_id: userId,
              pokemon_1_id: pokemon1Id,
              pokemon_2_id: pokemon2Id,
              fusion_name: capitalizedFusionName,
              fusion_image: uploadedImageUrl || fusionImageUrl, // Use uploaded URL or fallback to original URL
              likes: 0
            };
            
            // Save the fusion to Supabase
            console.log("Generate API - Saving fusion to Supabase");
            const savedFusion = await saveFusion(fusionData);
            console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
          } catch (saveError) {
            console.error("Generate API - Error saving fusion to Supabase:", saveError);
            // Continue without saving to Supabase
          }
        }
        
        // Return the fusion data with the generated image
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          fusionImage: fusionImageUrl,
          isLocalFallback: false,
          createdAt: new Date().toISOString()
        });
      } else if (typeof output === 'string') {
        console.log("Generate API - Valid string output, returning it directly");
        const fusionImageUrl = output;
        
        // Try to save the fusion to Supabase if we have a user ID
        if (userId) {
          try {
            // Upload the generated image to Supabase Storage
            const storagePath = `${userId}/${fusionId}.png`;
            console.log("Generate API - Uploading generated image to Supabase Storage");
            const uploadedImageUrl = await uploadImageFromUrl(fusionImageUrl, 'fusions', storagePath);
            console.log("Generate API - Image uploaded to Supabase Storage:", !!uploadedImageUrl);
            
            // Create the fusion data with the uploaded image URL
            const fusionData = {
              id: fusionId,
              user_id: userId,
              pokemon_1_id: pokemon1Id,
              pokemon_2_id: pokemon2Id,
              fusion_name: capitalizedFusionName,
              fusion_image: uploadedImageUrl || fusionImageUrl, // Use uploaded URL or fallback to original URL
              likes: 0
            };
            
            // Save the fusion to Supabase
            console.log("Generate API - Saving fusion to Supabase");
            const savedFusion = await saveFusion(fusionData);
            console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
          } catch (saveError) {
            console.error("Generate API - Error saving fusion to Supabase:", saveError);
            // Continue without saving to Supabase
          }
        }
        
        // Sometimes the output might be a single string instead of an array
        return NextResponse.json({
          id: fusionId,
          pokemon1Id,
          pokemon2Id,
          fusionName: capitalizedFusionName,
          fusionImage: fusionImageUrl,
          isLocalFallback: false,
          createdAt: new Date().toISOString()
        });
      } else {
        console.log("Generate API - Invalid output from Replicate API, using fallback");
        
        // Try to save the fusion to Supabase if we have a user ID
        if (userId) {
          try {
            // Upload the fallback image to Supabase Storage
            const storagePath = `${userId}/${fusionId}.png`;
            console.log("Generate API - Uploading fallback image to Supabase Storage");
            const uploadedImageUrl = await uploadImageFromUrl(pokemon1, 'fusions', storagePath);
            console.log("Generate API - Image uploaded to Supabase Storage:", !!uploadedImageUrl);
            
            // Create the fusion data with the uploaded image URL
            const fusionData = {
              id: fusionId,
              user_id: userId,
              pokemon_1_id: pokemon1Id,
              pokemon_2_id: pokemon2Id,
              fusion_name: capitalizedFusionName,
              fusion_image: uploadedImageUrl || pokemon1, // Use uploaded URL or fallback to original URL
              likes: 0
            };
            
            // Save the fusion to Supabase
            console.log("Generate API - Saving fallback fusion to Supabase");
            const savedFusion = await saveFusion(fusionData);
            console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
          } catch (saveError) {
            console.error("Generate API - Error saving fusion to Supabase:", saveError);
            // Continue without saving to Supabase
          }
        }
        
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
      
      // Try to save the fusion to Supabase if we have a user ID
      if (userId) {
        try {
          // Upload the fallback image to Supabase Storage
          const storagePath = `${userId}/${fusionId}.png`;
          console.log("Generate API - Uploading fallback image to Supabase Storage after error");
          const uploadedImageUrl = await uploadImageFromUrl(pokemon1, 'fusions', storagePath);
          console.log("Generate API - Image uploaded to Supabase Storage:", !!uploadedImageUrl);
          
          // Create the fusion data with the uploaded image URL
          const fusionData = {
            id: fusionId,
            user_id: userId,
            pokemon_1_id: pokemon1Id,
            pokemon_2_id: pokemon2Id,
            fusion_name: capitalizedFusionName,
            fusion_image: uploadedImageUrl || pokemon1, // Use uploaded URL or fallback to original URL
            likes: 0
          };
          
          // Save the fusion to Supabase
          console.log("Generate API - Saving fallback fusion to Supabase after error");
          const savedFusion = await saveFusion(fusionData);
          console.log("Generate API - Fusion saved to Supabase:", !!savedFusion);
        } catch (saveError) {
          console.error("Generate API - Error saving fusion to Supabase:", saveError);
          // Continue without saving to Supabase
        }
      }
      
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