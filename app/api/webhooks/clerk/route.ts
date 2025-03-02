import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { syncUserToSupabase } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Webhook handler - Supabase URL:', supabaseUrl);
console.log('Webhook handler - Service Key available:', !!supabaseServiceKey);

// Create a server-side Supabase client with additional headers
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
  },
  db: {
    schema: 'public',
  },
});

export async function POST(req: Request) {
  console.log('Webhook handler - POST request received');
  
  // Get the headers
  const headersList = headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Webhook handler - Missing svix headers');
    return new Response('Error: Missing svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);
  console.log('Webhook handler - Received payload:', JSON.stringify(payload, null, 2));

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
    console.log('Webhook handler - Webhook verified successfully');
  } catch (err) {
    console.error('Webhook handler - Error verifying webhook:', err);
    return new Response('Error verifying webhook', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log('Webhook handler - Event type:', eventType);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    console.log('Webhook handler - User data:', { id, email_addresses, first_name, last_name });
    
    // Get the primary email
    const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    
    if (!primaryEmail) {
      console.error('Webhook handler - No primary email found');
      return new Response('Error: No primary email found', {
        status: 400
      });
    }

    // Construct the user's name
    const name = [first_name, last_name].filter(Boolean).join(' ') || 'Anonymous User';
    const email = primaryEmail.email_address;
    console.log('Webhook handler - Syncing user with name:', name, 'and email:', email);

    try {
      // Check if user already exists by email
      console.log('Webhook handler - Checking if user exists by email:', email);
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log('Webhook handler - User not found, will create new user');
        } else {
          console.error('Webhook handler - Error fetching user:', fetchError);
        }
      } else {
        console.log('Webhook handler - Existing user found:', existingUser);
      }

      if (existingUser) {
        // Update existing user
        console.log('Webhook handler - Updating existing user with ID:', existingUser.id);
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update({
            name,
            email
          })
          .eq('id', existingUser.id)
          .select();
          
        if (updateError) {
          console.error('Webhook handler - Error updating user:', updateError);
          return new Response('Error updating user in Supabase', {
            status: 500
          });
        }
        
        console.log('Webhook handler - Successfully updated user in Supabase:', updatedUser);
      } else {
        // Insert new user - let Supabase generate the UUID
        console.log('Webhook handler - Inserting new user');
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email
          })
          .select();
          
        if (insertError) {
          console.error('Webhook handler - Error inserting user:', insertError);
          return new Response('Error inserting user to Supabase', {
            status: 500
          });
        }
        
        console.log('Webhook handler - Successfully inserted new user in Supabase:', newUser);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200
      });
    } catch (error) {
      console.error('Webhook handler - Error syncing user to Supabase:', error);
      return new Response('Error syncing user to Supabase', {
        status: 500
      });
    }
  }

  console.log('Webhook handler - Event processed successfully');
  return new Response(JSON.stringify({ success: true }), {
    status: 200
  });
} 