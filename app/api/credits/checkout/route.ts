import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe';
import { getSupabaseUserIdFromClerk, createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // Fix the auth call to properly await the Promise
    const authResult = await auth();
    const userId = authResult.userId;
    
    // Parse the request body
    const body = await req.json();
    const { priceId, successUrl, cancelUrl } = body;

    // Get the Supabase client
    const supabase = await createServerClient();
    
    // Try to find the credit package in the database first
    const { data: dbPackage, error: dbError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('pricing_id', priceId)
      .eq('is_active', true)
      .maybeSingle();
      
    // If there's an error or no package found in the database, fall back to the hardcoded packages
    let creditPackage;
    if (dbError || !dbPackage) {
      console.log('Credits Checkout API - Package not found in database, using fallback:', priceId);
      creditPackage = Object.values(CREDIT_PACKAGES).find(
        (pkg) => pkg.stripe_price_id === priceId
      );
    } else {
      console.log('Credits Checkout API - Found package in database:', dbPackage.name);
      creditPackage = {
        credits: dbPackage.credits,
        price_cents: dbPackage.price_cents,
        stripe_price_id: dbPackage.pricing_id
      };
    }

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

    // Create metadata with price ID
    const metadata: Record<string, string> = {
      clerkUserId: userId,
      supabaseUserId,
      credits: creditPackage.credits.toString(),
      priceId: priceId, // Include the price ID directly in the metadata
    };
    
    // Add package ID to metadata if available from database
    if (dbPackage?.id) {
      metadata.packageId = dbPackage.id;
    } else {
      // Fall back to package type for backward compatibility
      metadata.packageType = Object.keys(CREDIT_PACKAGES).find(
        (key) => CREDIT_PACKAGES[key as keyof typeof CREDIT_PACKAGES].stripe_price_id === priceId
      ) || '';
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
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
      metadata,
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