import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

// Cost in credits for generating a fusion
const FUSION_COST = 1;

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: authClerkUserId } = auth();
    console.log('Credits Use API - Authenticated userId from auth():', authClerkUserId);
    
    // Check for authorization header as fallback
    let finalClerkUserId = authClerkUserId;
    
    if (!finalClerkUserId) {
      console.log('Credits Use API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Credits Use API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Credits Use API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Credits Use API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Credits Use API - Verified token, userId:', verifiedToken.sub);
            finalClerkUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Credits Use API - Error verifying token:', tokenError);
        }
      }
    }

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalClerkUserId) {
      console.log('Credits Use API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserIdFromClerk(finalClerkUserId);
    if (!supabaseUserId) {
      console.error('Credits Use API - Failed to find Supabase user ID for Clerk user:', finalClerkUserId);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { description = 'Fusion generation' } = body;

    // Use the credits
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('use_credits', {
      user_id: supabaseUserId,
      credits_to_use: FUSION_COST,
      description
    });

    if (error) {
      console.error('Credits Use API - Error using credits:', error);
      return NextResponse.json(
        { error: 'Failed to use credits' },
        { status: 500 }
      );
    }

    // If data is false, the user doesn't have enough credits
    if (data === false) {
      console.log('Credits Use API - Insufficient credits for user:', supabaseUserId);
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 } // 402 Payment Required
      );
    }

    // Get the updated balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', supabaseUserId)
      .single();

    if (balanceError) {
      console.error('Credits Use API - Error fetching updated balance:', balanceError);
    }

    console.log('Credits Use API - Successfully used credits, new balance:', balanceData?.credits_balance || 0);
    return NextResponse.json({ 
      success: true, 
      balance: balanceData?.credits_balance || 0 
    });
  } catch (error) {
    console.error('Credits Use API - Error using credits:', error);
    return NextResponse.json(
      { error: 'Failed to use credits' },
      { status: 500 }
    );
  }
} 