import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { savePokemon, saveFusion } from '@/lib/supabase-server-actions';
import { v4 as uuidv4 } from 'uuid';
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

// Initialize Replicate with the API token
// Prefer the server-side environment variable
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
    // Get the current user ID from Clerk
    const { userId: clerkUserId } = auth();
    console.log('Generate API - Clerk userId from auth():', clerkUserId);

    // Variable to store the final user ID we'll use
    let finalUserId: string | null = null;

    // First try to get the user from the auth() function
    if (clerkUserId) {
      console.log('Generate API - Using Clerk userId from auth()');
      finalUserId = clerkUserId;
    } else {
      // If no user from auth(), check the Authorization header
      console.log('Generate API - No Clerk userId found from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Generate API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Generate API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Generate API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Generate API - Verified token, userId:', verifiedToken.sub);
            finalUserId = verifiedToken.sub;
          } else {
            console.log('Generate API - Token verification failed or no sub claim');
          }
        } catch (tokenError) {
          console.error('Generate API - Error verifying token:', tokenError);
        }
      } else {
        console.log('Generate API - No valid Authorization header found');
      }
    }

    // If we still don't have a user ID, return 401
    if (!finalUserId) {
      console.log('Generate API - No user ID found from any source, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(finalUserId);
    console.log('Generate API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Generate API - No Supabase user found for Clerk ID, returning 401');
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }

    // Process the fusion generation
    return handleFusionGeneration(req, supabaseUserId);
  } catch (error) {
    console.error('Generate API - Unexpected error in POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to handle the fusion generation process
async function handleFusionGeneration(req: Request, userId: string) {
  try {
    console.log('handleFusionGeneration - Starting with userId:', userId);

    // Parse the request body
    const body = await req.json();
    const { pokemon1, pokemon2, name1, name2, pokemon1Id, pokemon2Id } = body;

    // Validate the request parameters
    if (!pokemon1 || !pokemon2 || !name1 || !name2 || !pokemon1Id || !pokemon2Id) {
      console.error('Generate API - Missing required parameters:', {
        hasPokemon1: !!pokemon1,
        hasPokemon2: !!pokemon2,
        hasName1: !!name1,
        hasName2: !!name2,
        hasPokemon1Id: !!pokemon1Id,
        hasPokemon2Id: !!pokemon2Id
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Generate API - Generating fusion for:', { name1, name2 });
    console.log('Generate API - Image URLs length:', {
      pokemon1Length: pokemon1.length,
      pokemon2Length: pokemon2.length
    });

    // Save Pokemon data to Supabase if they don't exist
    console.log('Generate API - Saving Pokemon data to Supabase');
    await savePokemon({
      id: pokemon1Id,
      name: name1,
      image_url: pokemon1,
      type: ['unknown']
    });

    await savePokemon({
      id: pokemon2Id,
      name: name2,
      image_url: pokemon2,
      type: ['unknown']
    });

    // Generate a fusion name
    const fusionName = `${name1.substring(0, Math.floor(name1.length / 2))}${name2.substring(Math.floor(name2.length / 2))}`;
    console.log('Generate API - Generated fusion name:', fusionName);

    // Check if we should use the Replicate API or local fallback
    const isReplicateConfigured = !!(process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN);
    let fusionImageUrl;
    let isLocalFallback = false;

    if (isReplicateConfigured) {
      try {
        console.log('Generate API - Using Replicate API for fusion generation');
        
        // Call the Replicate API to generate the fusion image
        const output = await replicate.run(
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
        
        console.log('Generate API - Replicate API response:', output);
        
        // Get the generated image URL
        fusionImageUrl = Array.isArray(output) ? output[0] : output;
        console.log('Generate API - Generated fusion image URL:', fusionImageUrl);
      } catch (error) {
        console.error('Generate API - Error calling Replicate API:', error);
        console.log('Generate API - Falling back to local fusion generation');
        fusionImageUrl = pokemon1; // Use the first Pokemon image as a fallback
        isLocalFallback = true;
      }
    } else {
      console.log('Generate API - Replicate API not configured, using local fallback');
      fusionImageUrl = pokemon1; // Use the first Pokemon image as a fallback
      isLocalFallback = true;
    }

    // Generate a unique ID for the fusion
    const fusionId = uuidv4();

    // Save the fusion to Supabase
    console.log('Generate API - Saving fusion to Supabase with user ID:', userId);

    // First, ensure the fusions table exists
    await ensureFusionsTableExists();

    // Now save the fusion
    const fusion = await saveFusion({
      id: fusionId,
      user_id: userId,
      pokemon_1_id: pokemon1Id,
      pokemon_2_id: pokemon2Id,
      fusion_name: fusionName,
      fusion_image: fusionImageUrl,
      likes: 0
    });

    if (!fusion) {
      console.error('Generate API - Failed to save fusion to Supabase');
      return NextResponse.json(
        { error: 'Failed to save fusion' },
        { status: 500 }
      );
    }

    console.log('Generate API - Fusion saved successfully:', fusion);

    // Return the fusion data
    return NextResponse.json({
      fusionId: fusion.id,
      fusionName: fusion.fusion_name,
      fusionImage: fusion.fusion_image,
      pokemon1Id: fusion.pokemon_1_id,
      pokemon2Id: fusion.pokemon_2_id,
      isLocalFallback
    });
  } catch (error) {
    console.error('Generate API - Error in handleFusionGeneration:', error);
    return NextResponse.json(
      { error: 'Failed to generate fusion' },
      { status: 500 }
    );
  }
} 