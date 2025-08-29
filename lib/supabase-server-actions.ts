'use server';

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdminClient } from './supabase-server';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('SERVER ACTIONS - NEXT_PUBLIC_SUPABASE_URL is not defined. Please check your environment variables.');
}

if (!supabaseServiceKey) {
  console.error('SERVER ACTIONS - SUPABASE_SERVICE_ROLE_KEY is not defined. Please check your environment variables.');
}

// Instead of creating a new client, use the admin client from supabase-server.ts
async function getSupabaseClient() {
  return getSupabaseAdminClient();
}

// Function to check if Supabase connection is healthy
export async function checkSupabaseActionConnection() {
  try {
    const client = await getSupabaseClient();
    // Try a simple query to check connection
    const { data, error } = await client
      .from('pokemon')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('SERVER ACTIONS - Supabase connection check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('SERVER ACTIONS - Unexpected error checking Supabase connection:', error);
    return false;
  }
}

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

export async function saveFusion({
  userId,
  pokemon1Id,
  pokemon2Id,
  pokemon1Name,
  pokemon2Name,
  fusionName,
  fusionImage,
  isSimpleFusion,
}: {
  userId: string;
  pokemon1Id?: number;
  pokemon2Id?: number;
  pokemon1Name: string;
  pokemon2Name: string;
  fusionName: string;
  fusionImage: string;
  isSimpleFusion?: boolean;
}) {
  console.log('saveFusion - Starting with params:', {
    userId,
    pokemon1Id,
    pokemon2Id,
    pokemon1Name,
    pokemon2Name,
    fusionName,
    fusionImageLength: fusionImage ? fusionImage.length : 0,
    isSimpleFusion
  });

  try {
    // Validate user ID
    if (!userId) {
      console.error('saveFusion - Error: No user ID provided');
      return { error: 'No user ID provided' };
    }

    // No need to validate UUID format - accept any user ID format
    // The generate endpoint will ensure the user exists in the database

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('saveFusion - Supabase URL:', supabaseUrl);
    console.log('saveFusion - Supabase Service Key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('saveFusion - Error: Missing Supabase credentials');
      return { error: 'Missing Supabase credentials' };
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Set the image URL - for Simple Method fusions, use the original URL without uploading
    let imageUrl: string | null = null;
    
    if (isSimpleFusion) {
      // For Simple Method fusions, skip uploading to Supabase and use the original URL
      console.log('saveFusion - Simple Method fusion detected, skipping image upload');
      imageUrl = fusionImage;
    } else {
      // Upload the image to Supabase Storage for all AI-generated fusions (including Qwen)
      console.log('saveFusion - Uploading AI-generated image to storage');
      imageUrl = await uploadImageFromUrl(supabase, fusionImage);
      
      if (!imageUrl) {
        console.error('saveFusion - Error: Failed to upload image');
        return { error: 'Failed to upload image' };
      }
      
      console.log('saveFusion - Image uploaded successfully:', imageUrl);
    }
    
    // Check if the pokemon table exists and if the pokemon IDs exist
    console.log('saveFusion - Checking pokemon table and IDs');
    const { data: pokemon1, error: pokemon1Error } = await supabase
      .from('pokemon')
      .select('id')
      .eq('id', pokemon1Id)
      .single();
    
    if (pokemon1Error) {
      console.log(`saveFusion - Pokemon with ID ${pokemon1Id} not found, attempting to create it`);
      
      // Try to insert the pokemon
      const { error: insertPokemon1Error } = await supabase
        .from('pokemon')
        .insert({ 
          id: pokemon1Id, 
          name: `Pokemon ${pokemon1Id}`,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon1Id}.png`
        });
      
      if (insertPokemon1Error) {
        if (insertPokemon1Error.code === '42P01') {
          console.error('saveFusion - Pokemon table does not exist, fusion may fail due to foreign key constraint');
        } else {
          console.error(`saveFusion - Error inserting pokemon ${pokemon1Id}:`, insertPokemon1Error);
        }
        // Continue anyway, as the insert might fail due to foreign key constraints
      }
    }
    
    const { data: pokemon2, error: pokemon2Error } = await supabase
      .from('pokemon')
      .select('id')
      .eq('id', pokemon2Id)
      .single();
    
    if (pokemon2Error) {
      console.log(`saveFusion - Pokemon with ID ${pokemon2Id} not found, attempting to create it`);
      
      // Try to insert the pokemon
      const { error: insertPokemon2Error } = await supabase
        .from('pokemon')
        .insert({ 
          id: pokemon2Id, 
          name: `Pokemon ${pokemon2Id}`,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon2Id}.png`
        });
      
      if (insertPokemon2Error) {
        if (insertPokemon2Error.code === '42P01') {
          console.error('saveFusion - Pokemon table does not exist, fusion may fail due to foreign key constraint');
        } else {
          console.error(`saveFusion - Error inserting pokemon ${pokemon2Id}:`, insertPokemon2Error);
        }
        // Continue anyway, as the insert might fail due to foreign key constraints
      }
    }
    
    // Insert the fusion into the database
    console.log('saveFusion - Inserting fusion into database');
    const fusionId = uuidv4();
    const { data, error } = await supabase
      .from('fusions')
      .insert({
        id: fusionId,
        user_id: userId,
        pokemon_1_name: pokemon1Name,
        pokemon_2_name: pokemon2Name,
        fusion_name: fusionName,
        fusion_image: imageUrl,
        likes: 0,
      })
      .select();
    
    if (error) {
      console.error('saveFusion - Error inserting fusion:', error);
      
      // If the error is related to foreign key constraints, provide more detailed information
      if (error.code === '23503') {
        if (error.message.includes('user_id')) {
          console.error('saveFusion - Error: User ID does not exist in the users table');
          return { error: 'User ID does not exist in the users table' };
        } else if (error.message.includes('pokemon_1_id') || error.message.includes('pokemon_2_id')) {
          console.error('saveFusion - Error: Pokemon ID does not exist in the pokemon table');
          return { error: 'Pokemon ID does not exist in the pokemon table. The database schema requires the pokemon to exist in the pokemon table before creating a fusion.' };
        }
      }
      
      return { error: error.message };
    }
    
    console.log('saveFusion - Fusion saved successfully:', data);
    return { data };
  } catch (error) {
    console.error('saveFusion - Unexpected error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
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
    
    // Check if the favorites table exists
    const { data, error } = await client
      .from('favorites')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('Server Actions - Error checking favorites table, attempting to create it:', error.message);
      
      // Create the table with the correct structure matching the schema
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT now()
        );
      `;
      
      const { error: createTableError } = await client.rpc('exec_sql', { query: createTableQuery });
      if (createTableError) {
        console.log('Server Actions - Error creating favorites table:', createTableError);
      } else {
        console.log('Server Actions - Favorites table created successfully');
      }
    } else {
      console.log('Server Actions - Favorites table already exists');
    }
  } catch (tableError) {
    console.log('Server Actions - Error in favorites table check/creation:', tableError);
    // Continue anyway, as the table might already exist
  }
}

// Function for Clerk webhook to sync user data with Supabase
export async function syncUserToSupabase(
  clerkId: string, 
  name: string, 
  email: string,
  isFallbackEmail = false
): Promise<boolean> {
  try {
    console.log('Server Actions - Syncing user with email:', email, 'clerk_id:', clerkId, 'isFallbackEmail:', isFallbackEmail);
    const client = await getSupabaseClient();
    
    // First, check if user already exists by clerk_id (most reliable)
    const { data: existingUserByClerkId } = await client
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (existingUserByClerkId) {
      console.log('Server Actions - Found existing user by clerk_id:', existingUserByClerkId.id);
      
      // Prepare update data - always include name
      const updateData: any = { name };
      
      // Only update email if it's not a fallback email and different from current
      if (!isFallbackEmail && existingUserByClerkId.email !== email) {
        console.log('Server Actions - Updating email from', existingUserByClerkId.email, 'to', email);
        updateData.email = email;
      }
      
      // Update existing user
      const { error } = await client
        .from('users')
        .update(updateData)
        .eq('id', existingUserByClerkId.id);
        
      if (error) {
        console.error('Server Actions - Error updating user:', error);
        return false;
      }
      
      console.log('Server Actions - Successfully updated user in Supabase');
      return true;
    }
    
    // If not found by clerk_id, check by email (but only for real emails)
    if (!isFallbackEmail) {
      const { data: existingUserByEmail } = await client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUserByEmail) {
        console.log('Server Actions - Found existing user by email, updating with clerk_id:', existingUserByEmail.id);
        
        // Update existing user with clerk_id
        const { error } = await client
          .from('users')
          .update({ 
            clerk_id: clerkId,
            name 
          })
          .eq('id', existingUserByEmail.id);
          
        if (error) {
          console.error('Server Actions - Error updating user with clerk_id:', error);
          return false;
        }
        
        console.log('Server Actions - Successfully updated user in Supabase');
        return true;
      }
    }
    
    // Insert new user WITH clerk_id
    console.log('Server Actions - Creating new user with email:', email, 'clerk_id:', clerkId, 'isFallback:', isFallbackEmail);
    const { error } = await client
      .from('users')
      .insert({
        clerk_id: clerkId,
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

/**
 * Uploads an image from a URL to Supabase Storage
 * @param imageUrl The URL of the image to upload
 * @param bucket The storage bucket to upload to
 * @param path The path within the bucket to store the image
 * @returns The URL of the uploaded image in Supabase Storage
 */
export async function uploadImageFromUrl(supabase, imageUrl: string): Promise<string | null> {
  try {
    console.log('uploadImageFromUrl - Starting with URL length:', imageUrl.length);
    
    // Check if the URL is a data URL
    if (imageUrl.startsWith('data:')) {
      console.log('uploadImageFromUrl - Processing data URL');
      
      // Extract the content type and base64 data
      const matches = imageUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        console.error('uploadImageFromUrl - Invalid data URL format');
        return null;
      }
      
      const contentType = matches[1];
      const base64Data = matches[2];
      const binaryData = Buffer.from(base64Data, 'base64');
      
      console.log('uploadImageFromUrl - Content type:', contentType);
      console.log('uploadImageFromUrl - Binary data size:', binaryData.length);
      
      // Generate a unique filename
      const filename = `fusion_${Date.now()}.${contentType.split('/')[1] || 'png'}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('fusions')
        .upload(filename, binaryData, {
          contentType,
          upsert: true
        });
      
      if (error) {
        console.error('uploadImageFromUrl - Error uploading data URL:', error);
        return null;
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('fusions')
        .getPublicUrl(filename);
      
      console.log('uploadImageFromUrl - Uploaded successfully, public URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } else {
      // It's a regular URL, fetch it first
      console.log('uploadImageFromUrl - Fetching image from URL');
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.error(`uploadImageFromUrl - Failed to fetch image: ${response.status}`);
        return null;
      }
      
      // Get content type from response
      const contentType = response.headers.get('content-type') || 'image/png';
      console.log('uploadImageFromUrl - Original content type:', contentType);
      
      // For any image that might have transparency, preserve as PNG
      const finalContentType = 'image/png'; // Always use PNG to preserve transparency
      
      // Get the image as a buffer
      const arrayBuffer = await response.arrayBuffer();
      console.log('uploadImageFromUrl - Image buffer size:', arrayBuffer.byteLength, 'bytes');
      
      // Always use PNG extension to preserve transparency
      const extension = 'png';
      // Use special prefix for Qwen images for easier tracking
      const prefix = imageUrl.includes('replicate.delivery') ? 'fusion-qwen' : 'fusion';
      const filename = `${prefix}_${Date.now()}.${extension}`;
      console.log('uploadImageFromUrl - Using PNG format to preserve transparency:', filename);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('fusions')
        .upload(filename, arrayBuffer, {
          contentType: finalContentType,
          upsert: true
        });
      
      if (error) {
        console.error('uploadImageFromUrl - Error uploading image:', error);
        return null;
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('fusions')
        .getPublicUrl(filename);
      
      console.log('uploadImageFromUrl - Uploaded successfully, public URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    }
  } catch (error) {
    console.error('uploadImageFromUrl - Unexpected error:', error);
    return null;
  }
} 