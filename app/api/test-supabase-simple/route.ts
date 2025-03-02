import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Get Clerk user info
    const user = await currentUser();
    const { userId } = auth();
    
    // Log the values (without revealing full keys)
    console.log('Test Simple API - Supabase URL:', supabaseUrl);
    console.log('Test Simple API - Anon Key available:', !!supabaseAnonKey);
    console.log('Test Simple API - Service Key available:', !!supabaseServiceKey);
    console.log('Test Simple API - Clerk user:', user ? 'Found' : 'Not found');
    console.log('Test Simple API - Clerk userId from auth():', userId);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing Supabase credentials',
        url: !!supabaseUrl,
        serviceKey: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        // IMPORTANT: We're using Clerk for authentication, NOT Supabase Auth
        // These settings explicitly disable all Supabase Auth functionality
        persistSession: false,
        autoRefreshToken: false,
        flowType: 'implicit',  // Most minimal flow type
        storage: null,  // Don't store anything in local storage
      },
    });
    
    console.log('Test Simple API - Supabase client created with Auth DISABLED - using Clerk for authentication only');
    
    // Try to connect to Supabase
    console.log('Test Simple API - Testing connection to Supabase...');
    
    // Just try to get the health status
    const { data, error } = await supabase.from('users').select('*').limit(5);
    
    if (error) {
      console.error('Test Simple API - Error connecting to Supabase:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to connect to Supabase',
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        },
        auth: {
          clerkUser: user ? {
            id: user.id,
            email: user.emailAddresses?.[0]?.emailAddress,
            name: user.firstName
          } : null,
          clerkUserId: userId
        }
      }, { status: 500 });
    }
    
    // Try to create a test user if authenticated
    let testUserResult = null;
    if (user && user.emailAddresses?.[0]?.emailAddress) {
      try {
        console.log('Test Simple API - Creating test user for authenticated user');
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.emailAddresses[0].emailAddress)
          .single();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Test Simple API - Error checking for existing user:', fetchError);
          testUserResult = {
            success: false,
            error: fetchError
          };
        } else if (existingUser) {
          console.log('Test Simple API - User already exists:', existingUser);
          testUserResult = {
            success: true,
            message: 'User already exists',
            user: existingUser
          };
        } else {
          // Create a new user
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              name: user.firstName || 'Test User',
              email: user.emailAddresses[0].emailAddress
            })
            .select();
            
          if (insertError) {
            console.error('Test Simple API - Error creating test user:', insertError);
            testUserResult = {
              success: false,
              error: insertError
            };
          } else {
            console.log('Test Simple API - Test user created:', newUser);
            testUserResult = {
              success: true,
              message: 'User created successfully',
              user: newUser[0]
            };
          }
        }
      } catch (error) {
        console.error('Test Simple API - Error in test user creation:', error);
        testUserResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase',
      data,
      auth: {
        clerkUser: user ? {
          id: user.id,
          email: user.emailAddresses?.[0]?.emailAddress,
          name: user.firstName
        } : null,
        clerkUserId: userId
      },
      testUserResult
    });
  } catch (error) {
    console.error('Test Simple API - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 