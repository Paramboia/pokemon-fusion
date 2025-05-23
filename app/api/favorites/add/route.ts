import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Add Favorite API - Supabase URL:', supabaseUrl);
console.log('Add Favorite API - Service Key available:', !!supabaseServiceKey);

// Helper function to get or create a Supabase user from Clerk user
async function getOrCreateSupabaseUser(clerkUserId: string) {
  try {
    console.log('Add Favorite API - Looking up Supabase user for Clerk ID:', clerkUserId);
    
    // Get Supabase client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Add Favorite API - Failed to get Supabase admin client');
      return null;
    }
    
    // First, try to find the user directly by Clerk ID
    const { data: userByClerkId, error: clerkIdError } = await supabase
      .from('users')
      .select('id')
      .eq('id', clerkUserId)
      .maybeSingle();
    
    if (userByClerkId) {
      console.log('Add Favorite API - Found Supabase user by Clerk ID:', userByClerkId.id);
      return userByClerkId.id;
    }
    
    // If not found by Clerk ID, try to find by email
    const user = await currentUser();
    console.log('Add Favorite API - Clerk user found:', user ? 'Yes' : 'No');
    
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      console.log('Add Favorite API - No email addresses found for user');
      return null;
    }
    
    // Get the primary email
    const primaryEmailObj = user.emailAddresses[0];
    const email = primaryEmailObj.emailAddress;
    console.log('Add Favorite API - Using email for lookup:', email);
    
    // Query Supabase for the user ID by email
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userByEmail) {
      console.log('Add Favorite API - Found Supabase user by email:', userByEmail.id);
      return userByEmail.id;
    }
    
    // If user not found, create a new user in Supabase
    console.log('Add Favorite API - User not found, creating new user');
    
    // Get user details from Clerk
    const name = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim() 
      : 'Anonymous User';
    
    // Insert the user into Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: clerkUserId, // Use Clerk ID as the Supabase user ID
        name,
        email
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Add Favorite API - Error creating user in Supabase:', insertError);
      return null;
    }
    
    if (newUser) {
      console.log('Add Favorite API - Created new user in Supabase:', newUser.id);
      return newUser.id;
    }
    
    console.log('Add Favorite API - Failed to create or find user in Supabase');
    return null;
  } catch (error) {
    console.error('Add Favorite API - Error in getOrCreateSupabaseUser:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    const { userId, fusionId } = body;
    
    // Verify the request is authenticated
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
      console.log('Add Favorite API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // If no userId or fusionId is provided, return an error
    if (!fusionId) {
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }
    
    // For security, ensure the requested userId matches the authenticated user
    if (userId && userId !== clerkUserId) {
      console.warn('Add Favorite API - User attempted to add a favorite for a different user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Use the authenticated user ID
    const userIdToUse = userId || clerkUserId;
    console.log('Add Favorite API - Adding favorite for user:', userIdToUse, 'fusion:', fusionId);
    
    // Get or create the Supabase user
    const supabaseUserId = await getOrCreateSupabaseUser(userIdToUse);
    if (!supabaseUserId) {
      console.error('Add Favorite API - Failed to get or create Supabase user');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }
    
    console.log('Add Favorite API - Using Supabase user ID:', supabaseUserId);
    
    // Get Supabase client
    const supabase = await getSupabaseAdminClient();
    if (!supabase) {
      console.error('Add Favorite API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }
    
    // Check if the favorite already exists
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('fusion_id', fusionId)
      .single();
    
    if (existingFavorite) {
      console.log('Add Favorite API - Favorite already exists');
      return NextResponse.json({ success: true });
    }
    
    // Add the favorite
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: supabaseUserId,
        fusion_id: fusionId
      });
    
    if (error) {
      console.error('Add Favorite API - Error adding favorite:', error);
      return NextResponse.json(
        { error: 'Error adding favorite' },
        { status: 500 }
      );
    }
    
    console.log('Add Favorite API - Favorite added successfully');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add Favorite API - Error in add favorite API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 