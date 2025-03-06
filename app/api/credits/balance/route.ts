import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerClient, getSupabaseUserIdFromClerk, getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: authClerkUserId } = auth();
    console.log('Credits Balance API - Authenticated userId from auth():', authClerkUserId);
    
    // Check for authorization header as fallback
    let finalClerkUserId = authClerkUserId;
    
    if (!finalClerkUserId) {
      console.log('Credits Balance API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Credits Balance API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Credits Balance API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Credits Balance API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Credits Balance API - Verified token, userId:', verifiedToken.sub);
            finalClerkUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Credits Balance API - Error verifying token:', tokenError);
        }
      }
    }

    // SIMPLIFIED APPROACH: If we have a Clerk user ID, try to get the balance
    if (finalClerkUserId) {
      try {
        // Get the Supabase admin client for direct database access
        const supabaseAdmin = await getSupabaseAdminClient();
        
        // First try to find user by clerk_id
        const { data: userByClerkId, error: clerkIdError } = await supabaseAdmin
          .from('users')
          .select('id, credits_balance')
          .eq('clerk_id', finalClerkUserId)
          .maybeSingle();
          
        if (userByClerkId) {
          console.log('Credits Balance API - Found user by clerk_id, balance:', userByClerkId.credits_balance);
          return NextResponse.json({ balance: userByClerkId.credits_balance || 0 });
        }
        
        // If not found by clerk_id, try to get user details from Clerk
        try {
          const clerkUser = await clerkClient.users.getUser(finalClerkUserId);
          
          if (clerkUser && clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
            // Get primary email
            const primaryEmailObj = clerkUser.emailAddresses.find(
              email => email.id === clerkUser.primaryEmailAddressId
            ) || clerkUser.emailAddresses[0];
            
            const email = primaryEmailObj?.emailAddress;
            
            if (email) {
              // Try to find user by email
              const { data: userByEmail, error: emailError } = await supabaseAdmin
                .from('users')
                .select('id, credits_balance')
                .eq('email', email)
                .maybeSingle();
                
              if (userByEmail) {
                console.log('Credits Balance API - Found user by email, balance:', userByEmail.credits_balance);
                
                // Update the clerk_id for future lookups
                await supabaseAdmin
                  .from('users')
                  .update({ clerk_id: finalClerkUserId })
                  .eq('id', userByEmail.id);
                  
                return NextResponse.json({ balance: userByEmail.credits_balance || 0 });
              }
            }
          }
        } catch (clerkError) {
          console.error('Credits Balance API - Error getting user from Clerk:', clerkError);
        }
      } catch (dbError) {
        console.error('Credits Balance API - Database error:', dbError);
      }
    }
    
    // FALLBACK: Return null credits if we couldn't find the user
    console.log('Credits Balance API - Could not find user, returning null balance');
    return NextResponse.json({ balance: null });
    
  } catch (error) {
    console.error('Credits Balance API - Error checking credit balance:', error);
    // Return null credits as fallback
    return NextResponse.json({ balance: null });
  }
} 