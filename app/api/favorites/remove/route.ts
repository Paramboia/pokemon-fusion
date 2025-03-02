import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Remove Favorite API - Supabase URL:', supabaseUrl);
console.log('Remove Favorite API - Service Key available:', !!supabaseServiceKey);

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
    // Parse the request body
    const body = await req.json();
    const { userId, fusionId } = body;
    
    // Verify the request is authenticated
    const { userId: clerkUserId } = auth();
    
    // If no userId or fusionId is provided, return an error
    if (!userId || !fusionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // For security, ensure the requested userId matches the authenticated user
    if (clerkUserId && userId !== clerkUserId) {
      console.warn('Remove Favorite API - User attempted to remove a favorite for a different user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    console.log('Remove Favorite API - Removing favorite for user:', userId, 'fusion:', fusionId);
    
    // Remove the favorite
    const { error } = await supabaseClient
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);
    
    if (error) {
      console.error('Remove Favorite API - Error removing favorite:', error);
      return NextResponse.json(
        { error: 'Error removing favorite' },
        { status: 500 }
      );
    }
    
    console.log('Remove Favorite API - Favorite removed successfully');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove Favorite API - Error in remove favorite API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 