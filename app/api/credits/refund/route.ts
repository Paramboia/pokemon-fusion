import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

// Cost in credits for generating a fusion (to be refunded)
const FUSION_COST = 1;

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: authClerkUserId } = auth();
    console.log('Credits Refund API - Authenticated userId from auth():', authClerkUserId);
    
    // Check for authorization header as fallback
    let finalClerkUserId = authClerkUserId;
    
    if (!finalClerkUserId) {
      console.log('Credits Refund API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Credits Refund API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Credits Refund API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Credits Refund API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Credits Refund API - Verified token, userId:', verifiedToken.sub);
            finalClerkUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Credits Refund API - Error verifying token:', tokenError);
        }
      }
    }

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalClerkUserId) {
      console.log('Credits Refund API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserIdFromClerk(finalClerkUserId);
    if (!supabaseUserId) {
      console.error('Credits Refund API - Failed to find Supabase user ID for Clerk user:', finalClerkUserId);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { description = 'Refund for failed fusion generation' } = body;

    // Add the credits back to the user's account
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('add_credits', {
      user_id: supabaseUserId,
      credits_to_add: FUSION_COST,
      transaction_type: 'refund',
      description
    });

    if (error) {
      console.error('Credits Refund API - Error refunding credits:', error);
      return NextResponse.json(
        { error: 'Failed to refund credits' },
        { status: 500 }
      );
    }

    // Get the updated balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', supabaseUserId)
      .single();

    if (balanceError) {
      console.error('Credits Refund API - Error fetching updated balance:', balanceError);
    }

    console.log('Credits Refund API - Successfully refunded credits, new balance:', balanceData?.credits_balance || 0);
    return NextResponse.json({ 
      success: true, 
      balance: balanceData?.credits_balance || 0 
    });
  } catch (error) {
    console.error('Credits Refund API - Error refunding credits:', error);
    return NextResponse.json(
      { error: 'Failed to refund credits' },
      { status: 500 }
    );
  }
} 