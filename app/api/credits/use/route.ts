import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase-server';

// Cost in credits for generating a fusion
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
    const { description = 'Fusion generation' } = body;

    // Use the credits
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('use_credits', {
      user_id: userId,
      credits_to_use: FUSION_COST,
      description
    });

    if (error) {
      console.error('Error using credits:', error);
      return NextResponse.json(
        { error: 'Failed to use credits' },
        { status: 500 }
      );
    }

    // If data is false, the user doesn't have enough credits
    if (data === false) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 } // 402 Payment Required
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
    console.error('Error using credits:', error);
    return NextResponse.json(
      { error: 'Failed to use credits' },
      { status: 500 }
    );
  }
} 