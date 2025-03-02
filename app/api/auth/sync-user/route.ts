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

    try {
      // First, ensure the users table exists with the correct schema
      console.log('Sync-user API - Ensuring users table exists');
      try {
        // Try to create the UUID extension if it doesn't exist
        const createExtensionQuery = `
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        `;
        
        try {
          const { error: extensionError } = await supabaseClient.rpc('exec_sql', { query: createExtensionQuery });
          if (extensionError) {
            console.log('Sync-user API - Error creating UUID extension (may already exist):', extensionError);
          } else {
            console.log('Sync-user API - UUID extension created or already exists');
          }
        } catch (extensionError) {
          console.log('Sync-user API - Error creating UUID extension:', extensionError);
        }
        
        // Create the users table with the correct schema
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
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
        
        // Try to add a clerk_id column if it doesn't exist
        const addClerkIdColumnQuery = `
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'clerk_id'
            ) THEN
              ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE;
            END IF;
          END $$;
        `;
        
        try {
          const { error: columnError } = await supabaseClient.rpc('exec_sql', { query: addClerkIdColumnQuery });
          if (columnError) {
            console.log('Sync-user API - Error adding clerk_id column:', columnError);
          } else {
            console.log('Sync-user API - clerk_id column added or already exists');
          }
        } catch (columnError) {
          console.log('Sync-user API - Error adding clerk_id column:', columnError);
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
        
        // Insert new user - let Supabase generate the UUID
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email,
            clerk_id: userId
          })
          .select();
          
        if (insertError) {
          console.error('Sync-user API - Error inserting user:', insertError);
          console.error('Sync-user API - Error details:', JSON.stringify(insertError));
          
          // Try a different approach if the first one fails
          console.log('Sync-user API - Trying direct SQL insert');
          
          try {
            const insertUserQuery = `
              INSERT INTO users (name, email, clerk_id)
              VALUES ('${name.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}', '${userId}')
              RETURNING *;
            `;
            
            const { data: sqlResult, error: sqlError } = await supabaseClient.rpc('exec_sql', { 
              query: insertUserQuery 
            });
            
            if (sqlError) {
              console.error('Sync-user API - Error with SQL insert:', sqlError);
              return NextResponse.json(
                { error: 'Error inserting user to Supabase' },
                { status: 500 }
              );
            }
            
            console.log('Sync-user API - Successfully inserted user with SQL:', sqlResult);
            
            // Try to get the newly created user
            const { data: createdUser, error: fetchError } = await supabaseClient
              .from('users')
              .select('*')
              .eq('clerk_id', userId)
              .single();
              
            if (fetchError) {
              console.error('Sync-user API - Error fetching newly created user:', fetchError);
              return NextResponse.json(
                { 
                  success: true,
                  user: {
                    id: sqlResult?.[0]?.id || userId,
                    name,
                    email
                  }
                }
              );
            }
            
            return NextResponse.json({ 
              success: true,
              user: createdUser
            });
          } catch (sqlError) {
            console.error('Sync-user API - Error with SQL approach:', sqlError);
            return NextResponse.json(
              { error: 'Error inserting user to Supabase' },
              { status: 500 }
            );
          }
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