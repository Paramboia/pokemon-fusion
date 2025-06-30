import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

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
    
    // Get authenticated user from Clerk
    const session = await auth();
    const clerkUserId = session?.userId;
    
    if (!clerkUserId) {
      console.error('Likes API - No authenticated user found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Likes API - Authenticated user:', clerkUserId);
    
    // Get the corresponding Supabase user ID using the reliable function
    const supabaseUserId = await getSupabaseUserIdFromClerk(clerkUserId);
    
    if (!supabaseUserId) {
      console.error('Likes API - User not found in database');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('Likes API - Supabase user ID:', supabaseUserId);
    
    // Get Supabase client
    const supabase = await getSupabaseAdminClient();
    
    if (!supabase) {
      console.error('Likes API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
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
      .eq('user_id', supabaseUserId)
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
        user_id: supabaseUserId,
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
    
    // Get authenticated user from Clerk
    const session = await auth();
    const clerkUserId = session?.userId;
    
    if (!clerkUserId) {
      console.error('Likes API - No authenticated user found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Likes API - Authenticated user:', clerkUserId);
    
    // Get the corresponding Supabase user ID using the reliable function
    const supabaseUserId = await getSupabaseUserIdFromClerk(clerkUserId);
    
    if (!supabaseUserId) {
      console.error('Likes API - User not found in database');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('Likes API - Supabase user ID:', supabaseUserId);
    
    // Get Supabase client
    const supabase = await getSupabaseAdminClient();
    
    if (!supabase) {
      console.error('Likes API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
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
      .eq('user_id', supabaseUserId)
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
      .eq('user_id', supabaseUserId)
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