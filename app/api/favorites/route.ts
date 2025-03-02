import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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
    
    // First, try to find the user by email
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    
    if (email) {
      console.log('Favorites API - Looking up Supabase user by email:', email);
      const { data: userByEmail, error: emailError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (emailError) {
        console.log('Favorites API - Error finding user by email:', emailError.message);
      } else if (userByEmail) {
        console.log('Favorites API - Found Supabase user by email:', userByEmail.id);
        return userByEmail.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Favorites API - Error in getSupabaseUserId:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Get the current user ID from Clerk
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { fusionId } = body;

    // Validate the request parameters
    if (!fusionId) {
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
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
    // Get the current user ID from Clerk
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }

    // Get the fusion ID from the URL
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');

    // Validate the request parameters
    if (!fusionId) {
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Remove the fusion from favorites
    const success = await removeFavorite(supabaseUserId, fusionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove from favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Get the URL and extract the userId query parameter
    const url = new URL(req.url);
    const clerkUserId = url.searchParams.get('userId');
    
    // Verify the request is authenticated
    const { userId: authClerkUserId } = auth();
    
    // If no userId is provided or it doesn't match the authenticated user, return an error
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    // For security, ensure the requested userId matches the authenticated user
    if (authClerkUserId && clerkUserId !== authClerkUserId) {
      console.warn('Favorites API - User requested favorites for a different user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    console.log('Favorites API - Fetching favorites for user:', supabaseUserId);
    
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
          likes,
          created_at
        )
      `)
      .eq('user_id', supabaseUserId);
    
    if (error) {
      console.error('Favorites API - Error fetching favorites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }
    
    // Transform the data to a more convenient format
    const favorites = data.map(item => ({
      id: item.fusion_id,
      ...item.fusions
    }));
    
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites API - Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
} 