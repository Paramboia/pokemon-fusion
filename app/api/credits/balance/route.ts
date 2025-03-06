import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  console.log('\n--- Credits Balance API - New Request ---');
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    // Get auth info from Clerk
    const { userId } = auth();
    console.log('Balance API - Auth userId from Clerk:', userId);

    // Check for authorization header as fallback
    let finalUserId = userId;
    if (!finalUserId) {
      const authHeader = req.headers.get('Authorization');
      console.log('Balance API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const verifiedToken = await clerkClient.verifyToken(token);
          if (verifiedToken && verifiedToken.sub) {
            console.log('Balance API - Verified token userId:', verifiedToken.sub);
            finalUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Balance API - Token verification error:', tokenError);
        }
      }
    }

    if (!finalUserId) {
      console.log('Balance API - No userId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Balance API - Looking up user with clerk_id:', finalUserId);

    // Get user data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, credits_balance, email')
      .eq('clerk_id', finalUserId)
      .single();

    if (userError) {
      console.error('Balance API - Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userData) {
      console.log('Balance API - No user data found for clerk_id:', finalUserId);
      
      // Try to get user details from Clerk
      try {
        const clerkUser = await clerkClient.users.getUser(finalUserId);
        console.log('Balance API - Found Clerk user:', {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress
        });

        // Create user in Supabase if they don't exist
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            clerk_id: finalUserId,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
            credits_balance: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Balance API - Error creating user:', createError);
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        console.log('Balance API - Created new user:', newUser);
        return NextResponse.json({ 
          balance: 0,
          userId: newUser.id
        });
      } catch (clerkError) {
        console.error('Balance API - Error getting Clerk user:', clerkError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    console.log('Balance API - Found user data:', {
      id: userData.id,
      balance: userData.credits_balance,
      email: userData.email
    });

    return NextResponse.json({ 
      balance: userData.credits_balance || 0,
      userId: userData.id
    });

  } catch (error) {
    console.error('Balance API - Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 