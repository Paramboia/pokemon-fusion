import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  },
  
  // Fusion functions
  async getFusion(id: string): Promise<FusionDB | null> {
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
  },
  
  async getPopularFusions(limit = 10): Promise<FusionDB[]> {
    const { data, error } = await supabase
      .from('fusions')
      .select('*')
      .order('likes', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching popular fusions:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getUserFusions(userId: string): Promise<FusionDB[]> {
    const { data, error } = await supabase
      .from('fusions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user fusions:', error);
      return [];
    }
    
    return data || [];
  },
  
  async likeFusion(fusionId: string): Promise<boolean> {
    const { error } = await supabase.rpc('increment_fusion_likes', {
      fusion_id: fusionId
    });
    
    if (error) {
      console.error('Error liking fusion:', error);
      return false;
    }
    
    return true;
  },
  
  async addFavorite(userId: string, fusionId: string): Promise<boolean> {
    const { error } = await supabase
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
  },
  
  async removeFavorite(userId: string, fusionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('fusion_id', fusionId);
    
    if (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
    
    return true;
  },
  
  async getUserFavorites(userId: string): Promise<FusionDB[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('fusion_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const fusionIds = data.map(fav => fav.fusion_id);
    
    const { data: fusions, error: fusionsError } = await supabase
      .from('fusions')
      .select('*')
      .in('id', fusionIds);
    
    if (fusionsError) {
      console.error('Error fetching favorite fusions:', fusionsError);
      return [];
    }
    
    return fusions || [];
  },
  
  async isFavorite(userId: string, fusionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('fusion_id', fusionId)
      .single();
    
    if (error) {
      return false;
    }
    
    return !!data;
  }
}; 