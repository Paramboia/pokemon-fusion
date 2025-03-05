import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { stripe, CREDIT_PACKAGES } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

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
    const { priceId, successUrl, cancelUrl } = body;

    // Validate the price ID
    const creditPackage = Object.values(CREDIT_PACKAGES).find(
      (pkg) => pkg.stripe_price_id === priceId
    );

    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

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
        userId,
        credits: creditPackage.credits.toString(),
        packageType: Object.keys(CREDIT_PACKAGES).find(
          (key) => CREDIT_PACKAGES[key as keyof typeof CREDIT_PACKAGES].stripe_price_id === priceId
        ),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 