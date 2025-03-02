import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

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

export async function GET(req: Request) {
  try {
    console.log('Test Supabase API - GET request received');
    console.log('Test Supabase API - Supabase URL:', supabaseUrl);
    console.log('Test Supabase API - Service Key available:', !!supabaseServiceKey);
    
    // Test if we can connect to Supabase
    console.log('Test Supabase API - Testing connection to Supabase');
    
    // Try to list all tables
    const { data: tables, error: tablesError } = await supabaseClient.rpc('get_tables');
    
    if (tablesError) {
      console.error('Test Supabase API - Error listing tables:', tablesError);
      
      // Try a different approach
      console.log('Test Supabase API - Trying to query users table directly');
      const { data: users, error: usersError } = await supabaseClient
        .from('users')
        .select('*')
        .limit(1);
        
      console.log('Test Supabase API - Users query result:', { 
        users, 
        usersError: usersError ? { code: usersError.code, message: usersError.message } : null 
      });
      
      if (usersError) {
        // Try to create a test user
        console.log('Test Supabase API - Trying to create a test user');
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            name: 'Test User',
            email: 'test-' + Date.now() + '@example.com'
          })
          .select();
          
        console.log('Test Supabase API - Insert result:', { 
          newUser, 
          insertError: insertError ? { code: insertError.code, message: insertError.message } : null 
        });
        
        if (insertError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to connect to Supabase',
            tablesError,
            usersError,
            insertError
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Successfully created a test user',
          newUser
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Successfully queried users table',
        users
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase',
      tables
    });
  } catch (error) {
    console.error('Test Supabase API - Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Error connecting to Supabase',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 