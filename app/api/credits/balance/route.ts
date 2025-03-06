import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: clerkUserId } = auth();
    
    // If no authenticated user, return early
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Supabase admin client
    const supabaseAdmin = await getSupabaseAdminClient();
    
    // Get user's balance from the database
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('credits_balance')
      .eq('clerk_id', clerkUserId)
      .single();

    if (dbError) {
      console.error('Credits Balance API - Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Return the balance (or 0 if not found)
    return NextResponse.json({ 
      balance: userData?.credits_balance || 0 
    });

  } catch (error) {
    console.error('Credits Balance API - Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 