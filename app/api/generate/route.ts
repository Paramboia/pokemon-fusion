import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Check if Replicate API token is available
const replicateApiToken = process.env.REPLICATE_API_TOKEN || '';
console.log('Generate API - Replicate API token available:', !!replicateApiToken);
console.log('Generate API - Replicate API token length:', replicateApiToken ? replicateApiToken.length : 0);

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
    
    // For now, use a fallback approach to ensure the app works
    // This will return immediately with a fallback image while we debug the API issues
    const fusionId = uuidv4();
    
    return NextResponse.json({
      id: fusionId,
      pokemon1Id,
      pokemon2Id,
      fusionName: capitalizedFusionName,
      fusionImage: pokemon1, // Use the first Pokemon image as a fallback
      isLocalFallback: true,
      createdAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Generate API - Error in POST handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 