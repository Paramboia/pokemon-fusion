'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not defined. Please check your environment variables.');
}

if (!supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. Please check your environment variables.');
}

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not defined. Please check your environment variables.');
}

// Create Supabase clients as functions instead of constants
export async function getSupabaseClient() {
  return createClient(
    supabaseUrl || 'https://placeholder-value-replace-in-vercel.supabase.co',
    supabaseAnonKey || 'placeholder-value-replace-in-vercel',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }
  );
}

export async function getSupabaseAdminClient() {
  return createClient(
    supabaseUrl || 'https://placeholder-value-replace-in-vercel.supabase.co',
    supabaseServiceKey || 'placeholder-value-replace-in-vercel',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }
  );
}

// Function to check if Supabase connection is healthy
export async function checkSupabaseServerConnection() {
  try {
    const adminClient = await getSupabaseAdminClient();
    // Try a simple query to check connection
    const { data, error } = await adminClient
      .from('pokemon')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase server connection check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error checking Supabase server connection:', error);
    return false;
  }
}

// Function to get a Supabase client with the current user's session
export async function getSupabaseClientWithAuth() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      console.warn('No authenticated user found, returning admin client');
      return getSupabaseAdminClient();
    }
    
    // For authenticated requests, we could add the user ID to headers
    // or use other authentication mechanisms
    return createClient(
      supabaseUrl || 'https://placeholder-value-replace-in-vercel.supabase.co',
      supabaseServiceKey || 'placeholder-value-replace-in-vercel',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-clerk-user-id': userId,
            'Content-Type': 'application/json',
          },
        },
      }
    );
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    return getSupabaseAdminClient();
  }
}

export async function createServerClient() {
  const cookieStore = cookies();
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

// Helper function to get the current user ID from Clerk
export const getCurrentUserId = async (): Promise<string | null> => {
  const { userId } = await auth();
  return userId;
};

export interface FusionDB {
  id: string;
  user_id: string;
  pokemon_1_id: number;
  pokemon_2_id: number;
  fusion_name: string;
  fusion_image: string;
  likes: number;
  created_at: string;
}

export interface PokemonDB {
  id: number;
  name: string;
  image_url: string;
  type: string[];
  created_at: string;
}

export interface FavoriteDB {
  id: number;
  user_id: string;
  fusion_id: string;
  created_at: string;
}

// Database service functions as individual async functions
export async function getPokemon(id: number): Promise<PokemonDB | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('pokemon')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching pokemon:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getPokemon:', error);
    return null;
  }
}

export async function savePokemon(pokemon: Omit<PokemonDB, 'created_at'>): Promise<PokemonDB | null> {
  try {
    // Check if pokemon already exists
    const { data: existingPokemon } = await getSupabaseClient()
      .from('pokemon')
      .select('*')
      .eq('id', pokemon.id)
      .single();
    
    if (existingPokemon) {
      return existingPokemon;
    }
    
    // Insert new pokemon
    const { data, error } = await getSupabaseClient()
      .from('pokemon')
      .insert(pokemon)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving pokemon:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in savePokemon:', error);
    return null;
  }
}

export async function getFusion(id: string): Promise<FusionDB | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('fusions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching fusion:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getFusion:', error);
    return null;
  }
}

export async function saveFusion(fusion: Omit<FusionDB, 'created_at'>): Promise<FusionDB | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('fusions')
      .insert(fusion)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving fusion:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in saveFusion:', error);
    return null;
  }
}

/**
 * Helper function to get the Supabase user ID from a Clerk ID
 * This function will:
 * 1. Try to find the user by clerk_id
 * 2. If not found, try to find by email and update with clerk_id
 * 3. If still not found, create a new user with clerk_id
 */
