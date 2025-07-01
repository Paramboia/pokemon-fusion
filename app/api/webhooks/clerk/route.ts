import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { syncUserToSupabase } from '@/lib/supabase-server-actions';

// This endpoint handles Clerk webhooks
// It syncs user data to Supabase when users are created or updated in Clerk
export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('Clerk Webhook - Missing CLERK_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Missing webhook secret' },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = req.headers;
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Clerk Webhook - Missing svix headers');
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Clerk Webhook - Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Error verifying webhook' },
      { status: 400 }
    );
  }

  // Get the event type
  const eventType = evt.type;
  console.log('Clerk Webhook - Received event type:', eventType);

  // Handle user creation and update events
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, username } = evt.data;
    
    // Get the user's email (may not be available for X/Twitter OAuth)
    const email = email_addresses?.[0]?.email_address;
    
    // Handle missing email (common with X/Twitter OAuth)
    let fallbackEmail = email;
    if (!email) {
      console.log('Clerk Webhook - No email found for user:', id, 'using fallback strategy');
      // Create a fallback email using the username or Clerk ID
      const fallbackIdentifier = username || id;
      fallbackEmail = `${fallbackIdentifier}@clerk-fallback.local`;
    }
    
    // Get the user's name
    const firstName = first_name || '';
    const lastName = last_name || '';
    const name = `${firstName} ${lastName}`.trim() || username || 'Anonymous User';
    
    console.log('Clerk Webhook - Syncing user to Supabase:', { 
      id, 
      name, 
      email: email || 'fallback', 
      hasRealEmail: !!email 
    });
    
    // Sync the user to Supabase
    const success = await syncUserToSupabase(id, name, fallbackEmail, !email);
    
    if (!success) {
      console.error('Clerk Webhook - Failed to sync user to Supabase');
      return NextResponse.json(
        { error: 'Failed to sync user to Supabase' },
        { status: 500 }
      );
    }
    
    console.log('Clerk Webhook - Successfully synced user to Supabase');
    return NextResponse.json({ success: true });
  }
  
  // Return a 200 for other event types
  return NextResponse.json({ success: true });
} 