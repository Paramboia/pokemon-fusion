import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a server-side Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper function to ensure the users table exists
async function ensureUsersTable() {
  try {
    console.log('Ensuring users table exists');
    
    // Check if the users table exists
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking users table:', error);
      return false;
    }
    
    console.log('Users table exists');
    return true;
  } catch (error) {
    console.error('Error ensuring users table:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    console.log('=== Sync-user API called ===');
    
    // Log Supabase configuration
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Service Key available:', !!supabaseServiceKey);
    if (supabaseServiceKey) {
      console.log('Supabase Service Key first 10 chars:', supabaseServiceKey.substring(0, 10) + '...');
    }
    
    // Log request headers
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Request headers:', headers);
    
    // Parse the request body
    const userData = await request.json();
    console.log('Received user data:', JSON.stringify(userData, null, 2));
    
    // Extract user information
    const userId = userData.id;
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    const email = userData.emailAddresses?.[0]?.emailAddress;
    const name = `${firstName} ${lastName}`.trim() || 'Unknown User';
    
    console.log('Extracted user info:', { userId, name, email });
    
    // Validate required fields
    if (!email) {
      console.error('Missing required email');
      return NextResponse.json(
        { error: 'Missing required email' },
        { status: 400 }
      );
    }
    
    // Ensure the users table exists
    const tableExists = await ensureUsersTable();
    if (!tableExists) {
      console.error('Failed to ensure users table exists');
      return NextResponse.json(
        { error: 'Database setup failed' },
        { status: 500 }
      );
    }
    
    try {
      // Check if user already exists by email
      console.log('Checking if user exists with email:', email);
      const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
        return NextResponse.json(
          { error: 'Error fetching user from Supabase' },
          { status: 500 }
        );
      }
      
      if (existingUser) {
        console.log('Updating existing user with ID:', existingUser.id);
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update({
            name
          })
          .eq('id', existingUser.id)
          .select();
        
        if (updateError) {
          console.error('Error updating user:', updateError);
          return NextResponse.json(
            { error: 'Error updating user in Supabase' },
            { status: 500 }
          );
        }
        
        console.log('Successfully updated user in Supabase:', updatedUser);
        
        return NextResponse.json({ 
          success: true, 
          message: 'User updated successfully',
          timestamp: new Date().toISOString(),
          user: updatedUser?.[0] || existingUser
        });
      } else {
        console.log('Creating new user with name:', name, 'and email:', email);
        
        // Insert new user
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name,
            email
          })
          .select();
        
        if (insertError) {
          console.error('Error inserting user:', insertError);
          return NextResponse.json(
            { error: 'Error inserting user to Supabase' },
            { status: 500 }
          );
        }
        
        console.log('Successfully inserted new user in Supabase:', newUser);
        
        return NextResponse.json({ 
          success: true,
          message: 'User created successfully',
          timestamp: new Date().toISOString(),
          user: newUser?.[0] || null
        });
      }
    } catch (dbError) {
      console.error('Error syncing user to Supabase:', dbError);
      return NextResponse.json(
        { error: 'Error syncing user to Supabase', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in sync-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 