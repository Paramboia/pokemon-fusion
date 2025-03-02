import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Sync-user API - Supabase URL:', supabaseUrl);
console.log('Sync-user API - Service Key available:', !!supabaseServiceKey);

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
  try {
    // Get the current user ID from Clerk
    const { userId } = auth();
    
    console.log('Sync-user API - Clerk userId:', userId);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { name, email } = body;
    
    console.log('Sync-user API - Syncing user with name:', name, 'and email:', email);

    // Validate the request parameters
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    try {
      // First, ensure the users table exists
      console.log('Sync-user API - Ensuring users table exists');
      try {
        // Check if the users table exists
        const { data: tableExists, error: tableCheckError } = await supabaseClient
          .from('users')
          .select('count(*)')
          .limit(1);
        
        if (tableCheckError) {
          console.log('Sync-user API - Error checking users table, attempting to create it');
          
          // Try to create the table
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              clerk_id TEXT UNIQUE,
              name TEXT,
              email TEXT UNIQUE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;
          
          try {
            const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
            if (createTableError) {
              console.log('Sync-user API - Error creating users table:', createTableError);
            } else {
              console.log('Sync-user API - Users table created successfully');
            }
          } catch (tableError) {
            console.log('Sync-user API - Error in table creation:', tableError);
          }
        } else {
          console.log('Sync-user API - Users table exists');
        }
      } catch (tableError) {
        console.log('Sync-user API - Error checking/creating users table:', tableError);
      }

      // Check if user already exists by email
      console.log('Sync-user API - Checking if user exists with email:', email);
      const { data: existingUserByEmail, error: fetchEmailError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      // Also check if user exists by Clerk ID
      console.log('Sync-user API - Checking if user exists with Clerk ID:', userId);
      const { data: existingUserByClerkId, error: fetchClerkIdError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single();

      const existingUser = existingUserByEmail || existingUserByClerkId;

      if (existingUser) {
        console.log('Sync-user API - Updating existing user with ID:', existingUser.id);
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update({
            name,
            email,
            clerk_id: userId // Ensure Clerk ID is set
          })
          .eq('id', existingUser.id)
          .select();
          
        if (updateError) {
          console.error('Sync-user API - Error updating user:', updateError);
          return NextResponse.json(
            { error: 'Error updating user in Supabase' },
            { status: 500 }
          );
        }
        
        console.log('Sync-user API - Successfully updated user in Supabase:', updatedUser);
        
        return NextResponse.json({ 
          success: true,
          user: updatedUser?.[0] || existingUser
        });
      } else {
        console.log('Sync-user API - Creating new user with name:', name, 'and email:', email);
        
        // Generate a UUID for the new user
        const userId = uuidv4();
        
        // Insert new user with explicit UUID
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            id: userId,
            clerk_id: userId,
            name,
            email
          })
          .select();
          
        if (insertError) {
          console.error('Sync-user API - Error inserting user:', insertError);
          console.error('Sync-user API - Error details:', JSON.stringify(insertError));
          
          // Try again without specifying the ID (let Supabase generate it)
          console.log('Sync-user API - Retrying user creation without explicit ID');
          const { data: retryUser, error: retryError } = await supabaseClient
            .from('users')
            .insert({
              clerk_id: userId,
              name,
              email
            })
            .select();
            
          if (retryError) {
            console.error('Sync-user API - Error on retry insert:', retryError);
            return NextResponse.json(
              { error: 'Error inserting user to Supabase' },
              { status: 500 }
            );
          }
          
          console.log('Sync-user API - Successfully inserted new user on retry:', retryUser);
          
          return NextResponse.json({ 
            success: true,
            user: retryUser?.[0] || null
          });
        }
        
        console.log('Sync-user API - Successfully inserted new user in Supabase:', newUser);
        
        return NextResponse.json({ 
          success: true,
          user: newUser?.[0] || null
        });
      }
    } catch (error) {
      console.error('Sync-user API - Error syncing user to Supabase:', error);
      console.error('Sync-user API - Error details:', JSON.stringify(error));
      return NextResponse.json(
        { error: 'Error syncing user to Supabase' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sync-user API - Error in sync-user API:', error);
    console.error('Sync-user API - Error details:', JSON.stringify(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 