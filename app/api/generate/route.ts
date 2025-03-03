import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';
import { supabaseClient } from '@/lib/supabase-server';
import { getSupabaseUserId, uploadImageFromUrl } from '@/lib/supabase-server-actions';
import { savePokemon, saveFusion } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Generate API - Supabase URL:', supabaseUrl);
console.log('Generate API - Service Key available:', !!supabaseServiceKey);

// Create a server-side Supabase client with additional headers
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
  },
  db: {
    schema: 'public',
  },
});

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN || '',
});

// Fallback function to generate a fusion image locally
// This is a simple implementation that just returns one of the original Pokemon images
// In a real implementation, you would use a local image processing library
const generateLocalFusion = (pokemon1Url: string, pokemon2Url: string, name1: string, name2: string) => {
  console.log('Using local fusion generation as fallback');
  // For now, just return the first Pokemon image
  // In a real implementation, you would combine the images
  return pokemon1Url;
};

// Helper function to get the Supabase user ID from Clerk ID
async function getSupabaseUserId(clerkId: string): Promise<string | null> {
  try {
    console.log('getSupabaseUserId - Starting lookup for Clerk ID:', clerkId);
    
    // Get the current user's email from Clerk
    const user = await clerkClient.users.getUser(clerkId);
    console.log('getSupabaseUserId - Clerk user found:', user ? 'Yes' : 'No');
    
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      console.log('getSupabaseUserId - No email addresses found for user');
      return null;
    }
    
    // Get the primary email
    const primaryEmailObj = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId) || user.emailAddresses[0];
    const email = primaryEmailObj.emailAddress;
    console.log('getSupabaseUserId - Using email for lookup:', email);
    
    // Query Supabase for the user ID
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('getSupabaseUserId - Supabase query error:', error.message);
      return null;
    }
    
    if (data) {
      console.log('getSupabaseUserId - Found Supabase user ID:', data.id);
      return data.id;
    }
    
    console.log('getSupabaseUserId - No matching user found in Supabase');
    return null;
  } catch (error) {
    console.error('getSupabaseUserId - Error:', error);
    return null;
  }
}

// First, ensure the fusions table exists
async function ensureFusionsTableExists() {
  try {
    console.log('Generate API - Ensuring fusions table exists');
    
    // Try to create the UUID extension if it doesn't exist
    const createExtensionQuery = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `;
    
    try {
      const { error: extensionError } = await supabaseClient.rpc('exec_sql', { query: createExtensionQuery });
      if (extensionError) {
        console.log('Generate API - Error creating UUID extension (may already exist):', extensionError);
      } else {
        console.log('Generate API - UUID extension created or already exists');
      }
    } catch (extensionError) {
      console.log('Generate API - Error creating UUID extension:', extensionError);
    }
    
    // Create the fusions table with the correct schema
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS fusions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        pokemon_1_id INT REFERENCES pokemon(id) ON DELETE CASCADE,
        pokemon_2_id INT REFERENCES pokemon(id) ON DELETE CASCADE,
        fusion_name TEXT NOT NULL,
        fusion_image TEXT NOT NULL,
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `;
    
    try {
      const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
      if (createTableError) {
        console.log('Generate API - Error creating fusions table:', createTableError);
        
        // If the error is due to foreign key constraints, try creating a simpler version
        const simplifiedTableQuery = `
          CREATE TABLE IF NOT EXISTS fusions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT NOT NULL,
            pokemon_1_id INTEGER NOT NULL,
            pokemon_2_id INTEGER NOT NULL,
            fusion_name TEXT NOT NULL,
            fusion_image TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `;
        
        const { error: simplifiedError } = await supabaseClient.rpc('exec_sql', { query: simplifiedTableQuery });
        if (simplifiedError) {
          console.log('Generate API - Error creating simplified fusions table:', simplifiedError);
        } else {
          console.log('Generate API - Simplified fusions table created successfully');
        }
      } else {
        console.log('Generate API - Fusions table created successfully');
      }
    } catch (tableError) {
      console.log('Generate API - Error in table creation:', tableError);
    }
  } catch (error) {
    console.log('Generate API - Error ensuring fusions table exists:', error);
  }
}

