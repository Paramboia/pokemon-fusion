import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
// import { auth } from '@clerk/nextjs/server';

// Log environment variables for debugging
console.log('Likes API - NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Likes API - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    console.log("Likes API - POST request received");
    
    // Parse the request body
    const body = await req.json();
    const { fusionId } = body;
    
    console.log("Likes API - Request body:", { fusionId });
    
    // Validate the input
    if (!fusionId) {
      console.error("Likes API - Missing required fields");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Likes API - Supabase credentials not available');
      return NextResponse.json({ 
        error: 'Supabase credentials not available',
        supabaseUrlAvailable: !!supabaseUrl,
        supabaseServiceKeyAvailable: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user ID from the session or generate a test user ID
    let userId;
    try {
      // For testing, create a test user instead of using Clerk auth
      // const session = await auth();
      // userId = session?.userId;
      // console.log('User ID from auth():', userId);
      
      // Create a test user
      const testUserId = uuidv4();
      console.log('Created test user ID:', testUserId);
      
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
        return NextResponse.json({ 
          error: 'Error creating test user',
          details: userError
        }, { status: 500 });
      }
      
      console.log('Test user created successfully:', userData);
      userId = testUserId;
    } catch (authError) {
      console.error('Error getting user ID:', authError);
      return NextResponse.json({ 
        error: 'Authentication error',
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 500 });
    }
    
    // Check if the fusion exists
    console.log('Checking if fusion exists...');
    const { data: fusionData, error: fusionError } = await supabase
      .from('fusions')
      .select('id, likes')
      .eq('id', fusionId)
      .single();
    
    if (fusionError) {
      console.error('Error checking fusion:', fusionError);
      return NextResponse.json({ 
        error: 'Error checking fusion',
        details: fusionError
      }, { status: 500 });
    }
    
    if (!fusionData) {
      console.error('Fusion not found');
      return NextResponse.json({ error: 'Fusion not found' }, { status: 404 });
    }
    
    console.log('Fusion found:', fusionData);
    
    // Check if the user has already liked this fusion
    console.log('Checking if user has already liked this fusion...');
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);
    
    if (favoriteError) {
      console.error('Error checking favorite:', favoriteError);
      return NextResponse.json({ 
        error: 'Error checking favorite',
        details: favoriteError
      }, { status: 500 });
    }
    
    // If the user has already liked this fusion, return an error
    if (favoriteData && favoriteData.length > 0) {
      console.log('User has already liked this fusion');
      return NextResponse.json({ 
        error: 'User has already liked this fusion',
        alreadyLiked: true
      }, { status: 400 });
    }
    
    // Add the favorite
    console.log('Adding favorite...');
    const { data: newFavoriteData, error: newFavoriteError } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        fusion_id: fusionId
      })
      .select();
    
    if (newFavoriteError) {
      console.error('Error adding favorite:', newFavoriteError);
      return NextResponse.json({ 
        error: 'Error adding favorite',
        details: newFavoriteError
      }, { status: 500 });
    }
    
    console.log('Favorite added successfully:', newFavoriteData);
    
    // Update the likes count in the fusion
    console.log('Updating likes count...');
    const newLikesCount = (fusionData.likes || 0) + 1;
    
    const { data: updatedFusionData, error: updateError } = await supabase
      .from('fusions')
      .update({ likes: newLikesCount })
      .eq('id', fusionId)
      .select();
    
    if (updateError) {
      console.error('Error updating likes count:', updateError);
      return NextResponse.json({ 
        error: 'Error updating likes count',
        details: updateError
      }, { status: 500 });
    }
    
    console.log('Likes count updated successfully:', updatedFusionData);
    
    // Return the result
    return NextResponse.json({
      success: true,
      message: 'Fusion liked successfully',
      favorite: newFavoriteData,
      fusion: updatedFusionData
    });
  } catch (error) {
    console.error("Likes API - Error in POST handler:", error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    console.log("Likes API - DELETE request received");
    
    // Parse the URL to get the fusion ID
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');
    
    console.log("Likes API - Request params:", { fusionId });
    
    // Validate the input
    if (!fusionId) {
      console.error("Likes API - Missing required fields");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Likes API - Supabase credentials not available');
      return NextResponse.json({ 
        error: 'Supabase credentials not available',
        supabaseUrlAvailable: !!supabaseUrl,
        supabaseServiceKeyAvailable: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user ID from the session or use a test user ID
    let userId;
    try {
      // For testing, use a test user ID instead of Clerk auth
      // const session = await auth();
      // userId = session?.userId;
      // console.log('User ID from auth():', userId);
      
      // For testing purposes, find a user who has liked this fusion
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('user_id')
        .eq('fusion_id', fusionId)
        .limit(1);
      
      if (favoriteError) {
        console.error('Error finding user who liked this fusion:', favoriteError);
        
        // Create a test user as fallback
        const testUserId = uuidv4();
        console.log('Created test user ID as fallback:', testUserId);
        
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
          return NextResponse.json({ 
            error: 'Error creating test user',
            details: userError
          }, { status: 500 });
        }
        
        console.log('Test user created successfully:', userData);
        userId = testUserId;
      } else if (favoriteData && favoriteData.length > 0) {
        userId = favoriteData[0].user_id;
        console.log('Found user who liked this fusion:', userId);
      } else {
        console.log('No user found who liked this fusion, creating a test user');
        
        // Create a test user
        const testUserId = uuidv4();
        console.log('Created test user ID:', testUserId);
        
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
          return NextResponse.json({ 
            error: 'Error creating test user',
            details: userError
          }, { status: 500 });
        }
        
        console.log('Test user created successfully:', userData);
        userId = testUserId;
        
        // Add a favorite for this user and fusion
        const { error: addFavoriteError } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            fusion_id: fusionId
          });
        
        if (addFavoriteError) {
          console.error('Error adding favorite for test user:', addFavoriteError);
          return NextResponse.json({ 
            error: 'Error adding favorite for test user',
            details: addFavoriteError
          }, { status: 500 });
        }
        
        console.log('Added favorite for test user');
      }
    } catch (authError) {
      console.error('Error getting user ID:', authError);
      return NextResponse.json({ 
        error: 'Authentication error',
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 500 });
    }
    
    // Check if the fusion exists
    console.log('Checking if fusion exists...');
    const { data: fusionData, error: fusionError } = await supabase
      .from('fusions')
      .select('id, likes')
      .eq('id', fusionId)
      .single();
    
    if (fusionError) {
      console.error('Error checking fusion:', fusionError);
      return NextResponse.json({ 
        error: 'Error checking fusion',
        details: fusionError
      }, { status: 500 });
    }
    
    if (!fusionData) {
      console.error('Fusion not found');
      return NextResponse.json({ error: 'Fusion not found' }, { status: 404 });
    }
    
    console.log('Fusion found:', fusionData);
    
    // Check if the user has liked this fusion
    console.log('Checking if user has liked this fusion...');
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);
    
    if (favoriteError) {
      console.error('Error checking favorite:', favoriteError);
      return NextResponse.json({ 
        error: 'Error checking favorite',
        details: favoriteError
      }, { status: 500 });
    }
    
    // If the user hasn't liked this fusion, return an error
    if (!favoriteData || favoriteData.length === 0) {
      console.log('User has not liked this fusion');
      return NextResponse.json({ 
        error: 'User has not liked this fusion',
        notLiked: true
      }, { status: 400 });
    }
    
    // Remove the favorite
    console.log('Removing favorite...');
    const { error: removeFavoriteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);
    
    if (removeFavoriteError) {
      console.error('Error removing favorite:', removeFavoriteError);
      return NextResponse.json({ 
        error: 'Error removing favorite',
        details: removeFavoriteError
      }, { status: 500 });
    }
    
    console.log('Favorite removed successfully');
    
    // Update the likes count in the fusion
    console.log('Updating likes count...');
    const newLikesCount = Math.max((fusionData.likes || 0) - 1, 0);
    
    const { data: updatedFusionData, error: updateError } = await supabase
      .from('fusions')
      .update({ likes: newLikesCount })
      .eq('id', fusionId)
      .select();
    
    if (updateError) {
      console.error('Error updating likes count:', updateError);
      return NextResponse.json({ 
        error: 'Error updating likes count',
        details: updateError
      }, { status: 500 });
    }
    
    console.log('Likes count updated successfully:', updatedFusionData);
    
    // Return the result
    return NextResponse.json({
      success: true,
      message: 'Fusion unliked successfully',
      fusion: updatedFusionData
    });
  } catch (error) {
    console.error("Likes API - Error in DELETE handler:", error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 