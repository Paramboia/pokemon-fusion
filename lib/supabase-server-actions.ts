'use server';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Server Actions - Supabase URL:', supabaseUrl);
console.log('Server Actions - Service Key available:', !!supabaseServiceKey);

// Create a server-side Supabase client with additional headers
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
  },
  db: {
    schema: 'public',
  },
});

// Instead of exporting the client directly, create a function to get it
async function getSupabaseClient() {
  return supabaseClient;
}

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
    const client = await getSupabaseClient();
    const { data: existingPokemon } = await client
      .from('pokemon')
      .select('*')
      .eq('id', pokemon.id)
      .single();
    
    if (existingPokemon) {
      return existingPokemon;
    }
    
    // Insert new pokemon
    const { data, error } = await client
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
    console.log('Server Actions - Saving fusion with user ID:', fusion.user_id);
    const client = await getSupabaseClient();
    
    // First, ensure the fusions table exists
    try {
      console.log('Server Actions - Ensuring fusions table exists');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS fusions (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          pokemon_1_id INTEGER NOT NULL,
          pokemon_2_id INTEGER NOT NULL,
          fusion_name TEXT NOT NULL,
          fusion_image TEXT NOT NULL,
          likes INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createTableError } = await client.rpc('exec_sql', { query: createTableQuery });
      if (createTableError) {
        console.log('Server Actions - Error creating fusions table (may already exist):', createTableError);
      } else {
        console.log('Server Actions - Fusions table created or already exists');
      }
    } catch (tableError) {
      console.log('Server Actions - Error in table creation (may not have permission):', tableError);
      // Continue anyway, as the table might already exist
    }
    
    const { data, error } = await client
      .from('fusions')
      .insert(fusion)
      .select()
      .single();
    
    if (error) {
      console.error('Server Actions - Error saving fusion:', error);
      return null;
    }
    
    console.log('Server Actions - Fusion saved successfully:', data);
    return data;
  } catch (error) {
    console.error('Server Actions - Error in saveFusion:', error);
    return null;
  }
}

export async function likeFusion(fusionId: string): Promise<boolean> {
  try {
    const client = await getSupabaseClient();
    const { error } = await client.rpc('increment_fusion_likes', {
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
    const client = await getSupabaseClient();
    
    // Ensure favorites table exists
    await ensureFavoritesTableExists();
    
    const { error } = await client
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
    const client = await getSupabaseClient();
    
    // Ensure favorites table exists
    await ensureFavoritesTableExists();
    
    const { error } = await client
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

// Function to ensure the favorites table exists
async function ensureFavoritesTableExists() {
  try {
    console.log('Server Actions - Ensuring favorites table exists');
    const client = await getSupabaseClient();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        fusion_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, fusion_id)
      );
    `;
    
    const { error: createTableError } = await client.rpc('exec_sql', { query: createTableQuery });
    if (createTableError) {
      console.log('Server Actions - Error creating favorites table (may already exist):', createTableError);
    } else {
      console.log('Server Actions - Favorites table created or already exists');
    }
  } catch (tableError) {
    console.log('Server Actions - Error in favorites table creation (may not have permission):', tableError);
    // Continue anyway, as the table might already exist
  }
}

// Function for Clerk webhook to sync user data with Supabase
export async function syncUserToSupabase(
  clerkId: string, 
  name: string, 
  email: string
): Promise<boolean> {
  try {
    console.log('Server Actions - Syncing user with email:', email);
    const client = await getSupabaseClient();
    
    // Check if user already exists by email
    const { data: existingUser } = await client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('Server Actions - Updating existing user with ID:', existingUser.id);
      // Update existing user
      const { error } = await client
        .from('users')
        .update({
          name
        })
        .eq('id', existingUser.id);
        
      if (error) {
        console.error('Server Actions - Error updating user:', error);
        return false;
      }
      
      console.log('Server Actions - Successfully updated user in Supabase');
      return true;
    }
    
    // Insert new user without clerk_id
    console.log('Server Actions - Creating new user with email:', email);
    const { error } = await client
      .from('users')
      .insert({
        name,
        email
      });
      
    if (error) {
      console.error('Server Actions - Error inserting user:', error);
      return false;
    }
    
    console.log('Server Actions - Successfully inserted new user in Supabase');
    return true;
  } catch (error) {
    console.error('Error in syncUserToSupabase:', error);
    return false;
  }
} 