export async function POST(req: Request) {
  console.log("Generate API - POST request received");
  
  try {
    // Check for authentication using Clerk's auth() function
    const { userId: authUserId } = auth();
    console.log("Generate API - Auth userId from auth():", authUserId);
    
    // Check for authorization header as fallback
    let finalUserId = authUserId;
    
    if (!finalUserId) {
      console.log("Generate API - No userId from auth(), checking Authorization header");
      const authHeader = req.headers.get("Authorization");
      console.log("Generate API - Authorization header present:", authHeader ? "Yes" : "No");
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        // Extract the token
        const token = authHeader.split(" ")[1];
        console.log("Generate API - Extracted token (first 10 chars):", token.substring(0, 10) + "...");
        
        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log("Generate API - Token verification result:", verifiedToken ? "Success" : "Failed");
          
          if (verifiedToken && verifiedToken.sub) {
            console.log("Generate API - Verified token, userId:", verifiedToken.sub);
            finalUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error("Generate API - Error verifying token:", tokenError);
        }
      }
    }
    
    // If no userId is found, return an error
    if (!finalUserId) {
      console.log("Generate API - No authenticated user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get the Supabase user ID for the authenticated user
    const supabaseUserId = await getSupabaseUserId(finalUserId);
    console.log("Generate API - Supabase user lookup result:", supabaseUserId ? "Found" : "Not found");
    
    if (!supabaseUserId) {
      console.log("Generate API - User not found in database");
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const body = await req.json();
    console.log("Generate API - Request body:", body);
    
    // Extract the pokemon IDs from the request
    const { pokemon1Id, pokemon2Id } = body;
    
    // Validate the request
    if (!pokemon1Id || !pokemon2Id) {
      console.log("Generate API - Missing pokemon IDs in request");
      return NextResponse.json(
        { error: "Missing pokemon IDs" },
        { status: 400 }
      );
    }
    
    // Generate the fusion
    const result = await handleFusionGeneration(
      pokemon1Id,
      pokemon2Id,
      supabaseUserId
    );
    
    console.log("Generate API - Fusion generation result:", result ? "Success" : "Failed");
    
    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate fusion" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate API - Error in POST handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to handle the fusion generation process
async function handleFusionGeneration(
  pokemon1Id: number,
  pokemon2Id: number,
  userId: string
) {
  console.log("Generate API - handleFusionGeneration called with:", {
    pokemon1Id,
    pokemon2Id,
    userId
  });

  try {
    // Ensure the fusions table exists
    await ensureFusionsTableExists();

    // Generate a fusion name
    const fusionName = await generateFusionName(pokemon1Id, pokemon2Id);
    console.log("Generate API - Generated fusion name:", fusionName);

    // Generate a fusion image
    const fusionImageUrl = await generateFusionImage(pokemon1Id, pokemon2Id);
    console.log("Generate API - Generated fusion image URL:", fusionImageUrl ? "Success" : "Failed");

    if (!fusionImageUrl) {
      console.error("Generate API - Failed to generate fusion image");
      return null;
    }

    // Save the fusion to the database
    const fusionId = await saveFusionToDatabase(
      pokemon1Id,
      pokemon2Id,
      fusionName,
      fusionImageUrl,
      userId
    );
    console.log("Generate API - Saved fusion to database with ID:", fusionId);

    if (!fusionId) {
      console.error("Generate API - Failed to save fusion to database");
      return null;
    }

    // Return the fusion data
    return {
      id: fusionId,
      pokemon1Id,
      pokemon2Id,
      fusionName,
      fusionImage: fusionImageUrl,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Generate API - Error in handleFusionGeneration:", error);
    return null;
  }
}

// Helper function to generate a fusion name
async function generateFusionName(pokemon1Id: number, pokemon2Id: number): Promise<string> {
  try {
    // Get the Pokemon names from the database or API
    const pokemon1Data = await getPokemonData(pokemon1Id);
    const pokemon2Data = await getPokemonData(pokemon2Id);
    
    if (!pokemon1Data || !pokemon2Data) {
      console.error("Generate API - Failed to get Pokemon data for name generation");
      return `Fusion-${pokemon1Id}-${pokemon2Id}`;
    }
    
    const name1 = pokemon1Data.name;
    const name2 = pokemon2Data.name;
    
    // Generate the fusion name by combining the first half of name1 with the second half of name2
    const fusionName = `${name1.substring(0, Math.floor(name1.length / 2))}${name2.substring(Math.floor(name2.length / 2))}`;
    return fusionName.charAt(0).toUpperCase() + fusionName.slice(1);
  } catch (error) {
    console.error("Generate API - Error generating fusion name:", error);
    return `Fusion-${pokemon1Id}-${pokemon2Id}`;
  }
}

// Helper function to generate a fusion image
async function generateFusionImage(pokemon1Id: number, pokemon2Id: number): Promise<string | null> {
  try {
    // Get the Pokemon images from the database or API
    const pokemon1Data = await getPokemonData(pokemon1Id);
    const pokemon2Data = await getPokemonData(pokemon2Id);
    
    if (!pokemon1Data || !pokemon2Data) {
      console.error("Generate API - Failed to get Pokemon data for image generation");
      return null;
    }
    
    const pokemon1Image = pokemon1Data.image_url;
    const pokemon2Image = pokemon2Data.image_url;
    
    // Check if we should use the Replicate API or local fallback
    const replicateToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    const isReplicateConfigured = !!replicateToken;
    
    console.log("Generate API - Replicate token available:", !!replicateToken);
    console.log("Generate API - Replicate token length:", replicateToken ? replicateToken.length : 0);
    
    if (isReplicateConfigured) {
      try {
        console.log("Generate API - Using Replicate API for fusion generation");
        console.log("Generate API - Pokemon 1 image URL:", pokemon1Image);
        console.log("Generate API - Pokemon 2 image URL:", pokemon2Image);
        
        // Initialize Replicate with the token
        const replicateInstance = new Replicate({
          auth: replicateToken,
        });
        
        // Verify the images are accessible
        try {
          const response1 = await fetch(pokemon1Image);
          const response2 = await fetch(pokemon2Image);
          
          if (!response1.ok || !response2.ok) {
            console.error("Generate API - One or more Pokemon images are not accessible");
            console.log("Generate API - Pokemon 1 image status:", response1.status);
            console.log("Generate API - Pokemon 2 image status:", response2.status);
            return pokemon1Image; // Fallback to first Pokemon image
          }
        } catch (fetchError) {
          console.error("Generate API - Error fetching Pokemon images:", fetchError);
          return pokemon1Image; // Fallback to first Pokemon image
        }
        
        // Call the Replicate API to generate the fusion image
        console.log("Generate API - Calling Replicate with model: fofr/image-merger");
        
        const modelVersion = "db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867";
        
        // Create a prediction
        const prediction = await replicateInstance.predictions.create({
          version: modelVersion,
          input: {
            image_1: pokemon1Image,
            image_2: pokemon2Image,
            merge_mode: "left_right",
            upscale_2x: true,
            prompt: "a pokemon, digital art, sharp, solid color, thick outline",
            negative_prompt: "garish, soft, ugly, broken, distorted"
          },
        });
        
        console.log("Generate API - Prediction created:", prediction.id);
        
        // Wait for the prediction to complete
        let completedPrediction = await replicateInstance.predictions.get(prediction.id);
        
        // Poll until the prediction is complete
        while (
          completedPrediction.status !== "succeeded" && 
          completedPrediction.status !== "failed" &&
          completedPrediction.status !== "canceled"
        ) {
          console.log("Generate API - Waiting for prediction to complete. Current status:", completedPrediction.status);
          
          // Wait for 1 second before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the updated prediction
          completedPrediction = await replicateInstance.predictions.get(prediction.id);
        }
        
        console.log("Generate API - Prediction completed with status:", completedPrediction.status);
        
        if (completedPrediction.status !== "succeeded") {
          console.error("Generate API - Prediction failed:", completedPrediction.error);
          return pokemon1Image; // Fallback to first Pokemon image
        }
        
        // Get the output from the prediction
        const output = completedPrediction.output;
        console.log("Generate API - Prediction output:", output);
        
        // Get the generated image URL - the output could be an array or a string
        let fusionImageUrl;
        if (Array.isArray(output)) {
          fusionImageUrl = output[0];
        } else if (typeof output === 'string') {
          fusionImageUrl = output;
        } else if (output && typeof output === 'object') {
          // If it's an object, try to find a URL property
          const possibleUrls = Object.values(output).filter(val => 
            typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))
          );
          fusionImageUrl = possibleUrls.length > 0 ? possibleUrls[0] : null;
        }
        
        if (!fusionImageUrl) {
          console.error("Generate API - No image URL in Replicate response:", output);
          return pokemon1Image; // Fallback to first Pokemon image
        }
        
        console.log("Generate API - Fusion image URL:", fusionImageUrl);
        
        // Generate a unique filename for the fusion image
        const fusionId = uuidv4();
        const filename = `fusion_${pokemon1Id}_${pokemon2Id}_${fusionId}.png`;
        
        // Upload the image to Supabase Storage
        const storedImageUrl = await uploadImageFromUrl(
          fusionImageUrl,
          'fusions',
          filename
        );
        
        console.log("Generate API - Stored image URL:", storedImageUrl);
        
        // Return the stored image URL or fall back to the original URL
        return storedImageUrl || fusionImageUrl;
      } catch (error) {
        console.error("Generate API - Error calling Replicate API:", error);
        console.log("Generate API - Falling back to local fusion generation");
        return pokemon1Image; // Use the first Pokemon image as a fallback
      }
    } else {
      console.log("Generate API - Replicate API not configured, using local fallback");
      return pokemon1Image; // Use the first Pokemon image as a fallback
    }
  } catch (error) {
    console.error("Generate API - Error generating fusion image:", error);
    return null;
  }
}

// Helper function to save a fusion to the database
async function saveFusionToDatabase(
  pokemon1Id: number,
  pokemon2Id: number,
  fusionName: string,
  fusionImage: string,
  userId: string
): Promise<string | null> {
  try {
    // Generate a unique ID for the fusion
    const fusionId = uuidv4();
    
    // Save the fusion to Supabase
    console.log("Generate API - Saving fusion to database with user ID:", userId);
    
    const { data: fusion, error } = await supabaseClient
      .from("fusions")
      .insert({
        id: fusionId,
        user_id: userId,
        pokemon_1_id: pokemon1Id,
        pokemon_2_id: pokemon2Id,
        fusion_name: fusionName,
        fusion_image: fusionImage,
        likes: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error("Generate API - Error saving fusion to database:", error);
      return null;
    }
    
    console.log("Generate API - Fusion saved successfully with ID:", fusionId);
    return fusionId;
  } catch (error) {
    console.error("Generate API - Error saving fusion to database:", error);
    return null;
  }
}

// Helper function to get Pokemon data
async function getPokemonData(pokemonId: number): Promise<any | null> {
  try {
    // First, try to get the Pokemon from the database
    const { data: pokemon, error } = await supabaseClient
      .from("pokemon")
      .select("*")
      .eq("id", pokemonId)
      .single();
    
    if (error || !pokemon) {
      console.log(`Generate API - Pokemon ${pokemonId} not found in database, fetching from API`);
      
      // If not in the database, fetch from the PokeAPI
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      
      if (!response.ok) {
        console.error(`Generate API - Failed to fetch Pokemon ${pokemonId} from API:`, response.statusText);
        return null;
      }
      
      const pokemonData = await response.json();
      
      // Extract the relevant data
      const newPokemon = {
        id: pokemonId,
        name: pokemonData.name,
        image_url: pokemonData.sprites.other["official-artwork"].front_default,
        type: pokemonData.types.map((t: any) => t.type.name)
      };
      
      // Save the Pokemon to the database for future use
      const { error: saveError } = await supabaseClient
        .from("pokemon")
        .insert(newPokemon);
      
      if (saveError) {
        console.error(`Generate API - Error saving Pokemon ${pokemonId} to database:`, saveError);
      }
      
      return newPokemon;
    }
    
    return pokemon;
  } catch (error) {
    console.error(`Generate API - Error getting Pokemon ${pokemonId} data:`, error);
    return null;
  }
} 