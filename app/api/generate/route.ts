import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { auth, currentUser } from '@clerk/nextjs/server';
import { savePokemon, saveFusion } from '@/lib/supabase-server-actions';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs';

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
    console.log('Generate API - Looking up Supabase user for Clerk ID:', clerkId);
    
    // First, try to find the user by email
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    
    if (email) {
      console.log('Generate API - Looking up Supabase user by email:', email);
      const { data: userByEmail, error: emailError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (emailError) {
        console.log('Generate API - Error finding user by email:', emailError.message);
      } else if (userByEmail) {
        console.log('Generate API - Found Supabase user by email:', userByEmail.id);
        return userByEmail.id;
      }
    }
    
    // If we couldn't find by email, create a new user
    if (user) {
      console.log('Generate API - Creating new Supabase user for Clerk user');
      
      const name = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.lastName || 'Anonymous User';
      
      if (email) {
        // Insert the user into Supabase
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.log('Generate API - Error creating Supabase user:', insertError.message);
          return null;
        }
        
        console.log('Generate API - Created new Supabase user:', newUser.id);
        return newUser.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Generate API - Error in getSupabaseUserId:', error);
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
    
    console.log('Generate API - Clerk userId:', clerkUserId);
    
    // Check for authorization header as fallback
    if (!clerkUserId) {
      console.log('Generate API - No Clerk userId found, checking Authorization header');
      
      // Get the authorization header
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Generate API - No valid Authorization header found, returning 401');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      
      try {
        // Verify the token with Clerk
        const verifiedToken = await clerkClient.verifyToken(token);
        
        if (verifiedToken && verifiedToken.sub) {
          console.log('Generate API - Verified token, userId:', verifiedToken.sub);
          
          // Get the corresponding Supabase user ID
          const supabaseUserId = await getSupabaseUserId(verifiedToken.sub);
          
          if (supabaseUserId) {
            console.log('Generate API - Found Supabase user ID from token:', supabaseUserId);
            return handleFusionGeneration(req, supabaseUserId);
          }
        }
      } catch (tokenError) {
        console.error('Generate API - Error verifying token:', tokenError);
      }
      
      console.log('Generate API - Invalid or expired token, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
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
    console.error('Generate API - Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to handle the fusion generation process
async function handleFusionGeneration(req: Request, userId: string) {
  try {
    // Check if the API token is defined
    const isReplicateConfigured = !!(process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN);
    
    if (!isReplicateConfigured) {
      console.warn('Generate API - Replicate API token is not defined, using local fallback');
    }

    // Parse the request body
    const body = await req.json();
    const { pokemon1, pokemon2, name1, name2, pokemon1Id, pokemon2Id } = body;

    // Validate the request parameters
    if (!pokemon1 || !pokemon2 || !name1 || !name2 || !pokemon1Id || !pokemon2Id) {
      console.error('Generate API - Missing required parameters:', { 
        pokemon1: !!pokemon1, 
        pokemon2: !!pokemon2, 
        name1: !!name1, 
        name2: !!name2,
        pokemon1Id: !!pokemon1Id,
        pokemon2Id: !!pokemon2Id
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
    await Promise.all([
      savePokemon({
        id: pokemon1Id,
        name: name1,
        image_url: pokemon1,
        type: [] // You would need to fetch this from the PokeAPI
      }),
      savePokemon({
        id: pokemon2Id,
        name: name2,
        image_url: pokemon2,
        type: [] // You would need to fetch this from the PokeAPI
      })
    ]);
    console.log('Generate API - Pokemon data saved successfully');

    let fusionImageUrl: string;
    let isLocalFallback = false;
    
    if (isReplicateConfigured) {
      console.log('Generate API - Using API token:', process.env.REPLICATE_API_TOKEN ? 'Server-side token' : 'Public token');

      // Define the model input
      const modelInput = {
        image_1: pokemon1,
        image_2: pokemon2,
        image_1_strength: 1,
        image_2_strength: 1,
        prompt: `a clean fusion of ${name1} and ${name2}, official pokemon artwork style, white background, no shadows, clean vector art, game freak style, ken sugimori style, official pokemon illustration, simple, minimalist, flat colors`,
        negative_prompt: "garish, soft, ugly, broken, distorted, deformed, noisy, blurry, background, texture, shadows, realistic, 3d, complex, detailed background",
        merge_mode: "full", // Options: "full", "left_right", "top_bottom"
        width: 768,
        height: 768,
        steps: 20,
        upscale_2x: true,
        upscale_steps: 20,
      };

      console.log('Generate API - Calling Replicate API with model:', "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867");

      try {
        // Call the Replicate API
        const output = await replicate.run(
          "fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867",
          { input: modelInput }
        );

        console.log('Generate API - Replicate API response:', output);

        // Validate the output
        if (!output || !Array.isArray(output) || output.length === 0) {
          console.error('Generate API - Invalid output from Replicate:', output);
          return NextResponse.json(
            { error: 'Failed to generate fusion image' },
            { status: 500 }
          );
        }

        fusionImageUrl = output[0];
      } catch (error: any) {
        // Check for payment required error
        if (error.response && error.response.status === 402) {
          console.error('Generate API - Payment required for Replicate API');
          return NextResponse.json(
            { 
              error: 'This feature requires a paid Replicate account. Please set up billing at https://replicate.com/account/billing',
              paymentRequired: true
            },
            { status: 402 }
          );
        }
        
        // Re-throw for general error handling
        throw error;
      }
    } else {
      // Use local fallback if Replicate is not configured
      fusionImageUrl = generateLocalFusion(pokemon1, pokemon2, name1, name2);
      isLocalFallback = true;
    }

    // Generate a fusion name by combining the two Pokemon names
    const fusionName = `${name1.slice(0, Math.ceil(name1.length / 2))}${name2.slice(Math.floor(name2.length / 2))}`;
    
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

    console.log('Generate API - Fusion saved successfully with ID:', fusionId);

    // Return the generated fusion
    return NextResponse.json({ 
      url: fusionImageUrl, 
      id: fusionId,
      name: fusionName,
      isLocalFallback
    });
  } catch (error) {
    // Log the error
    console.error('Generate API - Error in handleFusionGeneration:', error instanceof Error ? error.message : 'Unknown error', error);
    
    // Return an error response
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate fusion' },
      { status: 500 }
    );
  }
} 