export async function getSupabaseUserIdFromClerk(clerkId: string): Promise<string | null> {
  try {
    console.log('Supabase Server - Looking up Supabase user for Clerk ID:', clerkId);
    
    // Get the Supabase admin client
    const supabaseClient = await getSupabaseAdminClient();
    
    // First, try to find the user directly by Clerk ID
    const { data: userByClerkId, error: clerkIdError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .maybeSingle();
    
    if (clerkIdError) {
      console.error('Supabase Server - Error looking up user by clerk_id:', clerkIdError);
    }
    
    if (userByClerkId) {
      console.log('Supabase Server - Found Supabase user by Clerk ID:', userByClerkId.id);
      return userByClerkId.id;
    } else {
      console.log('Supabase Server - No user found with clerk_id:', clerkId);
    }
    
    // If not found by Clerk ID, try to find by email
    try {
      const user = await clerkClient.users.getUser(clerkId);
      console.log('Supabase Server - Clerk user found:', user ? 'Yes' : 'No');
      
      if (user && user.emailAddresses && user.emailAddresses.length > 0) {
        // Get the primary email
        const primaryEmailObj = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId) || user.emailAddresses[0];
        const email = primaryEmailObj.emailAddress;
        console.log('Supabase Server - Using email for lookup:', email);
        
        // Query Supabase for the user ID by email
        const { data: userByEmail, error: emailError } = await supabaseClient
          .from('users')
          .select('id, clerk_id')
          .eq('email', email)
          .maybeSingle();
        
        if (emailError) {
          console.error('Supabase Server - Error looking up user by email:', emailError);
        }
        
        if (userByEmail) {
          console.log('Supabase Server - Found Supabase user by email:', userByEmail.id);
          console.log('Supabase Server - Current clerk_id value:', userByEmail.clerk_id);
          
          // Only update if clerk_id is missing or different
          if (!userByEmail.clerk_id || userByEmail.clerk_id !== clerkId) {
            console.log('Supabase Server - Updating user with clerk_id:', clerkId);
            
            // Update the user with the clerk_id for future lookups
            const { error: updateError } = await supabaseClient
              .from('users')
              .update({ clerk_id: clerkId })
              .eq('id', userByEmail.id);
              
            if (updateError) {
              console.error('Supabase Server - Error updating user with clerk_id:', updateError);
            } else {
              console.log('Supabase Server - Updated user with clerk_id');
            }
          } else {
            console.log('Supabase Server - User already has correct clerk_id');
          }
          
          return userByEmail.id;
        }
        
        // If user not found, create a new user in Supabase
        console.log('Supabase Server - User not found, creating new user with email');
        
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
            email,
            credits_balance: 0 // Initialize with 0 credits
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Supabase Server - Error creating user in Supabase:', insertError);
          console.error('Supabase Server - Error message:', insertError.message);
          
          // If the error is about the clerk_id column not existing, try without it
          if (insertError.message.includes('clerk_id')) {
            console.log('Supabase Server - Trying to insert user without clerk_id field');
            const { data: newUserNoClerkId, error: insertErrorNoClerkId } = await supabaseClient
              .from('users')
              .insert({
                name,
                email,
                credits_balance: 0 // Initialize with 0 credits
              })
              .select()
              .single();
              
            if (insertErrorNoClerkId) {
              console.error('Supabase Server - Error creating user without clerk_id:', insertErrorNoClerkId);
              
              // Last resort: Create a minimal user record
              console.log('Supabase Server - Creating minimal user record as last resort');
              const { data: minimalUser, error: minimalError } = await supabaseClient
                .from('users')
                .insert({
                  name: 'Temporary User',
                  email: `${clerkId}@temporary.user`,
                  credits_balance: 0 // Initialize with 0 credits
                })
                .select()
                .single();
                
              if (minimalError) {
                console.error('Supabase Server - Error creating minimal user:', minimalError);
              } else if (minimalUser) {
                console.log('Supabase Server - Created minimal user:', minimalUser.id);
                return minimalUser.id;
              }
            } else if (newUserNoClerkId) {
              console.log('Supabase Server - Created new user in Supabase without clerk_id:', newUserNoClerkId.id);
              
              // Try to update the user with clerk_id after creation
              const { error: updateError } = await supabaseClient
                .from('users')
                .update({ clerk_id: clerkId })
                .eq('id', newUserNoClerkId.id);
                
              if (updateError) {
                console.error('Supabase Server - Error updating new user with clerk_id:', updateError);
              } else {
                console.log('Supabase Server - Updated new user with clerk_id');
              }
              
              return newUserNoClerkId.id;
            }
          }
        } else if (newUser) {
          console.log('Supabase Server - Created new user in Supabase with clerk_id:', newUser.id);
          return newUser.id;
        }
      }
    } catch (clerkError) {
      console.error('Supabase Server - Error fetching user from Clerk:', clerkError);
    }
    
    // If all else fails, create a new user with the Clerk ID
    try {
      console.log('Supabase Server - Creating new user with Clerk ID as fallback');
      const { data: fallbackUser, error: fallbackError } = await supabaseClient
        .from('users')
        .insert({
          clerk_id: clerkId,
          name: 'User ' + clerkId.substring(0, 8),
          email: `${clerkId}@temporary.user`,
          credits_balance: 0 // Initialize with 0 credits
        })
        .select()
        .single();
        
      if (fallbackError) {
        console.error('Supabase Server - Error creating fallback user:', fallbackError);
      } else if (fallbackUser) {
        console.log('Supabase Server - Created fallback user:', fallbackUser.id);
        return fallbackUser.id;
      }
    } catch (fallbackError) {
      console.error('Supabase Server - Error in fallback user creation:', fallbackError);
    }
    
    console.error('Supabase Server - All methods failed to get or create a Supabase user for Clerk ID:', clerkId);
    return null;
  } catch (error) {
    console.error('Supabase Server - Unexpected error in getSupabaseUserIdFromClerk:', error);
    return null;
  }
}

// Note: We've removed the dbService object export since it's not allowed in 'use server' files
// If you need to use these functions in client components, you'll need to import them individually 