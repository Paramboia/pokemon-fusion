import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Check if Replicate API token is available
const replicateApiToken = process.env.REPLICATE_API_TOKEN || '';
console.log('Generate API - Replicate API token available:', !!replicateApiToken);
console.log('Generate API - Replicate API token length:', replicateApiToken ? replicateApiToken.length : 0);
console.log('Generate API - Replicate API token first 4 chars:', replicateApiToken ? replicateApiToken.substring(0, 4) : 'none');

// Helper function to wait for a specified time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to create a prediction using Replicate API
async function createPrediction(pokemon1: string, pokemon2: string, name1: string, name2: string) {
  console.log('Generate API - Creating prediction with Replicate API');
  
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${replicateApiToken}`
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
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Generate API - Error creating prediction:', errorData);
      throw new Error(`Failed to create prediction: ${response.status} ${response.statusText}`);
    }

    const prediction = await response.json();
    console.log('Generate API - Prediction created:', prediction.id);
    return prediction;
  } catch (error) {
    console.error('Generate API - Error in createPrediction:', error);
    throw error;
  }
}

// Function to get prediction results
async function getPredictionResult(predictionId: string) {
  console.log('Generate API - Getting prediction result for:', predictionId);
  
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${replicateApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Generate API - Error getting prediction:', errorData);
      throw new Error(`Failed to get prediction: ${response.status} ${response.statusText}`);
    }

    const prediction = await response.json();
    console.log('Generate API - Prediction status:', prediction.status);
    return prediction;
  } catch (error) {
    console.error('Generate API - Error in getPredictionResult:', error);
    throw error;
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
      
      // Check if Replicate API token is available
      if (replicateApiToken) {
        try {
          console.log("Generate API - Attempting to use Replicate API for fusion generation");
          console.log("Generate API - Image URLs:", { 
            pokemon1: pokemon1.substring(0, 50) + "...", 
            pokemon2: pokemon2.substring(0, 50) + "..." 
          });
          
          // Create a prediction
          const prediction = await createPrediction(pokemon1, pokemon2, name1, name2);
          
          // Poll for the prediction result
          let result = null;
          let attempts = 0;
          const maxAttempts = 30; // 30 attempts with 2 second delay = up to 60 seconds of waiting
          
          while (attempts < maxAttempts) {
            attempts++;
            console.log(`Generate API - Polling for result, attempt ${attempts}/${maxAttempts}`);
            
            const predictionStatus = await getPredictionResult(prediction.id);
            
            if (predictionStatus.status === 'succeeded') {
              result = predictionStatus;
              break;
            } else if (predictionStatus.status === 'failed') {
              console.error('Generate API - Prediction failed:', predictionStatus.error);
              throw new Error(`Prediction failed: ${predictionStatus.error}`);
            } else if (predictionStatus.status === 'canceled') {
              console.error('Generate API - Prediction was canceled');
              throw new Error('Prediction was canceled');
            }
            
            // Wait before polling again
            await sleep(2000); // 2 second delay
          }
          
          if (!result) {
            console.error('Generate API - Prediction timed out after maximum attempts');
            throw new Error('Prediction timed out after maximum attempts');
          }
          
          console.log('Generate API - Prediction succeeded:', result.output);
          
          // Extract the output URL
          if (Array.isArray(result.output) && result.output.length > 0) {
            fusionImageUrl = result.output[0];
          } else if (typeof result.output === 'string') {
            fusionImageUrl = result.output;
          } else {
            console.log('Generate API - Unexpected output format:', result.output);
            throw new Error('Unexpected output format from Replicate API');
          }
          
          console.log('Generate API - Fusion image URL:', fusionImageUrl);
        } catch (replicateError) {
          console.error("Generate API - Replicate API error:", replicateError);
          console.error("Generate API - Error details:", replicateError.message);
          throw replicateError;
        }
      } else {
        console.log("Generate API - No Replicate API token available, using fallback");
        throw new Error('No Replicate API token available');
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