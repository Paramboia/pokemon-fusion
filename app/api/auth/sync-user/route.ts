import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

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

// Helper function to ensure the users table exists
async function ensureUsersTable() {
  try {
    console.log('Sync-user API - Ensuring users table exists');
    
    // Check if the users table exists
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
      
    if (error && error.code === 'PGRST116') {
      console.log('Sync-user API - Users table does not exist, creating it');
      
      // Create the users table with the correct schema - without clerk_id
      const { error: createError } = await supabaseClient.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (createError) {
        console.error('Sync-user API - Error creating users table:', createError);
        return false;
      }
      
      console.log('Sync-user API - Users table created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Sync-user API - Error ensuring users table:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Get the current user from Clerk
    const user = await currentUser();
    const { userId } = auth();
    
    console.log('Sync-user API - Clerk user:', user ? 'Found' : 'Not found');
    console.log('Sync-user API - Clerk userId from auth():', userId);
    
    // Use either the user ID from currentUser() or from auth()
    const clerkUserId = user?.id || userId;
    
    if (!clerkUserId) {
      console.log('Sync-user API - No userId found, returning 401');
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
      console.log('Sync-user API - Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Ensure the users table exists before proceeding
    const tableExists = await ensureUsersTable();
    if (!tableExists) {
      console.error('Sync-user API - Failed to ensure users table exists');
      return NextResponse.json(
        { error: 'Database setup failed' },
        { status: 500 }
      );
    }

    try {
      // Check if user already exists by email
      console.log('Sync-user API - Checking if user exists with email:', email);
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        console.log('Sync-user API - Updating existing user with ID:', existingUser.id);
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update({
            name
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
        
        // Insert new user without clerk_id
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email
          })
          .select();
          
        if (insertError) {
          console.error('Sync-user API - Error inserting user:', insertError);
          return NextResponse.json(
            { error: 'Error inserting user to Supabase' },
            { status: 500 }
          );
        }
        
        console.log('Sync-user API - Successfully inserted new user in Supabase:', newUser);
        
        return NextResponse.json({ 
          success: true,
          user: newUser?.[0] || null
        });
      }
    } catch (error) {
      console.error('Sync-user API - Error syncing user to Supabase:', error);
      return NextResponse.json(
        { error: 'Error syncing user to Supabase' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sync-user API - Error in sync-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 