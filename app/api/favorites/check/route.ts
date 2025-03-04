import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

// Helper function to get the Supabase user ID from Clerk ID
async function getSupabaseUserId(clerkId: string): Promise<string | null> {
  return getSupabaseUserIdFromClerk(clerkId);
}

export async function GET(req: Request) {
  try {
    console.log('Favorites Check API - GET request received');
    
    // Get the fusion ID from the query parameters
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');
    
    if (!fusionId) {
      console.error('Favorites Check API - No fusion ID provided');
      return NextResponse.json({ error: 'Fusion ID is required' }, { status: 400 });
    }
    
    console.log('Favorites Check API - Checking favorite status for fusion:', fusionId);
    
    // Get the user ID from the auth session
    const { userId } = auth();
    
    if (!userId) {
      console.error('Favorites Check API - No user ID found in session');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Favorites Check API - User ID from Clerk:', userId);
    
    // Get the Supabase user ID
    const supabaseUserId = await getSupabaseUserId(userId);
    
    if (!supabaseUserId) {
      console.error('Favorites Check API - Failed to get Supabase user ID');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('Favorites Check API - Supabase user ID:', supabaseUserId);
    
    // Check if the fusion is a favorite for this user
    const supabaseClient = await getSupabaseAdminClient();
    const { data, error } = await supabaseClient
      .from('favorites')
      .select('id')
      .eq('user_id', supabaseUserId)
      .eq('fusion_id', fusionId)
      .maybeSingle();
    
    if (error) {
      console.error('Favorites Check API - Error checking favorite status:', error);
      return NextResponse.json({ error: 'Failed to check favorite status' }, { status: 500 });
    }
    
    const isLiked = !!data;
    console.log('Favorites Check API - Is fusion liked:', isLiked);
    
    return NextResponse.json({ isLiked });
  } catch (error) {
    console.error('Favorites Check API - Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 