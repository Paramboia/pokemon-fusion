import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserIdFromClerk(clerkUserId);
    if (!supabaseUserId) {
      console.error('Failed to find Supabase user ID for Clerk user:', clerkUserId);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Get the user's credit balance from Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', supabaseUserId)
      .single();

    if (error) {
      console.error('Error fetching credit balance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({ balance: data?.credits_balance || 0 });
  } catch (error) {
    console.error('Error checking credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to check credit balance' },
      { status: 500 }
    );
  }
} 