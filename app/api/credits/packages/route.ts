import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import { createServerClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: authClerkUserId } = auth();
    console.log('Credits Packages API - Authenticated userId from auth():', authClerkUserId);
    
    // Check for authorization header as fallback
    let finalClerkUserId = authClerkUserId;
    
    if (!finalClerkUserId) {
      console.log('Credits Packages API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Credits Packages API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Credits Packages API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Credits Packages API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Credits Packages API - Verified token, userId:', verifiedToken.sub);
            finalClerkUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Credits Packages API - Error verifying token:', tokenError);
        }
      }
    }

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalClerkUserId) {
      console.log('Credits Packages API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserIdFromClerk(finalClerkUserId);
    if (!supabaseUserId) {
      console.error('Credits Packages API - Failed to find Supabase user ID for Clerk user:', finalClerkUserId);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Get the credit packages from Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('credits', { ascending: true });

    if (error) {
      console.error('Credits Packages API - Error fetching credit packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit packages' },
        { status: 500 }
      );
    }

    // Format the packages for the frontend
    const packages = data.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price_cents / 100, // Convert cents to euros
      currency: pkg.currency,
      priceId: CREDIT_PACKAGES[pkg.name.toUpperCase().replace(' ', '_') as keyof typeof CREDIT_PACKAGES]?.stripe_price_id || null
    }));

    console.log('Credits Packages API - Successfully retrieved packages:', packages.length);
    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Credits Packages API - Error listing credit packages:', error);
    return NextResponse.json(
      { error: 'Failed to list credit packages' },
      { status: 500 }
    );
  }
} 