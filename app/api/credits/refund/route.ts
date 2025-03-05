import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase-server';

// Cost in credits for generating a fusion (to be refunded)
const FUSION_COST = 1;

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { description = 'Refund for failed fusion generation' } = body;

    // Add the credits back to the user's account
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('add_credits', {
      user_id: userId,
      credits_to_add: FUSION_COST,
      transaction_type: 'refund',
      description
    });

    if (error) {
      console.error('Error refunding credits:', error);
      return NextResponse.json(
        { error: 'Failed to refund credits' },
        { status: 500 }
      );
    }

    // Get the updated balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (balanceError) {
      console.error('Error fetching updated balance:', balanceError);
    }

    return NextResponse.json({ 
      success: true, 
      balance: balanceData?.credits_balance || 0 
    });
  } catch (error) {
    console.error('Error refunding credits:', error);
    return NextResponse.json(
      { error: 'Failed to refund credits' },
      { status: 500 }
    );
  }
} 