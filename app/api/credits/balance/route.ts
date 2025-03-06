import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

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

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalClerkUserId) {
      console.log('Credits Balance API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    let supabaseUserId = await getSupabaseUserIdFromClerk(finalClerkUserId);
    
    // If no Supabase user ID was found, try to create a user mapping
    if (!supabaseUserId) {
      console.log('Credits Balance API - No Supabase user ID found, attempting to create user mapping');
      
      try {
        // Get user details from Clerk
        const clerkUser = await clerkClient.users.getUser(finalClerkUserId);
        console.log('Credits Balance API - Retrieved Clerk user:', clerkUser.id);
        
        // Get primary email
        const primaryEmailObj = clerkUser.emailAddresses.find(
          email => email.id === clerkUser.primaryEmailAddressId
        ) || clerkUser.emailAddresses[0];
        
        const email = primaryEmailObj?.emailAddress;
        const name = clerkUser.firstName && clerkUser.lastName 
          ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim() 
          : 'Anonymous User';
        
        if (email) {
          console.log('Credits Balance API - Calling sync-user API with email:', email);
          
          // Call the sync-user API to create the mapping
          const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/sync-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${finalClerkUserId}` // Add auth header for the sync API
            },
            body: JSON.stringify({
              id: finalClerkUserId,
              firstName: clerkUser.firstName || '',
              lastName: clerkUser.lastName || '',
              emailAddresses: [{ emailAddress: email }],
              primaryEmailAddressId: primaryEmailObj?.id
            }),
          });
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log('Credits Balance API - Successfully created user mapping:', syncData);
            
            // Try to get the Supabase user ID again
            supabaseUserId = await getSupabaseUserIdFromClerk(finalClerkUserId);
            
            if (!supabaseUserId) {
              console.error('Credits Balance API - Still could not get Supabase user ID after sync');
              
              // Create a direct mapping in Supabase as a last resort
              const supabase = createServerClient();
              const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                  clerk_id: finalClerkUserId,
                  name,
                  email,
                  credits_balance: 0
                })
                .select()
                .single();
                
              if (insertError) {
                console.error('Credits Balance API - Error creating user directly in Supabase:', insertError);
              } else if (newUser) {
                console.log('Credits Balance API - Created user directly in Supabase:', newUser.id);
                supabaseUserId = newUser.id;
              }
            }
          } else {
            console.error('Credits Balance API - Failed to create user mapping:', await syncResponse.text());
            
            // Try direct creation in Supabase as fallback
            const supabase = createServerClient();
            const { data: directUser, error: directError } = await supabase
              .from('users')
              .insert({
                clerk_id: finalClerkUserId,
                name,
                email,
                credits_balance: 0
              })
              .select()
              .single();
              
            if (directError) {
              console.error('Credits Balance API - Error creating user directly:', directError);
            } else if (directUser) {
              console.log('Credits Balance API - Created user directly after sync failure:', directUser.id);
              supabaseUserId = directUser.id;
            }
          }
        } else {
          console.error('Credits Balance API - No email found for Clerk user');
        }
      } catch (syncError) {
        console.error('Credits Balance API - Error in user mapping process:', syncError);
      }
    }
    
    // Final check if we have a Supabase user ID
    if (!supabaseUserId) {
      console.error('Credits Balance API - All attempts to get/create Supabase user ID failed');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
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
      console.error('Credits Balance API - Error fetching credit balance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit balance' },
        { status: 500 }
      );
    }

    console.log('Credits Balance API - Successfully retrieved balance:', data?.credits_balance || 0);
    return NextResponse.json({ balance: data?.credits_balance || 0 });
  } catch (error) {
    console.error('Credits Balance API - Error checking credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to check credit balance' },
      { status: 500 }
    );
  }
} 