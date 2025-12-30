'use client';

import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not defined. Please check your environment variables.');
}

if (!supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. Please check your environment variables.');
}

// Feature flag to control hot score usage. Default is false so deployments without
// the SQL function available will avoid 400s from Supabase.
const hotScoreEnabled = process.env.NEXT_PUBLIC_ENABLE_HOT_SCORE === 'true';

// Create a Supabase client with proper error handling
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-value-replace-in-vercel.supabase.co',
  supabaseAnonKey || 'placeholder-value-replace-in-vercel',
  {
    auth: {
      // IMPORTANT: We're using Clerk for authentication, NOT Supabase Auth
      // These settings explicitly disable all Supabase Auth functionality
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',  // Most minimal flow type
      storage: null,  // Don't store anything in local storage
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

// Function to check if Supabase connection is healthy
export async function checkSupabaseConnection() {
  try {
    // Try a simple query to check connection
    const { data, error } = await supabase
      .from('pokemon')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error checking Supabase connection:', error);
    return false;
  }
}

// Function to create an authenticated Supabase client for a single request
export const createAuthenticatedClient = (token: string, userId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Cannot create authenticated client: Supabase credentials are missing');
    throw new Error('Supabase credentials are missing');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // IMPORTANT: We're using Clerk for authentication, NOT Supabase Auth
      // These settings explicitly disable all Supabase Auth functionality
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',  // Most minimal flow type
      storage: null,  // Don't store anything in local storage
    },
    global: {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-clerk-user-id': userId,
        'Content-Type': 'application/json',
      },
    },
  });
};

// Log when the client is created
console.log('Supabase Client - Client created successfully');
console.log('Supabase Client - Auth is DISABLED - using Clerk for authentication only');

export interface FusionDB {
  id: string;
  user_id: string;
  pokemon_1_name: string;
  pokemon_2_name: string;
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
  
  async getPopularFusions(limit = 10, sortBy = 'hot'): Promise<FusionDB[]> {
    try {
      console.log('Supabase Client - Fetching popular fusions with limit:', limit, 'sortBy:', sortBy);

      const fetchMostLiked = async () => {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('fusions')
          .select('*')
          .order('likes', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fallbackError) {
          console.error('Supabase Client - Error fetching fallback fusions:', fallbackError);
          return [];
        }

        console.log(`Supabase Client - Fetched ${fallbackData?.length || 0} fusions with fallback sorting`);
        return fallbackData || [];
      };

      const fetchHotRanked = async () => {
        const { data: hotData, error: hotError } = await supabase
          .from('fusions')
          .select('*, hot_score:get_hot_score(likes, created_at)')
          .order('hot_score', { ascending: false })
          .limit(limit);

        if (hotError) {
          console.warn('Supabase Client - Hot score function failed, falling back to most_likes:', hotError);
          return fetchMostLiked();
        }

        console.log(`Supabase Client - Fetched ${hotData?.length || 0} fusions with hot score ranking`);
        return hotData || [];
      };

      // Apply sorting based on the sort parameter
      switch (sortBy) {
        case 'hot':
          if (!hotScoreEnabled) {
            console.warn('Supabase Client - Hot score disabled via feature flag, using most liked order');
            return fetchMostLiked();
          }

          try {
            return await fetchHotRanked();
          } catch (hotException) {
            console.warn('Supabase Client - Hot score function exception, falling back to most_likes:', hotException);
            return fetchMostLiked();
          }
          
        case 'oldest':
          const { data: oldestData, error: oldestError } = await supabase
            .from('fusions')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(limit);
          
          if (oldestError) {
            console.error('Supabase Client - Error fetching oldest fusions:', oldestError);
            return [];
          }
          
          return oldestData || [];
          
        case 'newest':
          const { data: newestData, error: newestError } = await supabase
            .from('fusions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
          
          if (newestError) {
            console.error('Supabase Client - Error fetching newest fusions:', newestError);
            return [];
          }
          
          return newestData || [];
          
        case 'less_likes':
          const { data: lessLikesData, error: lessLikesError } = await supabase
            .from('fusions')
            .select('*')
            .order('likes', { ascending: true })
            .limit(limit);
          
          if (lessLikesError) {
            console.error('Supabase Client - Error fetching less liked fusions:', lessLikesError);
            return [];
          }
          
          return lessLikesData || [];
          
        case 'most_likes':
          const { data: mostLikesData, error: mostLikesError } = await supabase
            .from('fusions')
            .select('*')
            .order('likes', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(limit);
          
          if (mostLikesError) {
            console.error('Supabase Client - Error fetching most liked fusions:', mostLikesError);
            return [];
          }
          
          return mostLikesData || [];

        default:
          // Default to hot score ranking with fallback
          if (!hotScoreEnabled) {
            console.warn('Supabase Client - Hot score disabled via feature flag (default branch), using most liked order');
            return fetchMostLiked();
          }

          try {
            return await fetchHotRanked();
          } catch (defaultException) {
            console.warn('Supabase Client - Default hot score exception, falling back to most_likes:', defaultException);
            return fetchMostLiked();
          }
      }
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
  
  async likeFusion(fusionId: string, userId: string): Promise<boolean> {
    try {
      if (!userId) {
        console.error('Supabase Client - No user ID provided for liking fusion');
        return false;
      }
      
      console.log('Supabase Client - Liking fusion with ID:', fusionId, 'for user:', userId);
      
      // Use the API endpoint instead of direct database access
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fusionId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Supabase Client - Error liking fusion via API:', errorData.error || response.statusText);
        return false;
      }
      
      console.log('Supabase Client - Fusion liked successfully via API');
      return true;
    } catch (error) {
      console.error('Supabase Client - Exception in likeFusion:', error);
      return false;
    }
  },
  
  async unlikeFusion(fusionId: string, userId: string): Promise<boolean> {
    try {
      if (!userId) {
        console.error('Supabase Client - No user ID provided for unliking fusion');
        return false;
      }
      
      console.log('Supabase Client - Unliking fusion with ID:', fusionId, 'for user:', userId);
      
      // Use the API endpoint instead of direct database access
      const response = await fetch(`/api/favorites?fusionId=${fusionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Supabase Client - Error unliking fusion via API:', errorData.error || response.statusText);
        return false;
      }
      
      console.log('Supabase Client - Fusion unliked successfully via API');
      return true;
    } catch (error) {
      console.error('Supabase Client - Exception in unlikeFusion:', error);
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
      
      // Use the API endpoint to check if the fusion is in the user's favorites
      const response = await fetch(`/api/favorites/check?fusionId=${fusionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });
      
      if (!response.ok) {
        console.error('Supabase Client - Error checking favorite status via API:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      console.log('Supabase Client - Favorite check result:', data.isFavorite ? 'Is favorite' : 'Not favorite');
      
      return !!data.isFavorite;
    } catch (error) {
      console.error('Supabase Client - Exception in isFavorite:', error);
      return false;
    }
  }
}; 