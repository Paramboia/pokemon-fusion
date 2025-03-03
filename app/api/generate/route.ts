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
  try {
    console.log("Generate API - POST request received");
    
    // Get the authenticated user
    const { userId: clerkUserId } = auth();
    const finalUserId = clerkUserId;
    
    console.log("Generate API - Auth check result:", finalUserId ? "Authenticated" : "Not authenticated");
    
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
      
      // Check if Replicate API token is available
      const replicateToken = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
      console.log("Generate API - Replicate token available:", !!replicateToken);
      
      let fusionImageUrl = null;
      let isLocalFallback = false;
      
      // Try to generate the fusion image with Replicate if token is available
      if (replicateToken) {
        try {
          console.log("Generate API - Attempting to use Replicate for fusion generation");
          
          // Initialize Replicate with the token
          const replicateInstance = new Replicate({
            auth: replicateToken,
          });
          
          // Try SDXL model first
          try {
            console.log("Generate API - Trying SDXL model");
            
            const output = await replicateInstance.run(
              "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
              {
                input: {
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
                }
              }
            );
            
            console.log("Generate API - SDXL output received:", !!output);
            
            if (Array.isArray(output) && output.length > 0) {
              fusionImageUrl = output[0];
            } else if (typeof output === 'string') {
              fusionImageUrl = output;
            }
          } catch (sdxlError) {
            console.error("Generate API - SDXL model error:", sdxlError);
          }
          
          // If SDXL failed, try the image-merger model
          if (!fusionImageUrl) {
            console.log("Generate API - SDXL failed, trying image-merger model");
            
            try {
              const output = await replicateInstance.run(
                "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
                {
                  input: {
                    image_1: pokemon1,
                    image_2: pokemon2,
                    merge_mode: "left_right",
                    upscale_2x: true,
                    prompt: "a pokemon, digital art, sharp, solid color, thick outline",
                    negative_prompt: "garish, soft, ugly, broken, distorted"
                  }
                }
              );
              
              console.log("Generate API - Image-merger output received:", !!output);
              
              if (Array.isArray(output) && output.length > 0) {
                fusionImageUrl = output[0];
              } else if (typeof output === 'string') {
                fusionImageUrl = output;
              }
            } catch (mergerError) {
              console.error("Generate API - Image-merger model error:", mergerError);
            }
          }
        } catch (replicateError) {
          console.error("Generate API - Replicate API error:", replicateError);
        }
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