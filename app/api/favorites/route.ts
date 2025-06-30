import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { addFavorite, removeFavorite } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Favorites API - Supabase URL:', supabaseUrl);
console.log('Favorites API - Service Key available:', !!supabaseServiceKey);



export async function POST(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const session = await auth();
    const clerkUserId = session?.userId;
    console.log('Favorites API - POST request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID using the reliable function
    const supabaseUserId = await getSupabaseUserIdFromClerk(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }

    // Get the fusion ID from the request body or URL parameters
    let fusionId;
    try {
      // Try to get from body first
      const body = await req.json().catch(() => ({}));
      fusionId = body.fusionId;
      
      // If not in body, try URL parameters
      if (!fusionId) {
        const url = new URL(req.url);
        fusionId = url.searchParams.get('fusionId');
      }
    } catch (error) {
      // If JSON parsing fails, try URL parameters
      const url = new URL(req.url);
      fusionId = url.searchParams.get('fusionId');
    }
    
    console.log('Favorites API - Adding fusion to favorites:', fusionId);

    // Validate the request parameters
    if (!fusionId) {
      console.log('Favorites API - Missing fusion ID in request');
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Ensure the favorites table exists before adding
    try {
      console.log('Favorites API - Checking if favorites table exists');
      const { data, error } = await supabaseClient
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('Favorites API - Error checking favorites table, attempting to create it:', error.message);
        
        // Create the table with the correct structure matching the schema
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT now()
          );
        `;
        
        const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
        if (createTableError) {
          console.log('Favorites API - Error creating favorites table:', createTableError);
        } else {
          console.log('Favorites API - Favorites table created successfully');
        }
      } else {
        console.log('Favorites API - Favorites table already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table check/creation:', tableError);
      // Continue anyway, as the table might already exist
    }

    // Check if the favorite already exists
    const { data: existingFavorite, error: checkError } = await supabaseClient
      .from('favorites')
      .select('id')
      .eq('user_id', supabaseUserId)
      .eq('fusion_id', fusionId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Favorites API - Error checking if favorite exists:', checkError);
    } else if (existingFavorite) {
      console.log('Favorites API - Favorite already exists, skipping insertion');
      return NextResponse.json({ success: true, message: 'Already liked' });
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
    const session = await auth();
    const clerkUserId = session?.userId;
    console.log('Favorites API - DELETE request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID using the reliable function
    const supabaseUserId = await getSupabaseUserIdFromClerk(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
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

    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Ensure the favorites table exists before deleting
    try {
      console.log('Favorites API - Checking if favorites table exists');
      const { data, error } = await supabaseClient
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('Favorites API - Error checking favorites table:', error.message);
        return NextResponse.json(
          { error: 'Failed to check favorites table' },
          { status: 500 }
        );
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table check:', tableError);
      // Continue anyway, as the table might already exist
    }

    // Check if the favorite exists before trying to remove it
    const { data: existingFavorite, error: checkError } = await supabaseClient
      .from('favorites')
      .select('id')
      .eq('user_id', supabaseUserId)
      .eq('fusion_id', fusionId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Favorites API - Error checking if favorite exists:', checkError);
    } else if (!existingFavorite) {
      console.log('Favorites API - Favorite does not exist, nothing to remove');
      return NextResponse.json({ success: true, message: 'Already unliked' });
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
    const sortParam = url.searchParams.get('sort') || 'newest'; // Default to newest
    console.log('Favorites API - GET request with userId:', clerkUserId, 'sort:', sortParam);

    // Verify the request is authenticated
    const session = await auth();
    const authClerkUserId = session?.userId;
    console.log('Favorites API - Authenticated userId from auth():', authClerkUserId);

    // If no authenticated user, return error
    if (!authClerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // If the requested userId doesn't match the authenticated user, return an error
    if (clerkUserId && clerkUserId !== authClerkUserId) {
      console.warn('Favorites API - User requested favorites for a different user ID');
      console.warn('  Requested:', clerkUserId);
      console.warn('  Authenticated:', authClerkUserId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Use the authenticated user ID if no specific userId was requested
    const userIdToUse = clerkUserId || authClerkUserId;
    console.log('Favorites API - Using userId for lookup:', userIdToUse);

    // Get the corresponding Supabase user ID using the reliable function
    const supabaseUserId = await getSupabaseUserIdFromClerk(userIdToUse);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }
    
    console.log('Favorites API - Fetching favorites for user:', supabaseUserId);
    
    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Ensure the favorites table exists before querying
    try {
      console.log('Favorites API - Checking if favorites table exists');
      const { data, error } = await supabaseClient
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('Favorites API - Error checking favorites table, attempting to create it:', error.message);
        
        // Create the table with the correct structure matching the schema
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT now()
          );
        `;
        
        const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
        if (createTableError) {
          console.log('Favorites API - Error creating favorites table:', createTableError);
        } else {
          console.log('Favorites API - Favorites table created successfully');
        }
      } else {
        console.log('Favorites API - Favorites table already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table check/creation:', tableError);
      // Continue anyway, as the table might already exist
    }

    // First, get the favorite fusion IDs for this user
    const { data: favoritesData, error: favoritesError } = await supabaseClient
      .from('favorites')
      .select('fusion_id, created_at')
      .eq('user_id', supabaseUserId)
      .order('created_at', { ascending: sortParam === 'oldest' });

    if (favoritesError) {
      console.error('Favorites API - Error fetching favorites:', favoritesError.message);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    console.log('Favorites API - Fetched favorites count:', favoritesData?.length || 0);

    if (!favoritesData || favoritesData.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    // Get the fusion IDs
    const fusionIds = favoritesData.map(fav => fav.fusion_id);

    // Now fetch the fusion details
    let fusionQuery = supabaseClient
      .from('fusions')
      .select('id, pokemon_1_name, pokemon_2_name, fusion_name, fusion_image, created_at, likes')
      .in('id', fusionIds);

    // Apply sorting for likes if needed
    if (sortParam === 'most_likes') {
      fusionQuery = fusionQuery.order('likes', { ascending: false, nullsFirst: false });
    } else if (sortParam === 'less_likes') {
      fusionQuery = fusionQuery.order('likes', { ascending: true, nullsFirst: true });
    }

    const { data: fusionsData, error: fusionsError } = await fusionQuery;

    if (fusionsError) {
      console.error('Favorites API - Error fetching fusion details:', fusionsError.message);
      return NextResponse.json(
        { error: 'Failed to fetch fusion details' },
        { status: 500 }
      );
    }

    // Transform the data to a more usable format
    const favorites = fusionsData?.map(fusion => ({
      id: fusion.id,
      pokemon1Name: fusion.pokemon_1_name,
      pokemon2Name: fusion.pokemon_2_name,
      fusionName: fusion.fusion_name,
      fusionImage: fusion.fusion_image,
      createdAt: fusion.created_at,
      likes: fusion.likes || 0,
      favoriteCreatedAt: favoritesData.find(fav => fav.fusion_id === fusion.id)?.created_at
    })) || [];

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites API - Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 