import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    console.log('Stripe webhook received');
    
    // Check if Stripe API key is available
    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
      console.error('Stripe API key or webhook secret is missing');
      return NextResponse.json(
        { error: 'Payment service is not configured' },
        { status: 503 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      console.log('Webhook event constructed successfully:', event.type);
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
        console.log('Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Make sure this is a payment (not a subscription)
        if (session.mode !== 'payment') {
          console.log('Not a payment session, skipping');
          break;
        }

        // Make sure payment is successful
        if (session.payment_status !== 'paid') {
          console.log('Payment not paid, skipping');
          break;
        }

        console.log('Session metadata:', session.metadata);
        console.log('Session customer details:', session.customer_details);
        
        // Get the metadata
        const metadata = session.metadata as { 
          clerkUserId?: string;
          supabaseUserId?: string;
          credits?: string;
          packageType?: string;
        };

        // Default to 5 credits if not specified
        const creditsToAdd = metadata.credits ? parseInt(metadata.credits, 10) : 5;
        console.log('Credits to add:', creditsToAdd);

        try {
          // Get the Supabase admin client
          const supabase = await getSupabaseAdminClient();
          console.log('Got Supabase admin client');
          
          // Try to find a user to associate with this transaction
          let userId = metadata.supabaseUserId;
          let userEmail = session.customer_details?.email || 'anonymous@example.com';
          
          // If we don't have a user ID but have an email, try to find the user
          if (!userId && session.customer_details?.email) {
            console.log('Looking up user by email:', session.customer_details.email);
            
            const { data: userByEmail } = await supabase
              .from('users')
              .select('id')
              .eq('email', session.customer_details.email)
              .maybeSingle();
              
            if (userByEmail) {
              userId = userByEmail.id;
              console.log('Found user by email:', userId);
            }
          }
          
          // If we still don't have a user ID, find any user
          if (!userId) {
            console.log('No user found by email, finding any user');
            
            const { data: anyUser } = await supabase
              .from('users')
              .select('id')
              .limit(1)
              .single();
              
            if (anyUser) {
              userId = anyUser.id;
              console.log('Using existing user ID:', userId);
            } else {
              console.error('No users found in the database');
              break;
            }
          }
          
          // DIRECT INSERT: Insert directly into credits_transactions table
          console.log('Inserting transaction directly into credits_transactions');
          const transactionData = {
            user_id: userId,
            amount: creditsToAdd,
            transaction_type: 'purchase',
            payment_id: session.id,
            description: `Purchase of ${creditsToAdd} credits`
          };
          
          console.log('Transaction data:', transactionData);
          
          const { data: insertedTransaction, error: insertError } = await supabase
            .from('credits_transactions')
            .insert(transactionData)
            .select();
            
          if (insertError) {
            console.error('Error inserting transaction:', insertError);
          } else {
            console.log('Transaction inserted successfully:', insertedTransaction);
            
            // Update user's balance
            console.log('Updating user balance');
            
            const { data: userData } = await supabase
              .from('users')
              .select('credits_balance')
              .eq('id', userId)
              .single();
              
            const currentBalance = userData?.credits_balance || 0;
            const newBalance = currentBalance + creditsToAdd;
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ credits_balance: newBalance })
              .eq('id', userId);
              
            if (updateError) {
              console.error('Error updating user balance:', updateError);
            } else {
              console.log(`Updated user balance from ${currentBalance} to ${newBalance}`);
            }
          }
        } catch (err) {
          console.error('Exception in transaction processing:', err);
        }
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