import { NextRequest, NextResponse } from 'next/server';
import { stripe, getCreditPackageByPriceId } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed.`, err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Make sure this is a payment (not a subscription)
        if (session.mode !== 'payment') {
          break;
        }

        // Make sure payment is successful
        if (session.payment_status !== 'paid') {
          break;
        }

        // Get the metadata
        const { userId, credits } = session.metadata as { 
          userId: string;
          credits: string;
        };

        if (!userId || !credits) {
          console.error('Missing metadata in session:', session.id);
          break;
        }

        // Get the line items to find the price ID
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        if (!lineItems.data.length) {
          console.error('No line items found for session:', session.id);
          break;
        }

        // Get the price ID from the line item
        const priceId = lineItems.data[0].price?.id;
        if (!priceId) {
          console.error('No price ID found for line item');
          break;
        }

        // Add credits to the user's account
        const supabase = await createServerClient();
        
        // Call the add_credits function in Supabase
        const { data, error } = await supabase.rpc('add_credits', {
          user_id: userId,
          credits_to_add: parseInt(credits, 10),
          transaction_type: 'purchase',
          payment_id: session.id,
          description: `Purchase of ${credits} credits`
        });

        if (error) {
          console.error('Error adding credits:', error);
          break;
        }

        console.log(`Added ${credits} credits to user ${userId}`);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 