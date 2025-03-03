import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

export async function GET() {
  try {
    console.log('Simple Test Supabase API - Checking connection');
    console.log('Simple Test Supabase API - Supabase URL:', supabaseUrl);
    console.log('Simple Test Supabase API - Supabase Service Key available:', !!supabaseServiceKey);
    console.log('Simple Test Supabase API - Supabase Service Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);
    
    // Create a server-side Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Test listing buckets
    console.log('Simple Test Supabase API - Listing storage buckets');
    const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Simple Test Supabase API - Error listing buckets:', bucketsError);
      return NextResponse.json({
        success: false,
        error: bucketsError.message,
        step: 'listing buckets'
      }, { status: 500 });
    }
    
    console.log('Simple Test Supabase API - Buckets found:', buckets?.length || 0);
    
    return NextResponse.json({
      success: true,
      buckets: buckets,
      message: 'Supabase connection test successful'
    });
  } catch (error) {
    console.error('Simple Test Supabase API - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      step: 'unexpected error'
    }, { status: 500 });
  }
} 