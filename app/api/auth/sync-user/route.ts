import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
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

// Helper function to ensure the UUID extension exists
async function ensureUuidExtension() {
  try {
    console.log('Sync-user API - Ensuring UUID extension exists');
    // Try to create the UUID extension if it doesn't exist
    await supabaseClient.rpc('create_uuid_extension');
    console.log('Sync-user API - UUID extension created or already exists');
    return true;
  } catch (error) {
    console.error('Sync-user API - Error creating UUID extension:', error);
    
    // Try a direct SQL approach
    try {
      const { error: sqlError } = await supabaseClient.rpc('execute_sql', {
        sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
      });
      
      if (sqlError) {
        console.error('Sync-user API - Error with direct SQL for UUID extension:', sqlError);
        return false;
      }
      
      console.log('Sync-user API - UUID extension created with direct SQL');
      return true;
    } catch (sqlError) {
      console.error('Sync-user API - Error with direct SQL approach:', sqlError);
      return false;
    }
  }
}

// Helper function to ensure the users table exists
async function ensureUsersTable() {
  try {
    console.log('Sync-user API - Ensuring users table exists');
    
    // First ensure UUID extension exists
    await ensureUuidExtension();
    
    // Check if the users table exists
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
      
    if (error && error.code === 'PGRST116') {
      console.log('Sync-user API - Users table does not exist, creating it');
      
      // Create the users table with the correct schema
      const { error: createError } = await supabaseClient.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            clerk_id TEXT UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (createError) {
        console.error('Sync-user API - Error creating users table:', createError);
        return false;
      }
      
      console.log('Sync-user API - Users table created successfully');
      return true;
    }
    
    // Check if clerk_id column exists
    try {
      const { error: columnError } = await supabaseClient
        .from('users')
        .select('clerk_id')
        .limit(1);
        
      if (columnError && columnError.message.includes('column "clerk_id" does not exist')) {
        console.log('Sync-user API - clerk_id column does not exist, adding it');
        
        // Add the clerk_id column
        const { error: alterError } = await supabaseClient.rpc('execute_sql', {
          sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;'
        });
        
        if (alterError) {
          console.error('Sync-user API - Error adding clerk_id column:', alterError);
          return false;
        }
        
        console.log('Sync-user API - clerk_id column added successfully');
      }
    } catch (columnCheckError) {
      console.error('Sync-user API - Error checking clerk_id column:', columnCheckError);
    }
    
    return true;
  } catch (error) {
    console.error('Sync-user API - Error ensuring users table:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Get the current user from Clerk - this is more reliable than auth()
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
      const { data: existingUserByEmail, error: fetchEmailError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchEmailError && fetchEmailError.code !== 'PGRST116') {
        console.error('Sync-user API - Error fetching user by email:', fetchEmailError);
      }

      // Also check if user exists by Clerk ID
      console.log('Sync-user API - Checking if user exists with Clerk ID:', clerkUserId);
      const { data: existingUserByClerkId, error: fetchClerkIdError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUserId)
        .single();

      if (fetchClerkIdError && fetchClerkIdError.code !== 'PGRST116') {
        console.error('Sync-user API - Error fetching user by clerk_id:', fetchClerkIdError);
      }

      const existingUser = existingUserByEmail || existingUserByClerkId;

      if (existingUser) {
        console.log('Sync-user API - Updating existing user with ID:', existingUser.id);
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update({
            name,
            email,
            clerk_id: clerkUserId // Ensure Clerk ID is set
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
        
        // Insert new user directly using the Supabase API
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email,
            clerk_id: clerkUserId
          })
          .select();
          
        if (insertError) {
          console.error('Sync-user API - Error inserting user:', insertError);
          console.error('Sync-user API - Error details:', JSON.stringify(insertError));
          
          // If there's an error, try to create the table first
          console.log('Sync-user API - Table might not exist, trying to create it');
          
          // Create the users table with the correct schema
          const { error: tableError } = await supabaseClient
            .from('_schema')
            .select('*')
            .limit(1);
            
          if (tableError) {
            console.log('Sync-user API - Error checking schema, creating users table directly');
            
            // Try to create the users table directly
            try {
              // Create the users table with the correct schema
              await supabaseClient.schema.createTable('users', [
                { name: 'id', type: 'uuid', primaryKey: true, defaultValue: { type: 'uuid_generate_v4' } },
                { name: 'name', type: 'text', notNull: true },
                { name: 'email', type: 'text', notNull: true, unique: true },
                { name: 'clerk_id', type: 'text', unique: true },
                { name: 'created_at', type: 'timestamp', defaultValue: { type: 'now' } }
              ]);
              
              console.log('Sync-user API - Users table created successfully');
              
              // Try inserting again
              const { data: retryUser, error: retryError } = await supabaseClient
                .from('users')
                .insert({
                  name,
                  email,
                  clerk_id: clerkUserId
                })
                .select();
                
              if (retryError) {
                console.error('Sync-user API - Error on retry insert:', retryError);
                return NextResponse.json(
                  { error: 'Error creating user in Supabase' },
                  { status: 500 }
                );
              }
              
              console.log('Sync-user API - Successfully inserted user on retry:', retryUser);
              
              return NextResponse.json({ 
                success: true,
                user: retryUser?.[0] || null
              });
            } catch (createError) {
              console.error('Sync-user API - Error creating users table:', createError);
              
              // Last resort: try a raw insert
              try {
                // Generate a UUID for the user
                const userId = uuidv4();
                
                // Insert directly using the REST API
                const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                  },
                  body: JSON.stringify({
                    id: userId,
                    name,
                    email,
                    clerk_id: clerkUserId,
                    created_at: new Date().toISOString()
                  })
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  console.error('Sync-user API - Error with REST API insert:', errorData);
                  return NextResponse.json(
                    { error: 'Error creating user via REST API' },
                    { status: 500 }
                  );
                }
                
                const userData = await response.json();
                console.log('Sync-user API - Successfully inserted user via REST API:', userData);
                
                return NextResponse.json({ 
                  success: true,
                  user: userData[0] || { id: userId, name, email, clerk_id: clerkUserId }
                });
              } catch (restError) {
                console.error('Sync-user API - Error with REST API approach:', restError);
                return NextResponse.json(
                  { error: 'All user creation methods failed' },
                  { status: 500 }
                );
              }
            }
          }
          
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