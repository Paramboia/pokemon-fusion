import { NextResponse } from 'next/server';

// Get the Replicate API token
const replicateApiToken = process.env.REPLICATE_API_TOKEN || '';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const predictionId = params.id;
    
    if (!predictionId) {
      return NextResponse.json(
        { error: "Missing prediction ID" },
        { status: 400 }
      );
    }
    
    console.log("Prediction API - Checking status for prediction:", predictionId);
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Prediction API - No valid authorization header");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    try {
      // Check the prediction status using the Replicate API
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${replicateApiToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Prediction API - Error checking prediction:", errorData);
        return NextResponse.json(
          { error: `Failed to check prediction: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
      
      const prediction = await response.json();
      console.log("Prediction API - Status:", prediction.status);
      
      // Return the prediction data
      return NextResponse.json(prediction);
      
    } catch (error) {
      console.error("Prediction API - Error checking prediction:", error);
      return NextResponse.json(
        { error: "Failed to check prediction status" },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Prediction API - Error in GET handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 