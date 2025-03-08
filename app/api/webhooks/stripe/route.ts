import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to log to a file for debugging
async function logToFile(message: string) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    
    // Log to console as well
    console.log(logMessage);
    
    // Return true to indicate success
    return true;
  } catch (error) {
    console.error('Error writing to log file:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  await logToFile('Stripe webhook received');
  
  try {
    // Check if Stripe API key is available
    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
      await logToFile('Stripe API key or webhook secret is missing');
      return NextResponse.json(
        { error: 'Payment service is not configured' },
        { status: 503 }
      );
    }

    await logToFile(`Using webhook secret: ${webhookSecret.substring(0, 5)}...`);
    
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;
    
    await logToFile(`Received signature: ${signature ? signature.substring(0, 10) + '...' : 'none'}`);

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      await logToFile(`Webhook event constructed successfully: ${event.type}`);
    } catch (err: any) {
      await logToFile(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        await logToFile('Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Make sure this is a payment (not a subscription)
        if (session.mode !== 'payment') {
          await logToFile('Not a payment session, skipping');
          break;
        }

        // Make sure payment is successful
        if (session.payment_status !== 'paid') {
          await logToFile('Payment not paid, skipping');
          break;
        }

        await logToFile(`Session ID: ${session.id}`);
        await logToFile(`Session metadata: ${JSON.stringify(session.metadata)}`);
        await logToFile(`Session customer details: ${JSON.stringify(session.customer_details)}`);
        
        // Get the metadata
        const metadata = session.metadata as { 
          clerkUserId?: string;
          supabaseUserId?: string;
          credits?: string;
          packageType?: string;
        };

        // Default to 5 credits if not specified
        const creditsToAdd = metadata.credits ? parseInt(metadata.credits, 10) : 5;
        await logToFile(`Credits to add: ${creditsToAdd}`);

        try {
          // Get the Supabase admin client
          const supabase = await getSupabaseAdminClient();
          await logToFile('Got Supabase admin client');
          
          // Try to find a user to associate with this transaction
          let userId = metadata.supabaseUserId;
          let userEmail = session.customer_details?.email || 'anonymous@example.com';
          
          await logToFile(`Initial user ID from metadata: ${userId || 'none'}`);
          await logToFile(`User email: ${userEmail}`);
          
          // If we don't have a user ID but have an email, try to find the user
          if (!userId && session.customer_details?.email) {
            await logToFile(`Looking up user by email: ${session.customer_details.email}`);
            
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('id')
              .eq('email', session.customer_details.email)
              .maybeSingle();
              
            if (emailError) {
              await logToFile(`Error looking up user by email: ${emailError.message}`);
            } else if (userByEmail) {
              userId = userByEmail.id;
              await logToFile(`Found user by email: ${userId}`);
            } else {
              await logToFile('No user found with this email');
            }
          }
          
          // If we still don't have a user ID, find any user
          if (!userId) {
            await logToFile('No user found by email, finding any user');
            
            const { data: anyUser, error: userError } = await supabase
              .from('users')
              .select('id')
              .limit(1)
              .single();
              
            if (userError) {
              await logToFile(`Error finding any user: ${userError.message}`);
            } else if (anyUser) {
              userId = anyUser.id;
              await logToFile(`Using existing user ID: ${userId}`);
            } else {
              await logToFile('No users found in the database');
              break;
            }
          }
          
          // DIRECT INSERT: Insert directly into credits_transactions table
          await logToFile('Inserting transaction directly into credits_transactions');
          const transactionData = {
            user_id: userId,
            amount: creditsToAdd,
            transaction_type: 'purchase',
            payment_id: session.id,
            description: `Purchase of ${creditsToAdd} credits`
          };
          
          await logToFile(`Transaction data: ${JSON.stringify(transactionData)}`);
          
          const { data: insertedTransaction, error: insertError } = await supabase
            .from('credits_transactions')
            .insert(transactionData)
            .select();
            
          if (insertError) {
            await logToFile(`Error inserting transaction: ${insertError.message}`);
            await logToFile(`Error details: ${JSON.stringify(insertError)}`);
          } else {
            await logToFile(`Transaction inserted successfully: ${JSON.stringify(insertedTransaction)}`);
            
            // Update user's balance
            await logToFile(`Updating user balance for user: ${userId}`);
            
            const { data: userData, error: fetchError } = await supabase
              .from('users')
              .select('credits_balance')
              .eq('id', userId)
              .single();
              
            if (fetchError) {
              await logToFile(`Error fetching user balance: ${fetchError.message}`);
            } else {
              const currentBalance = userData?.credits_balance || 0;
              const newBalance = currentBalance + creditsToAdd;
              
              await logToFile(`Current balance: ${currentBalance}, New balance: ${newBalance}`);
              
              const { error: updateError } = await supabase
                .from('users')
                .update({ credits_balance: newBalance })
                .eq('id', userId);
                
              if (updateError) {
                await logToFile(`Error updating user balance: ${updateError.message}`);
              } else {
                await logToFile(`Successfully updated user balance from ${currentBalance} to ${newBalance}`);
              }
            }
          }
        } catch (err: any) {
          await logToFile(`Exception in transaction processing: ${err.message}`);
          await logToFile(`Stack trace: ${err.stack}`);
        }
        break;
      }
      
      default:
        await logToFile(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    await logToFile(`Error processing webhook: ${error.message}`);
    await logToFile(`Stack trace: ${error.stack}`);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 