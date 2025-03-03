import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkSupabaseConnection } from '@/lib/supabase-client';
import { getSupabaseClient, getSupabaseAdminClient } from '@/lib/supabase-server';
import { checkSupabaseActionConnection } from '@/lib/supabase-server-actions';

export async function GET() {
  try {
    console.log('Supabase Health Check API - Starting checks');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Check environment variables
    const envStatus = {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    };
    
    console.log('Supabase Health Check API - Environment variables:', envStatus);
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        environment: envStatus,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
    // Create Supabase clients
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = await getSupabaseAdminClient();
    
    // Check client-side connection
    let clientConnectionStatus = false;
    try {
      const { data: clientData, error: clientError } = await supabaseAnon
        .from('pokemon')
        .select('id')
        .limit(1);
      
      clientConnectionStatus = !clientError;
      console.log('Supabase Health Check API - Client connection status:', clientConnectionStatus);
      
      if (clientError) {
        console.error('Supabase Health Check API - Client connection error:', clientError);
      }
    } catch (error) {
      console.error('Supabase Health Check API - Client connection error:', error);
    }
    
    // Check server-side connection
    let serverConnectionStatus = false;
    try {
      const { data: serverData, error: serverError } = await supabaseAdmin
        .from('pokemon')
        .select('id')
        .limit(1);
      
      serverConnectionStatus = !serverError;
      console.log('Supabase Health Check API - Server connection status:', serverConnectionStatus);
      
      if (serverError) {
        console.error('Supabase Health Check API - Server connection error:', serverError);
      }
    } catch (error) {
      console.error('Supabase Health Check API - Server connection error:', error);
    }
    
    // Check storage connection
    let storageConnectionStatus = false;
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      
      storageConnectionStatus = !bucketsError;
      console.log('Supabase Health Check API - Storage connection status:', storageConnectionStatus);
      
      if (bucketsError) {
        console.error('Supabase Health Check API - Storage connection error:', bucketsError);
      } else {
        console.log('Supabase Health Check API - Storage buckets:', buckets.map(b => b.name));
      }
    } catch (error) {
      console.error('Supabase Health Check API - Storage connection error:', error);
    }
    
    // Return the results
    return NextResponse.json({
      success: clientConnectionStatus && serverConnectionStatus && storageConnectionStatus,
      connections: {
        client: clientConnectionStatus,
        server: serverConnectionStatus,
        storage: storageConnectionStatus,
      },
      environment: envStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Supabase Health Check API - Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error checking Supabase connections',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 