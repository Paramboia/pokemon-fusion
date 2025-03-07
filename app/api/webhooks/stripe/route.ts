import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getCreditPackageByPriceId } from '@/lib/stripe';
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
        
        // Get the metadata
        const metadata = session.metadata as { 
          clerkUserId?: string;
          supabaseUserId?: string;
          credits?: string;
          packageType?: string;
        };

        if (!metadata.credits) {
          console.error('Missing credits in metadata:', session.id);
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

        console.log('Found price ID:', priceId);

        try {
          // Get the Supabase admin client
          const supabase = await getSupabaseAdminClient();
          
          // If we don't have a supabaseUserId in metadata, try to find the user by email
          let userId = metadata.supabaseUserId;
          
          if (!userId && session.customer_details?.email) {
            console.log('Looking up user by email:', session.customer_details.email);
            
            // Try to find the user by email
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('id')
              .eq('email', session.customer_details.email)
              .maybeSingle();
              
            if (emailError) {
              console.error('Error looking up user by email:', emailError);
            } else if (userByEmail) {
              userId = userByEmail.id;
              console.log('Found user by email:', userId);
            }
          }
          
          // If we still don't have a user ID, create a new user
          if (!userId && session.customer_details?.email) {
            console.log('Creating new user with email:', session.customer_details.email);
            
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                email: session.customer_details.email,
                name: session.customer_details.name || 'Anonymous User',
                credits_balance: 0
              })
              .select()
              .single();
              
            if (insertError) {
              console.error('Error creating new user:', insertError);
            } else if (newUser) {
              userId = newUser.id;
              console.log('Created new user:', userId);
            }
          }
          
          if (!userId) {
            console.error('Could not determine user ID for transaction');
            break;
          }
          
          console.log('Adding credits for user:', userId);
          
          // Call the add_credits function in Supabase
          const addCreditsParams = {
            user_id: userId,
            credits_to_add: parseInt(metadata.credits, 10),
            transaction_type: 'purchase',
            payment_id: session.id,
            description: `Purchase of ${metadata.credits} credits`
          };
          
          console.log('Calling add_credits with params:', addCreditsParams);
          
          const { data, error } = await supabase.rpc('add_credits', addCreditsParams);

          if (error) {
            console.error('Error adding credits:', error);
            
            // If the RPC call fails, try to insert directly into the transactions table
            console.log('Attempting direct insert into credits_transactions');
            
            const { error: insertError } = await supabase
              .from('credits_transactions')
              .insert({
                user_id: userId,
                amount: parseInt(metadata.credits, 10),
                transaction_type: 'purchase',
                payment_id: session.id,
                description: `Purchase of ${metadata.credits} credits`
              });
              
            if (insertError) {
              console.error('Error inserting transaction:', insertError);
            } else {
              console.log('Successfully inserted transaction directly');
              
              // Update user's balance
              const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('credits_balance')
                .eq('id', userId)
                .single();
                
              if (fetchError) {
                console.error('Error fetching user balance:', fetchError);
              } else {
                const newBalance = (userData?.credits_balance || 0) + parseInt(metadata.credits, 10);
                
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ credits_balance: newBalance })
                  .eq('id', userId);
                  
                if (updateError) {
                  console.error('Error updating user balance:', updateError);
                } else {
                  console.log('Successfully updated user balance to', newBalance);
                }
              }
            }
          } else {
            console.log('Successfully added credits via RPC function');
          }

          console.log(`Added ${metadata.credits} credits to user ${userId}`);
        } catch (err) {
          console.error('Exception in add_credits process:', err);
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