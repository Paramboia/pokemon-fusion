import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Log the values (without revealing full keys)
    console.log('Test Env API - Supabase URL:', supabaseUrl);
    console.log('Test Env API - Anon Key available:', !!supabaseAnonKey);
    console.log('Test Env API - Service Key available:', !!supabaseServiceKey);
    
    return NextResponse.json({
      success: true,
      environment: {
        supabaseUrl: supabaseUrl,
        supabaseAnonKeyAvailable: !!supabaseAnonKey,
        supabaseAnonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
        supabaseServiceKeyAvailable: !!supabaseServiceKey,
        supabaseServiceKeyLength: supabaseServiceKey ? supabaseServiceKey.length : 0,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Test Env API - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 