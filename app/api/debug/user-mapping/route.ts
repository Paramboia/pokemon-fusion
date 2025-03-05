import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseAdminClient, getSupabaseUserIdFromClerk } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use this endpoint' },
        { status: 401 }
      );
    }

    // Get Clerk user details
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    
    // Get primary email
    const primaryEmailObj = clerkUser.emailAddresses.find(
      email => email.id === clerkUser.primaryEmailAddressId
    ) || clerkUser.emailAddresses[0];
    
    const email = primaryEmailObj?.emailAddress;
    
    // Get the Supabase admin client
    const supabaseClient = await getSupabaseAdminClient();
    
    // Check if user exists in Supabase by clerk_id
    const { data: userByClerkId, error: clerkIdError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .maybeSingle();
      
    // Check if user exists in Supabase by email
    const { data: userByEmail, error: emailError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    // Get the corresponding Supabase user ID using our helper function
    const supabaseUserId = await getSupabaseUserIdFromClerk(clerkUserId);
    
    // Return all the information
    return NextResponse.json({
      clerk: {
        userId: clerkUserId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
      supabase: {
        userByClerkId: userByClerkId || null,
        userByEmail: userByEmail || null,
        mappedUserId: supabaseUserId,
      },
      mapping: {
        status: supabaseUserId ? 'success' : 'failed',
        message: supabaseUserId 
          ? 'User mapping successful' 
          : 'Failed to map Clerk user to Supabase user',
      }
    });
  } catch (error) {
    console.error('Error in debug user mapping:', error);
    return NextResponse.json(
      { error: 'Failed to debug user mapping', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 