'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

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

// Note: We've removed the dbService object export since it's not allowed in 'use server' files
// If you need to use these functions in client components, you'll need to import them individually 