import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe';
import { createServerClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: authClerkUserId } = auth();
    console.log('Credits Checkout API - Authenticated userId from auth():', authClerkUserId);
    
    // Check for authorization header as fallback
    let finalClerkUserId = authClerkUserId;
    
    if (!finalClerkUserId) {
      console.log('Credits Checkout API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Credits Checkout API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Credits Checkout API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Credits Checkout API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Credits Checkout API - Verified token, userId:', verifiedToken.sub);
            finalClerkUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Credits Checkout API - Error verifying token:', tokenError);
        }
      }
    }

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalClerkUserId) {
      console.log('Credits Checkout API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserIdFromClerk(finalClerkUserId);
    if (!supabaseUserId) {
      console.error('Credits Checkout API - Failed to find Supabase user ID for Clerk user:', finalClerkUserId);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { priceId, successUrl, cancelUrl } = body;

    // Validate the price ID
    const creditPackage = Object.values(CREDIT_PACKAGES).find(
      (pkg) => pkg.stripe_price_id === priceId
    );

    if (!creditPackage) {
      console.error('Credits Checkout API - Invalid price ID:', priceId);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Check if Stripe API key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Credits Checkout API - Stripe API key is missing');
      return NextResponse.json(
        { error: 'Payment service is not configured' },
        { status: 503 }
      );
    }

    // Get the Stripe instance
    const stripe = getStripe();

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/credits/cancel`,
      metadata: {
        clerkUserId: finalClerkUserId,
        supabaseUserId,
        credits: creditPackage.credits.toString(),
        packageType: Object.keys(CREDIT_PACKAGES).find(
          (key) => CREDIT_PACKAGES[key as keyof typeof CREDIT_PACKAGES].stripe_price_id === priceId
        ),
      },
    });

    console.log('Credits Checkout API - Successfully created checkout session:', session.id);
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Credits Checkout API - Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 