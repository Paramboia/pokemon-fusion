'use client';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Supabase Client - Initializing with URL:', supabaseUrl);
console.log('Supabase Client - Anon Key available:', !!supabaseAnonKey);

// Create a Supabase client with minimal configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false, // We're using Clerk for auth, not Supabase Auth
  },
});

// Log when the client is created
console.log('Supabase Client - Client created successfully');

// Function to create an authenticated Supabase client for a single request
const createAuthenticatedClient = (token: string, userId: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-clerk-user-id': userId,
      },
    },
  });
};

export default supabase;

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

// Client-safe database service functions
export const dbService = {
  // Pokemon functions
  async getPokemon(id: number): Promise<PokemonDB | null> {
    try {
      console.log('Supabase Client - Fetching pokemon with ID:', id);
      const { data, error } = await supabase
        .from('pokemon')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Supabase Client - Error fetching pokemon:', error);
        return null;
      }
      
      console.log('Supabase Client - Pokemon fetched successfully');
      return data;
    } catch (error) {
      console.error('Supabase Client - Exception in getPokemon:', error);
      return null;
    }
  },
  
  // Fusion functions
  async getFusion(id: string): Promise<FusionDB | null> {
    try {
      console.log('Supabase Client - Fetching fusion with ID:', id);
      const { data, error } = await supabase
        .from('fusions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Supabase Client - Error fetching fusion:', error);
        return null;
      }
      
      console.log('Supabase Client - Fusion fetched successfully');
      return data;
    } catch (error) {
      console.error('Supabase Client - Exception in getFusion:', error);
      return null;
    }
  },
  
  async getPopularFusions(limit = 10): Promise<FusionDB[]> {
    try {
      console.log('Supabase Client - Fetching popular fusions with limit:', limit);
      const { data, error } = await supabase
        .from('fusions')
        .select('*')
        .order('likes', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Supabase Client - Error fetching popular fusions:', error);
        return [];
      }
      
      console.log(`Supabase Client - Fetched ${data?.length || 0} popular fusions`);
      return data || [];
    } catch (error) {
      console.error('Supabase Client - Exception in getPopularFusions:', error);
      return [];
    }
  },
  
  async getUserFusions(userId: string, token?: string): Promise<FusionDB[]> {
    try {
      console.log('Supabase Client - Fetching fusions for user:', userId);
      
      // Use authenticated client if token is provided
      const client = token ? createAuthenticatedClient(token, userId) : supabase;
      
      const { data, error } = await client
        .from('fusions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase Client - Error fetching user fusions:', error);
        return [];
      }
      
      console.log(`Supabase Client - Fetched ${data?.length || 0} fusions for user`);
      return data || [];
    } catch (error) {
      console.error('Supabase Client - Exception in getUserFusions:', error);
      return [];
    }
  },
  
  async likeFusion(fusionId: string): Promise<boolean> {
    try {
      console.log('Supabase Client - Liking fusion with ID:', fusionId);
      const { error } = await supabase.rpc('increment_fusion_likes', {
        fusion_id: fusionId
      });
      
      if (error) {
        console.error('Supabase Client - Error liking fusion:', error);
        return false;
      }
      
      console.log('Supabase Client - Fusion liked successfully');
      return true;
    } catch (error) {
      console.error('Supabase Client - Exception in likeFusion:', error);
      return false;
    }
  },
  
  async addFavorite(userId: string, fusionId: string, token?: string): Promise<boolean> {
    try {
      console.log('Supabase Client - Adding favorite for user:', userId, 'fusion:', fusionId);
      
      // Use authenticated client if token is provided
      const client = token ? createAuthenticatedClient(token, userId) : supabase;
      
      // First check if the favorite already exists
      const { data: existingFavorite, error: checkError } = await client
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('fusion_id', fusionId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "No rows returned" which is expected
        console.error('Supabase Client - Error checking existing favorite:', checkError);
      }
      
      if (existingFavorite) {
        console.log('Supabase Client - Favorite already exists');
        return true;
      }
      
      const { error } = await client
        .from('favorites')
        .insert({
          user_id: userId,
          fusion_id: fusionId
        });
      
      if (error) {
        console.error('Supabase Client - Error adding favorite:', error);
        return false;
      }
      
      console.log('Supabase Client - Favorite added successfully');
      return true;
    } catch (error) {
      console.error('Supabase Client - Exception in addFavorite:', error);
      return false;
    }
  },
  
  async removeFavorite(userId: string, fusionId: string, token?: string): Promise<boolean> {
    try {
      console.log('Supabase Client - Removing favorite for user:', userId, 'fusion:', fusionId);
      
      // Use authenticated client if token is provided
      const client = token ? createAuthenticatedClient(token, userId) : supabase;
      
      const { error } = await client
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('fusion_id', fusionId);
      
      if (error) {
        console.error('Supabase Client - Error removing favorite:', error);
        return false;
      }
      
      console.log('Supabase Client - Favorite removed successfully');
      return true;
    } catch (error) {
      console.error('Supabase Client - Exception in removeFavorite:', error);
      return false;
    }
  },
  
  async getUserFavorites(userId: string, token?: string): Promise<FusionDB[]> {
    try {
      console.log('Supabase Client - Fetching favorites for user:', userId);
      
      // Use authenticated client if token is provided
      const client = token ? createAuthenticatedClient(token, userId) : supabase;
      
      // First, get the favorite fusion IDs
      const { data: favoriteIds, error: favoritesError } = await client
        .from('favorites')
        .select('fusion_id')
        .eq('user_id', userId);
      
      if (favoritesError) {
        console.error('Supabase Client - Error fetching user favorites:', favoritesError);
        return [];
      }
      
      console.log(`Supabase Client - Found ${favoriteIds?.length || 0} favorite IDs`);
      
      if (!favoriteIds || favoriteIds.length === 0) {
        return [];
      }
      
      const fusionIds = favoriteIds.map(fav => fav.fusion_id);
      console.log('Supabase Client - Fetching fusions with IDs:', fusionIds);
      
      // Then, get the actual fusion data
      const { data: fusions, error: fusionsError } = await client
        .from('fusions')
        .select('*')
        .in('id', fusionIds);
      
      if (fusionsError) {
        console.error('Supabase Client - Error fetching favorite fusions:', fusionsError);
        return [];
      }
      
      console.log(`Supabase Client - Fetched ${fusions?.length || 0} favorite fusions`);
      return fusions || [];
    } catch (error) {
      console.error('Supabase Client - Exception in getUserFavorites:', error);
      return [];
    }
  },
  
  async isFavorite(userId: string, fusionId: string, token?: string): Promise<boolean> {
    try {
      console.log('Supabase Client - Checking if fusion is favorite for user:', userId, 'fusion:', fusionId);
      
      // Use authenticated client if token is provided
      const client = token ? createAuthenticatedClient(token, userId) : supabase;
      
      const { data, error } = await client
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('fusion_id', fusionId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Supabase Client - Fusion is not a favorite');
        } else {
          console.error('Supabase Client - Error checking favorite status:', error);
        }
        return false;
      }
      
      console.log('Supabase Client - Fusion is a favorite');
      return !!data;
    } catch (error) {
      console.error('Supabase Client - Exception in isFavorite:', error);
      return false;
    }
  }
}; 