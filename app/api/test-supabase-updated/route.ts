import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { saveFusion, uploadImageFromUrl } from '@/lib/supabase-server-actions';

export async function GET() {
  try {
    console.log('Test Supabase Updated API - Starting test');
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Test Supabase Updated API - Supabase URL:', supabaseUrl);
    console.log('Test Supabase Updated API - Supabase Service Key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Test Supabase Updated API - Missing Supabase credentials');
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test data
    const testUserId = uuidv4();
    const pokemon1Id = 25; // Pikachu
    const pokemon2Id = 1;  // Bulbasaur
    const fusionName = 'Pikasaur';
    const fusionImage = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'; // Just a placeholder
    
    console.log('Test Supabase Updated API - Test User ID:', testUserId);
    
    // First, create a test user
    console.log('Test Supabase Updated API - Creating test user');
    const testUser = {
      id: testUserId,
      name: 'Test User',
      email: `test-${Date.now()}@example.com`
    };
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert(testUser)
      .select();
    
    if (userError) {
      console.error('Test Supabase Updated API - Error creating test user:', userError);
      return NextResponse.json({ error: `Error creating test user: ${userError.message}` }, { status: 500 });
    }
    
    console.log('Test Supabase Updated API - Test user created successfully:', userData);
    
    // Test the saveFusion function
    console.log('Test Supabase Updated API - Testing saveFusion function');
    const result = await saveFusion({
      userId: testUserId,
      pokemon1Id,
      pokemon2Id,
      fusionName,
      fusionImage
    });
    
    if (result.error) {
      console.error('Test Supabase Updated API - Error saving fusion:', result.error);
      return NextResponse.json({ error: `Error saving fusion: ${result.error}` }, { status: 500 });
    }
    
    console.log('Test Supabase Updated API - Fusion saved successfully:', result.data);
    
    // Return success response
    return NextResponse.json({
      success: true,
      user: userData,
      fusion: result.data,
      message: 'Supabase connection test successful'
    });
  } catch (error) {
    console.error('Test Supabase Updated API - Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
} 