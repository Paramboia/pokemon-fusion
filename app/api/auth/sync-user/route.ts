import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

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

// Helper function to check if clerk_id column exists
async function ensureClerkIdColumn() {
  try {
    console.log('Checking if clerk_id column exists');
    
    // Try to select the clerk_id column
    const { data, error } = await supabaseClient
      .from('users')
      .select('clerk_id')
      .limit(1);
    
    if (error && error.message.includes('column "clerk_id" does not exist')) {
      console.log('clerk_id column does not exist, skipping clerk_id updates');
      return false;
    }
    
    console.log('clerk_id column exists');
    return true;
  } catch (error) {
    console.error('Error checking clerk_id column:', error);
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
    
    // Get authenticated user ID from Clerk
    const { userId: authUserId } = auth();
    console.log('Authenticated user ID from Clerk:', authUserId);
    
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
    const userId = userData.id || authUserId;
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    const email = userData.emailAddresses?.[0]?.emailAddress;
    const name = `${firstName} ${lastName}`.trim() || 'Unknown User';
    
    console.log('Extracted user info:', { userId, name, email });
    
    // Validate required fields
    if (!userId) {
      console.error('Missing required user ID');
      return NextResponse.json(
        { error: 'Missing required user ID' },
        { status: 400 }
      );
    }
    
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
    
    // Check if clerk_id column exists
    const clerkIdColumnExists = await ensureClerkIdColumn();
    
    try {
      // First check if user already exists by clerk_id
      let existingUser = null;
      
      if (clerkIdColumnExists) {
        console.log('Checking if user exists with clerk_id:', userId);
        const { data: userByClerkId, error: clerkIdError } = await supabaseClient
          .from('users')
          .select('*')
          .eq('clerk_id', userId)
          .maybeSingle();
        
        if (clerkIdError && !clerkIdError.message.includes('Results contain 0 rows')) {
          console.error('Error fetching user by clerk_id:', clerkIdError);
        }
        
        if (userByClerkId) {
          console.log('Found user by clerk_id:', userByClerkId.id);
          existingUser = userByClerkId;
        }
      }
      
      // If not found by clerk_id, check by email
      if (!existingUser) {
        console.log('Checking if user exists with email:', email);
        const { data: userByEmail, error: emailError } = await supabaseClient
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (emailError && !emailError.message.includes('Results contain 0 rows')) {
          console.error('Error fetching user by email:', emailError);
        }
        
        if (userByEmail) {
          console.log('Found user by email:', userByEmail.id);
          existingUser = userByEmail;
        }
      }
      
      if (existingUser) {
        console.log('Updating existing user with ID:', existingUser.id);
        
        // Prepare update data
        const updateData: any = { name };
        
        // Add clerk_id to update if the column exists and it's not already set
        if (clerkIdColumnExists && (!existingUser.clerk_id || existingUser.clerk_id !== userId)) {
          console.log('Adding clerk_id to update data:', userId);
          updateData.clerk_id = userId;
        }
        
        // Update existing user
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update(updateData)
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
        
        // Prepare insert data
        const insertData: any = {
          name,
          email,
          credits_balance: 0 // Initialize with 0 credits
        };
        
        // Add clerk_id to insert if the column exists
        if (clerkIdColumnExists) {
          console.log('Adding clerk_id to insert data:', userId);
          insertData.clerk_id = userId;
        }
        
        // Insert new user
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert(insertData)
          .select();
        
        if (insertError) {
          console.error('Error inserting user:', insertError);
          
          // If error is related to clerk_id, try without it
          if (insertError.message.includes('clerk_id') && clerkIdColumnExists) {
            console.log('Retrying insert without clerk_id');
            delete insertData.clerk_id;
            
            const { data: retryUser, error: retryError } = await supabaseClient
              .from('users')
              .insert(insertData)
              .select();
              
            if (retryError) {
              console.error('Error on retry insert:', retryError);
              return NextResponse.json(
                { error: 'Error inserting user to Supabase' },
                { status: 500 }
              );
            }
            
            console.log('Successfully inserted new user on retry:', retryUser);
            
            // Try to update with clerk_id after successful insert
            if (retryUser?.[0]?.id) {
              try {
                const { error: updateError } = await supabaseClient
                  .from('users')
                  .update({ clerk_id: userId })
                  .eq('id', retryUser[0].id);
                  
                if (updateError) {
                  console.error('Error updating new user with clerk_id:', updateError);
                } else {
                  console.log('Updated new user with clerk_id');
                }
              } catch (updateError) {
                console.error('Exception updating new user with clerk_id:', updateError);
              }
            }
            
            return NextResponse.json({ 
              success: true,
              message: 'User created successfully on retry',
              timestamp: new Date().toISOString(),
              user: retryUser?.[0] || null
            });
          }
          
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