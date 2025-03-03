import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    console.log('Test Supabase API - GET request received');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Service Key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase credentials not available',
        supabaseUrlAvailable: !!supabaseUrl,
        supabaseServiceKeyAvailable: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test connection by querying the pokemon table
    const { data: pokemonData, error: pokemonError } = await supabase
      .from('pokemon')
      .select('id, name')
      .limit(5);
    
    if (pokemonError) {
      console.error('Error querying pokemon table:', pokemonError);
      return NextResponse.json({ 
        error: 'Error querying pokemon table',
        details: pokemonError
      }, { status: 500 });
    }
    
    // Test connection by querying the fusions table
    const { data: fusionsData, error: fusionsError } = await supabase
      .from('fusions')
      .select('id, fusion_name')
      .limit(5);
    
    // Return the results
    return NextResponse.json({
      message: 'Supabase connection test successful',
      pokemon: pokemonData,
      fusions: fusionsError ? null : fusionsData,
      fusionsError: fusionsError ? fusionsError.message : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-supabase GET handler:', error);
    return NextResponse.json({ 
      error: 'Error testing Supabase connection',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log('Test Supabase API - POST request received');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Service Key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase credentials not available',
        supabaseUrlAvailable: !!supabaseUrl,
        supabaseServiceKeyAvailable: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse the request body
    const body = await req.json();
    const { testInsert } = body;
    
    let insertResult = null;
    let insertError = null;
    
    // Test insert if requested
    if (testInsert) {
      // Create a test user
      const testUserId = uuidv4();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          name: 'Test User',
          email: `test-${Date.now()}@example.com`
        })
        .select();
      
      if (userError) {
        console.error('Error creating test user:', userError);
        insertError = userError;
      } else {
        // Create a test fusion
        const { data: fusionData, error: fusionError } = await supabase
          .from('fusions')
          .insert({
            id: uuidv4(),
            user_id: testUserId,
            pokemon_1_id: 25,
            pokemon_2_id: 1,
            fusion_name: 'Test Pikasaur',
            fusion_image: 'https://example.com/test-image.png',
            likes: 0
          })
          .select();
        
        if (fusionError) {
          console.error('Error creating test fusion:', fusionError);
          insertError = fusionError;
        } else {
          insertResult = {
            user: userData,
            fusion: fusionData
          };
        }
      }
    }
    
    // Return the results
    return NextResponse.json({
      message: 'Supabase connection test successful',
      testInsert: testInsert ? true : false,
      insertResult,
      insertError: insertError ? insertError.message : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-supabase POST handler:', error);
    return NextResponse.json({ 
      error: 'Error testing Supabase connection',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 