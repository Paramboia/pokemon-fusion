import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { syncUserToSupabase } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

// Create a server-side Supabase client with additional headers
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
  },
  db: {
    schema: 'public',
  },
});

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
    const email = primaryEmail.email_address;

    try {
      // Check if user already exists by email
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
      }

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({
            name,
            email
          })
          .eq('id', existingUser.id);
          
        if (updateError) {
          console.error('Error updating user:', updateError);
          return new Response('Error updating user in Supabase', {
            status: 500
          });
        }
        
        console.log('Successfully updated user in Supabase');
      } else {
        // Insert new user - let Supabase generate the UUID
        const { error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email
          });
          
        if (insertError) {
          console.error('Error inserting user:', insertError);
          return new Response('Error inserting user to Supabase', {
            status: 500
          });
        }
        
        console.log('Successfully inserted new user in Supabase');
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