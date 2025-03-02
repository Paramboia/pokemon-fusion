import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addFavorite, removeFavorite } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs';

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

export async function POST(req: Request) {
  try {
    // Get the current user ID from Clerk
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
    const success = await addFavorite(userId, fusionId);

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
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
    const success = await removeFavorite(userId, fusionId);

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
    const userId = url.searchParams.get('userId');
    
    // Verify the request is authenticated
    const { userId: clerkUserId } = auth();
    
    // If no userId is provided or it doesn't match the authenticated user, return an error
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }
    
    // For security, ensure the requested userId matches the authenticated user
    if (clerkUserId && userId !== clerkUserId) {
      console.warn('Favorites API - User requested favorites for a different user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    console.log('Favorites API - Fetching favorites for user:', userId);
    
    // Get the user's email from Clerk
    const user = await currentUser();
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      console.error('Favorites API - No email found for user');
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 404 }
      );
    }
    
    const email = user.emailAddresses[0].emailAddress;
    console.log('Favorites API - User email:', email);
    
    // Find the Supabase user ID from the email
    const { data: supabaseUser, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.error('Favorites API - Error finding user in Supabase:', userError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const supabaseUserId = supabaseUser.id;
    console.log('Favorites API - Found Supabase user ID:', supabaseUserId);
    
    // Get the favorite fusion IDs
    const { data: favoriteIds, error: favoritesError } = await supabaseClient
      .from('favorites')
      .select('fusion_id')
      .eq('user_id', supabaseUserId);
    
    if (favoritesError) {
      console.error('Favorites API - Error fetching user favorites:', favoritesError);
      return NextResponse.json(
        { error: 'Error fetching favorites' },
        { status: 500 }
      );
    }
    
    console.log(`Favorites API - Found ${favoriteIds?.length || 0} favorite IDs`);
    
    if (!favoriteIds || favoriteIds.length === 0) {
      return NextResponse.json({ favorites: [] });
    }
    
    const fusionIds = favoriteIds.map(fav => fav.fusion_id);
    console.log('Favorites API - Fetching fusions with IDs:', fusionIds);
    
    // Then, get the actual fusion data
    const { data: fusions, error: fusionsError } = await supabaseClient
      .from('fusions')
      .select('*')
      .in('id', fusionIds);
    
    if (fusionsError) {
      console.error('Favorites API - Error fetching favorite fusions:', fusionsError);
      return NextResponse.json(
        { error: 'Error fetching fusion details' },
        { status: 500 }
      );
    }
    
    console.log(`Favorites API - Fetched ${fusions?.length || 0} favorite fusions`);
    
    return NextResponse.json({ favorites: fusions || [] });
  } catch (error) {
    console.error('Favorites API - Error in favorites API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 