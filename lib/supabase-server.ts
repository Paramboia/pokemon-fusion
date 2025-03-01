'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

// Create a server-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Database service functions for server-side operations
export const dbService = {
  // Pokemon functions
  async getPokemon(id: number): Promise<PokemonDB | null> {
    try {
      const { data, error } = await supabase
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
  },
  
  async savePokemon(pokemon: Omit<PokemonDB, 'created_at'>): Promise<PokemonDB | null> {
    try {
      // Check if pokemon already exists
      const { data: existingPokemon } = await supabase
        .from('pokemon')
        .select('*')
        .eq('id', pokemon.id)
        .single();
      
      if (existingPokemon) {
        return existingPokemon;
      }
      
      // Insert new pokemon
      const { data, error } = await supabase
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
  },
  
  // Fusion functions
  async getFusion(id: string): Promise<FusionDB | null> {
    try {
      const { data, error } = await supabase
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
  },
  
  async saveFusion(fusion: Omit<FusionDB, 'created_at'>): Promise<FusionDB | null> {
    try {
      const { data, error } = await supabase
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
}; 