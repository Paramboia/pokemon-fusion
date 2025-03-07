import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe';
import { getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // Fix the auth call to properly await the Promise
    const authResult = await auth();
    const userId = authResult.userId;
    
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

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserIdFromClerk(userId);
    
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
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
      metadata: {
        clerkUserId: userId,
        supabaseUserId,
        credits: creditPackage.credits.toString(),
        packageType: Object.keys(CREDIT_PACKAGES).find(
          (key) => CREDIT_PACKAGES[key as keyof typeof CREDIT_PACKAGES].stripe_price_id === priceId
        ),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Credits Checkout API - Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 