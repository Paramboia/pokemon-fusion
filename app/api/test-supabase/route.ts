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

export async function GET() {
  try {
    console.log('Test endpoint - Supabase URL:', supabaseUrl);
    console.log('Test endpoint - Service Key available:', !!supabaseServiceKey);
    
    // Try to create the users table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log('Test endpoint - Attempting to create users table if it doesn\'t exist');
    const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
    
    if (createTableError) {
      console.error('Test endpoint - Error creating users table:', createTableError);
      
      // Try a simple query instead
      console.log('Test endpoint - Attempting to query users table');
      const { data: users, error: queryError } = await supabaseClient
        .from('users')
        .select('*')
        .limit(5);
      
      if (queryError) {
        console.error('Test endpoint - Error querying users table:', queryError);
        return NextResponse.json({ 
          success: false, 
          error: queryError,
          message: 'Error querying users table'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully queried users table',
        users
      });
    }
    
    // Try to insert a test user
    console.log('Test endpoint - Attempting to insert a test user');
    const { data: newUser, error: insertError } = await supabaseClient
      .from('users')
      .insert({
        name: 'Test User',
        email: `test-${Date.now()}@example.com`
      })
      .select();
    
    if (insertError) {
      console.error('Test endpoint - Error inserting test user:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: insertError,
        message: 'Error inserting test user'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully created users table and inserted test user',
      user: newUser
    });
  } catch (error) {
    console.error('Test endpoint - Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error,
      message: 'Unexpected error'
    }, { status: 500 });
  }
} 