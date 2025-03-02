import { NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { addFavorite, removeFavorite } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Favorites API - Supabase URL:', supabaseUrl);
console.log('Favorites API - Service Key available:', !!supabaseServiceKey);

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

// Helper function to get the Supabase user ID from Clerk ID
async function getSupabaseUserId(clerkId: string): Promise<string | null> {
  try {
    console.log('Favorites API - Looking up Supabase user for Clerk ID:', clerkId);
    
    // Get the user's email from Clerk
    const user = await clerkClient.users.getUser(clerkId);
    console.log('Favorites API - Clerk user found:', user ? 'Yes' : 'No');
    
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      console.log('Favorites API - No email addresses found for user');
      return null;
    }
    
    // Get the primary email
    const primaryEmailObj = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId) || user.emailAddresses[0];
    const email = primaryEmailObj.emailAddress;
    console.log('Favorites API - Using email for lookup:', email);
    
    // Query Supabase for the user ID
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Favorites API - Supabase query error:', error.message);
      return null;
    }
    
    if (data) {
      console.log('Favorites API - Found Supabase user by email:', data.id);
      return data.id;
    }
    
    console.log('Favorites API - No matching user found in Supabase');
    return null;
  } catch (error) {
    console.error('Favorites API - Error in getSupabaseUserId:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const { userId: clerkUserId } = auth();
    console.log('Favorites API - POST request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database');
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }

    // Get the fusion ID from the request body
    const { fusionId } = await req.json();
    console.log('Favorites API - Adding fusion to favorites:', fusionId);

    // Validate the request parameters
    if (!fusionId) {
      console.log('Favorites API - Missing fusion ID in request body');
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Ensure the favorites table exists before adding
    try {
      console.log('Favorites API - Ensuring favorites table exists');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS favorites (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id TEXT NOT NULL,
          fusion_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, fusion_id)
        );
      `;
      
      const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
      if (createTableError) {
        console.log('Favorites API - Error creating favorites table (may already exist):', createTableError);
      } else {
        console.log('Favorites API - Favorites table created or already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table creation (may not have permission):', tableError);
      // Continue anyway, as the table might already exist
    }

    // Add the fusion to favorites
    const success = await addFavorite(supabaseUserId, fusionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add to favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return NextResponse.json(
      { error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const { userId: clerkUserId } = auth();
    console.log('Favorites API - DELETE request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database');
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }

    // Get the fusion ID from the URL
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');
    console.log('Favorites API - Removing fusion from favorites:', fusionId);

    // Validate the request parameters
    if (!fusionId) {
      console.log('Favorites API - Missing fusion ID parameter');
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Ensure the favorites table exists before deleting
    try {
      console.log('Favorites API - Ensuring favorites table exists');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS favorites (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id TEXT NOT NULL,
          fusion_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, fusion_id)
        );
      `;
      
      const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
      if (createTableError) {
        console.log('Favorites API - Error creating favorites table (may already exist):', createTableError);
      } else {
        console.log('Favorites API - Favorites table created or already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table creation (may not have permission):', tableError);
      // Continue anyway, as the table might already exist
    }

    // Remove the fusion from favorites
    const success = await removeFavorite(supabaseUserId, fusionId);
    console.log('Favorites API - Remove result:', success ? 'Success' : 'Failed');

    if (!success) {
      console.log('Favorites API - Failed to remove from favorites');
      return NextResponse.json(
        { error: 'Failed to remove from favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorites API - Error in DELETE handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Get the URL and extract the userId query parameter
    const url = new URL(req.url);
    const clerkUserId = url.searchParams.get('userId');
    console.log('Favorites API - GET request with userId:', clerkUserId);

    // Verify the request is authenticated
    const { userId: authClerkUserId } = auth();
    console.log('Favorites API - Authenticated userId from auth():', authClerkUserId);

    // If no userId is provided or it doesn't match the authenticated user, return an error
    if (!clerkUserId) {
      console.log('Favorites API - Missing userId parameter');
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // For security, ensure the requested userId matches the authenticated user
    if (authClerkUserId && clerkUserId !== authClerkUserId) {
      console.warn('Favorites API - User requested favorites for a different user ID');
      console.warn('  Requested:', clerkUserId);
      console.warn('  Authenticated:', authClerkUserId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database');
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    console.log('Favorites API - Fetching favorites for user:', supabaseUserId);

    // Ensure the favorites table exists before querying
    try {
      console.log('Favorites API - Ensuring favorites table exists');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS favorites (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id TEXT NOT NULL,
          fusion_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, fusion_id)
        );
      `;
      
      const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
      if (createTableError) {
        console.log('Favorites API - Error creating favorites table (may already exist):', createTableError);
      } else {
        console.log('Favorites API - Favorites table created or already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table creation (may not have permission):', tableError);
      // Continue anyway, as the table might already exist
    }

    // Query the favorites table for this user
    const { data, error } = await supabaseClient
      .from('favorites')
      .select(`
        fusion_id,
        fusions (
          id,
          pokemon_1_id,
          pokemon_2_id,
          fusion_name,
          fusion_image,
          created_at
        )
      `)
      .eq('user_id', supabaseUserId);

    if (error) {
      console.error('Favorites API - Error fetching favorites:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    console.log('Favorites API - Fetched favorites count:', data?.length || 0);

    // Transform the data to a more usable format
    const favorites = data?.map(item => item.fusions) || [];

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites API - Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 