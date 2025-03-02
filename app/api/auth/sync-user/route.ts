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
    
    console.log('Sync-user API - Check table result:', { data, error: error ? { code: error.code, message: error.message } : null });
      
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Sync-user API - Users table does not exist, creating it');
        
        // Create the users table with the correct schema - without clerk_id
        const { error: createError } = await supabaseClient.rpc('exec_sql', {
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
      } else {
        // Try a different approach if the RPC method fails
        console.log('Sync-user API - Error checking table, trying direct SQL');
        try {
          const { error: directError } = await supabaseClient
            .from('users')
            .insert({
              name: 'Test User',
              email: 'test@example.com'
            });
            
          if (directError && directError.code === '42P01') {
            console.log('Sync-user API - Table does not exist, creating it directly');
            // Table doesn't exist, try to create it
            const createTableSQL = `
              CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
            `;
            
            // Use raw SQL to create the table
            const { error: sqlError } = await supabaseClient.rpc('exec_sql', {
              sql: createTableSQL
            });
            
            if (sqlError) {
              console.error('Sync-user API - Error creating table with direct SQL:', sqlError);
              return false;
            }
            
            console.log('Sync-user API - Table created successfully with direct SQL');
          } else if (!directError) {
            // If the insert worked, delete the test user
            await supabaseClient
              .from('users')
              .delete()
              .eq('email', 'test@example.com');
              
            console.log('Sync-user API - Table exists, test user deleted');
          } else {
            console.error('Sync-user API - Unknown error checking table:', directError);
            return false;
          }
        } catch (sqlError) {
          console.error('Sync-user API - Exception in direct SQL approach:', sqlError);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Sync-user API - Error ensuring users table:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    console.log('Sync-user API - POST request received');
    
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
    console.log('Sync-user API - Checking if users table exists');
    const tableExists = await ensureUsersTable();
    if (!tableExists) {
      console.error('Sync-user API - Failed to ensure users table exists');
      return NextResponse.json(
        { error: 'Database setup failed' },
        { status: 500 }
      );
    }
    console.log('Sync-user API - Users table exists or was created successfully');

    try {
      // Check if user already exists by email
      console.log('Sync-user API - Checking if user exists with email:', email);
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      console.log('Sync-user API - User lookup result:', { 
        existingUser, 
        fetchError: fetchError ? { code: fetchError.code, message: fetchError.message } : null 
      });

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
          
        console.log('Sync-user API - Update result:', { 
          updatedUser, 
          updateError: updateError ? { code: updateError.code, message: updateError.message } : null 
        });
          
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
          
        console.log('Sync-user API - Insert result:', { 
          newUser, 
          insertError: insertError ? { code: insertError.code, message: insertError.message } : null 
        });
          
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