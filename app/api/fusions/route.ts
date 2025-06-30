import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';



export async function GET(req: Request) {
  try {
    // Get the URL and extract the userId query parameter
    const url = new URL(req.url);
    const clerkUserId = url.searchParams.get('userId');
    const sortParam = url.searchParams.get('sort') || 'newest'; // Default to newest
    console.log('Fusions API - GET request with userId:', clerkUserId, 'sort:', sortParam);

    // Verify the request is authenticated
    const session = await auth();
    const authClerkUserId = session?.userId;
    console.log('Fusions API - Authenticated userId from auth():', authClerkUserId);

    // Check for authorization header as fallback
    let finalUserId = authClerkUserId;
    
    if (!finalUserId) {
      console.log('Fusions API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Fusions API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Fusions API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Fusions API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Fusions API - Verified token, userId:', verifiedToken.sub);
            finalUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Fusions API - Error verifying token:', tokenError);
        }
      }
    }

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalUserId) {
      console.log('Fusions API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // If the requested userId doesn't match the authenticated user, return an error
    if (clerkUserId && clerkUserId !== finalUserId) {
      console.warn('Fusions API - User requested fusions for a different user ID');
      console.warn('  Requested:', clerkUserId);
      console.warn('  Authenticated:', finalUserId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Use the authenticated user ID if no specific userId was requested
    const userIdToUse = clerkUserId || finalUserId;
    console.log('Fusions API - Using userId for lookup:', userIdToUse);

    // Get the corresponding Supabase user ID using the reliable function
    const supabaseUserId = await getSupabaseUserIdFromClerk(userIdToUse);
    console.log('Fusions API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Fusions API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }
    
    console.log('Fusions API - Fetching fusions for user:', supabaseUserId);
    
    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Fusions API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Query the fusions table for this user
    let query = supabaseClient
      .from('fusions')
      .select('*')
      .eq('user_id', supabaseUserId);

    // Apply sorting based on the sort parameter
    switch (sortParam) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most_likes':
        query = query.order('likes', { ascending: false, nullsFirst: false });
        break;
      case 'less_likes':
        query = query.order('likes', { ascending: true, nullsFirst: true });
        break;
      default:
        // Default to newest first
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: fusionsData, error: fusionsError } = await query;

    if (fusionsError) {
      console.error('Fusions API - Error fetching fusions:', fusionsError.message);
      return NextResponse.json(
        { error: 'Failed to fetch fusions' },
        { status: 500 }
      );
    }

    console.log('Fusions API - Fetched fusions count:', fusionsData?.length || 0);

    // Transform the data to a more usable format
    const fusions = fusionsData?.map(item => ({
      id: item.id,
      pokemon1Name: item.pokemon_1_name,
      pokemon2Name: item.pokemon_2_name,
      fusionName: item.fusion_name,
      fusionImage: item.fusion_image,
      createdAt: item.created_at,
      likes: item.likes || 0,
      isLocalFallback: false
    })) || [];

    return NextResponse.json({ fusions });
  } catch (error) {
    console.error('Fusions API - Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 