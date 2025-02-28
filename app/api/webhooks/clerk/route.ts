import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: Request) {
  // Get the headers
  const headersList = headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    
    // Get the primary email
    const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    
    if (!primaryEmail) {
      return new Response('Error: No primary email found', {
        status: 400
      });
    }

    // Construct the user's name
    const name = [first_name, last_name].filter(Boolean).join(' ') || 'Anonymous User';

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (existingUser) {
        // Update existing user
        await supabase
          .from('users')
          .update({
            name,
            email: primaryEmail.email_address
          })
          .eq('id', id);
      } else {
        // Insert new user
        await supabase
          .from('users')
          .insert({
            id,
            name,
            email: primaryEmail.email_address
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200
      });
    } catch (error) {
      console.error('Error syncing user to Supabase:', error);
      return new Response('Error syncing user to Supabase', {
        status: 500
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200
  });
} 