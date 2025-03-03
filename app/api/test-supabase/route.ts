import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

export async function GET() {
  try {
    console.log('Test Supabase API - Checking connection');
    console.log('Test Supabase API - Supabase URL:', supabaseUrl);
    console.log('Test Supabase API - Supabase Service Key available:', !!supabaseServiceKey);
    console.log('Test Supabase API - Supabase Service Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);
    
    // Create a server-side Supabase client
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
    
    // Test listing buckets
    console.log('Test Supabase API - Listing storage buckets');
    const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Test Supabase API - Error listing buckets:', bucketsError);
      return NextResponse.json({
        success: false,
        error: bucketsError.message,
        step: 'listing buckets'
      }, { status: 500 });
    }
    
    console.log('Test Supabase API - Buckets found:', buckets?.length || 0);
    
    // Test creating a test record
    console.log('Test Supabase API - Creating test record');
    const testData = {
      id: `test_${Date.now()}`,
      user_id: `test_user_${Date.now()}`,
      pokemon_1_id: 1,
      pokemon_2_id: 2,
      fusion_name: 'TestFusion',
      fusion_image: 'https://example.com/test.png',
      likes: 0
    };
    
    const { data: insertData, error: insertError } = await supabaseClient
      .from('fusions')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Test Supabase API - Error inserting test record:', insertError);
      return NextResponse.json({
        success: false,
        error: insertError.message,
        step: 'inserting test record',
        buckets: buckets
      }, { status: 500 });
    }
    
    console.log('Test Supabase API - Test record created:', insertData);
    
    // Test creating a test bucket if it doesn't exist
    const testBucket = 'test-bucket';
    const bucketExists = buckets?.some(b => b.name === testBucket);
    
    if (!bucketExists) {
      console.log(`Test Supabase API - Creating test bucket: ${testBucket}`);
      const { error: createBucketError } = await supabaseClient.storage.createBucket(testBucket, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createBucketError) {
        console.error(`Test Supabase API - Error creating test bucket:`, createBucketError);
        return NextResponse.json({
          success: false,
          error: createBucketError.message,
          step: 'creating test bucket',
          buckets: buckets,
          insertData: insertData
        }, { status: 500 });
      }
      
      console.log(`Test Supabase API - Test bucket created successfully`);
    } else {
      console.log(`Test Supabase API - Test bucket already exists`);
    }
    
    return NextResponse.json({
      success: true,
      buckets: buckets,
      insertData: insertData,
      message: 'Supabase connection test successful'
    });
  } catch (error) {
    console.error('Test Supabase API - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      step: 'unexpected error'
    }, { status: 500 });
  }
} 