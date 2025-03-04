import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

// Helper function to get the Supabase user ID from Clerk ID
async function getSupabaseUserId(clerkId: string): Promise<string | null> {
  try {
    console.log('Favorites Check API - Looking up Supabase user for Clerk ID:', clerkId);
    
    // First, try to find the user directly by Clerk ID
    const supabaseClient = await getSupabaseAdminClient();
    const { data: userByClerkId, error: clerkIdError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', clerkId)
      .maybeSingle();
    
    if (userByClerkId) {
      console.log('Favorites Check API - Found Supabase user by Clerk ID:', userByClerkId.id);
      return userByClerkId.id;
    }
    
    console.log('Favorites Check API - User not found in Supabase');
    return null;
  } catch (error) {
    console.error('Favorites Check API - Error in getSupabaseUserId:', error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const session = await auth();
    const clerkUserId = session?.userId;
    console.log('Favorites Check API - GET request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites Check API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required', isFavorite: false },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    console.log('Favorites Check API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites Check API - User not found in database');
      return NextResponse.json(
        { error: 'User not found in database', isFavorite: false },
        { status: 200 } // Return 200 with isFavorite: false instead of an error
      );
    }

    // Get the fusion ID from the URL
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');
    console.log('Favorites Check API - Checking fusion:', fusionId);

    // Validate the request parameters
    if (!fusionId) {
      console.log('Favorites Check API - Missing fusion ID parameter');
      return NextResponse.json(
        { error: 'Missing fusion ID', isFavorite: false },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites Check API - Failed to get Supabase admin client');
      return NextResponse.json(
        { error: 'Failed to get Supabase admin client', isFavorite: false },
        { status: 500 }
      );
    }

    // Check if the fusion is in the user's favorites
    const { data, error } = await supabaseClient
      .from('favorites')
      .select('id')
      .eq('user_id', supabaseUserId)
      .eq('fusion_id', fusionId)
      .maybeSingle();

    if (error) {
      console.error('Favorites Check API - Error checking favorite status:', error);
      return NextResponse.json(
        { error: 'Failed to check favorite status', isFavorite: false },
        { status: 500 }
      );
    }

    const isFavorite = !!data;
    console.log('Favorites Check API - Is fusion a favorite:', isFavorite);

    return NextResponse.json({ isFavorite });
  } catch (error) {
    console.error('Favorites Check API - Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', isFavorite: false },
      { status: 500 }
    );
  }
} 