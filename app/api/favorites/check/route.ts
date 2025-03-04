import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

// Helper function to get the Supabase user ID from Clerk ID
async function getSupabaseUserId(clerkId: string): Promise<string | null> {
  try {
    console.log('Favorites Check API - Looking up Supabase user for Clerk ID:', clerkId);
    
    // Get the Supabase admin client
    const supabaseClient = await getSupabaseAdminClient();
    
    // First, try to find the user directly by Clerk ID
    const { data: userByClerkId, error: clerkIdError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .maybeSingle();
    
    if (userByClerkId) {
      console.log('Favorites Check API - Found Supabase user by Clerk ID:', userByClerkId.id);
      return userByClerkId.id;
    }
    
    // If not found by Clerk ID, try to find by email
    try {
      const user = await clerkClient.users.getUser(clerkId);
      console.log('Favorites Check API - Clerk user found:', user ? 'Yes' : 'No');
      
      if (user && user.emailAddresses && user.emailAddresses.length > 0) {
        // Get the primary email
        const primaryEmailObj = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId) || user.emailAddresses[0];
        const email = primaryEmailObj.emailAddress;
        console.log('Favorites Check API - Using email for lookup:', email);
        
        // Query Supabase for the user ID by email
        const { data: userByEmail, error: emailError } = await supabaseClient
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (userByEmail) {
          console.log('Favorites Check API - Found Supabase user by email:', userByEmail.id);
          
          // Update the user with the clerk_id for future lookups
          const { error: updateError } = await supabaseClient
            .from('users')
            .update({ clerk_id: clerkId })
            .eq('id', userByEmail.id);
            
          if (updateError) {
            console.error('Favorites Check API - Error updating user with clerk_id:', updateError);
          } else {
            console.log('Favorites Check API - Updated user with clerk_id');
          }
          
          return userByEmail.id;
        }
        
        // If user not found, create a new user in Supabase
        console.log('Favorites Check API - User not found, creating new user with email');
        
        // Get user details from Clerk
        const name = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim() 
          : 'Anonymous User';
        
        // Insert the user into Supabase with clerk_id field
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            clerk_id: clerkId,
            name,
            email
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Favorites Check API - Error creating user in Supabase:', insertError);
          
          // If the error is about the clerk_id column not existing, try without it
          if (insertError.message.includes('clerk_id')) {
            console.log('Favorites Check API - Trying to insert user without clerk_id field');
            const { data: newUserNoClerkId, error: insertErrorNoClerkId } = await supabaseClient
              .from('users')
              .insert({
                name,
                email
              })
              .select()
              .single();
              
            if (insertErrorNoClerkId) {
              console.error('Favorites Check API - Error creating user without clerk_id:', insertErrorNoClerkId);
              
              // Last resort: Create a minimal user record
              console.log('Favorites Check API - Creating minimal user record as last resort');
              const { data: minimalUser, error: minimalError } = await supabaseClient
                .from('users')
                .insert({
                  name: 'Temporary User',
                  email: `${clerkId}@temporary.user`
                })
                .select()
                .single();
                
              if (minimalError) {
                console.error('Favorites Check API - Error creating minimal user:', minimalError);
              } else if (minimalUser) {
                console.log('Favorites Check API - Created minimal user:', minimalUser.id);
                return minimalUser.id;
              }
            } else if (newUserNoClerkId) {
              console.log('Favorites Check API - Created new user without clerk_id:', newUserNoClerkId.id);
              return newUserNoClerkId.id;
            }
          }
        } else if (newUser) {
          console.log('Favorites Check API - Created new user with clerk_id:', newUser.id);
          return newUser.id;
        }
      }
    } catch (clerkError) {
      console.error('Favorites Check API - Error fetching user from Clerk:', clerkError);
    }
    
    // If all else fails, return the Clerk ID as a last resort
    console.log('Favorites Check API - All lookup methods failed, returning Clerk ID as fallback');
    return clerkId;
  } catch (error) {
    console.error('Favorites Check API - Unexpected error in getSupabaseUserId:', error);
    return clerkId; // Return the Clerk ID as a fallback
  }
}

export async function GET(req: Request) {
  try {
    console.log('Favorites Check API - GET request received');
    
    // Get the fusion ID from the query parameters
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');
    
    if (!fusionId) {
      console.error('Favorites Check API - No fusion ID provided');
      return NextResponse.json({ error: 'Fusion ID is required' }, { status: 400 });
    }
    
    console.log('Favorites Check API - Checking favorite status for fusion:', fusionId);
    
    // Get the user ID from the auth session
    const { userId } = auth();
    
    if (!userId) {
      console.error('Favorites Check API - No user ID found in session');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Favorites Check API - User ID from Clerk:', userId);
    
    // Get the Supabase user ID
    const supabaseUserId = await getSupabaseUserId(userId);
    
    if (!supabaseUserId) {
      console.error('Favorites Check API - Failed to get Supabase user ID');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('Favorites Check API - Supabase user ID:', supabaseUserId);
    
    // Check if the fusion is a favorite for this user
    const supabaseClient = await getSupabaseAdminClient();
    const { data, error } = await supabaseClient
      .from('favorites')
      .select('id')
      .eq('user_id', supabaseUserId)
      .eq('fusion_id', fusionId)
      .maybeSingle();
    
    if (error) {
      console.error('Favorites Check API - Error checking favorite status:', error);
      return NextResponse.json({ error: 'Failed to check favorite status' }, { status: 500 });
    }
    
    const isLiked = !!data;
    console.log('Favorites Check API - Is fusion liked:', isLiked);
    
    return NextResponse.json({ isLiked });
  } catch (error) {
    console.error('Favorites Check API - Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 