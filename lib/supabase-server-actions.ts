'use server';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

// Create a server-side Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Export the supabase client for use in other files
export const supabase = supabaseClient;

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

// Server actions for API routes
export async function savePokemon(pokemon: Omit<PokemonDB, 'created_at'>): Promise<PokemonDB | null> {
  try {
    // Check if pokemon already exists
    const { data: existingPokemon } = await supabaseClient
      .from('pokemon')
      .select('*')
      .eq('id', pokemon.id)
      .single();
    
    if (existingPokemon) {
      return existingPokemon;
    }
    
    // Insert new pokemon
    const { data, error } = await supabaseClient
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

export async function saveFusion(fusion: Omit<FusionDB, 'created_at'>): Promise<FusionDB | null> {
  try {
    const { data, error } = await supabaseClient
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

export async function likeFusion(fusionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient.rpc('increment_fusion_likes', {
      fusion_id: fusionId
    });
    
    if (error) {
      console.error('Error liking fusion:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in likeFusion:', error);
    return false;
  }
}

export async function addFavorite(userId: string, fusionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('favorites')
      .insert({
        user_id: userId,
        fusion_id: fusionId
      });
    
    if (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in addFavorite:', error);
    return false;
  }
}

export async function removeFavorite(userId: string, fusionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);
    
    if (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeFavorite:', error);
    return false;
  }
}

// Function for Clerk webhook to sync user data with Supabase
export async function syncUserToSupabase(
  userId: string, 
  name: string, 
  email: string
): Promise<boolean> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      // Update existing user
      const { error } = await supabaseClient
        .from('users')
        .update({
          name,
          email
        })
        .eq('id', userId);
        
      if (error) {
        console.error('Error updating user:', error);
        return false;
      }
    } else {
      // Insert new user
      const { error } = await supabaseClient
        .from('users')
        .insert({
          id: userId,
          name,
          email
        });
        
      if (error) {
        console.error('Error inserting user:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in syncUserToSupabase:', error);
    return false;
  }
} 