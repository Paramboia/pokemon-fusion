import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { addFavorite, removeFavorite } from '@/lib/supabase-server-actions';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

// Create a Supabase client with fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-value-replace-in-vercel.supabase.co';
// Use the service role key for server-side operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-value-replace-in-vercel';

console.log('Favorites API - Supabase URL:', supabaseUrl);
console.log('Favorites API - Service Key available:', !!supabaseServiceKey);

// Helper function to get the Supabase user ID from Clerk ID
async function getSupabaseUserId(clerkId: string): Promise<string | null> {
  try {
    console.log('Favorites API - Looking up Supabase user for Clerk ID:', clerkId);
    
    // First, try to find the user directly by Clerk ID
    const supabaseClient = await getSupabaseAdminClient();
    const { data: userByClerkId, error: clerkIdError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', clerkId)
      .maybeSingle();
    
    if (userByClerkId) {
      console.log('Favorites API - Found Supabase user by Clerk ID:', userByClerkId.id);
      return userByClerkId.id;
    }
    
    // If not found by Clerk ID, try to find by email
    try {
      const user = await clerkClient.users.getUser(clerkId);
      console.log('Favorites API - Clerk user found:', user ? 'Yes' : 'No');
      
      if (user && user.emailAddresses && user.emailAddresses.length > 0) {
        // Get the primary email
        const primaryEmailObj = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId) || user.emailAddresses[0];
        const email = primaryEmailObj.emailAddress;
        console.log('Favorites API - Using email for lookup:', email);
        
        // Query Supabase for the user ID by email
        const { data: userByEmail, error: emailError } = await supabaseClient
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (userByEmail) {
          console.log('Favorites API - Found Supabase user by email:', userByEmail.id);
          return userByEmail.id;
        }
        
        // If user not found, create a new user in Supabase
        console.log('Favorites API - User not found, creating new user with email');
        
        // Get user details from Clerk
        const name = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim() 
          : 'Anonymous User';
        
        // Insert the user into Supabase
        const { data: newUser, error: insertError } = await supabaseClient
          .from('users')
          .insert({
            id: clerkId, // Use Clerk ID as the Supabase user ID
            name,
            email
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Favorites API - Error creating user in Supabase:', insertError);
          // Don't return null here, try the fallback approach below
        } else if (newUser) {
          console.log('Favorites API - Created new user in Supabase with email:', newUser.id);
          return newUser.id;
        }
      }
    } catch (clerkError) {
      console.error('Favorites API - Error getting user from Clerk:', clerkError);
      // Continue to fallback approach
    }
    
    // Fallback: Create a minimal user record with Clerk ID
    console.log('Favorites API - Attempting to create minimal user record with Clerk ID');
    
    try {
      // Check if the users table exists
      const { error: tableCheckError } = await supabaseClient
        .from('users')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        console.error('Favorites API - Error checking users table:', tableCheckError);
        return null;
      }
      
      // Insert a minimal user record
      const { data: minimalUser, error: minimalInsertError } = await supabaseClient
        .from('users')
        .insert({
          id: clerkId,
          name: 'Anonymous User',
          email: `${clerkId}@example.com` // Placeholder email
        })
        .select()
        .single();
      
      if (minimalInsertError) {
        console.error('Favorites API - Error creating minimal user in Supabase:', minimalInsertError);
        return null;
      }
      
      if (minimalUser) {
        console.log('Favorites API - Created minimal user in Supabase:', minimalUser.id);
        return minimalUser.id;
      }
    } catch (fallbackError) {
      console.error('Favorites API - Error in fallback user creation:', fallbackError);
    }
    
    console.log('Favorites API - Failed to create or find user in Supabase');
    return null;
  } catch (error) {
    console.error('Favorites API - Error in getSupabaseUserId:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const session = await auth();
    const clerkUserId = session?.userId;
    console.log('Favorites API - POST request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }

    // Get the fusion ID from the request body
    const { fusionId } = await req.json();
    console.log('Favorites API - Adding fusion to favorites:', fusionId);

    // Validate the request parameters
    if (!fusionId) {
      console.log('Favorites API - Missing fusion ID in request body');
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Ensure the favorites table exists before adding
    try {
      console.log('Favorites API - Checking if favorites table exists');
      const { data, error } = await supabaseClient
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('Favorites API - Error checking favorites table, attempting to create it:', error.message);
        
        // Create the table with the correct structure matching the schema
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT now()
          );
        `;
        
        const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
        if (createTableError) {
          console.log('Favorites API - Error creating favorites table:', createTableError);
        } else {
          console.log('Favorites API - Favorites table created successfully');
        }
      } else {
        console.log('Favorites API - Favorites table already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table check/creation:', tableError);
      // Continue anyway, as the table might already exist
    }

    // Add the fusion to favorites
    const success = await addFavorite(supabaseUserId, fusionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add to favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return NextResponse.json(
      { error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // Get the authenticated user ID from Clerk
    const session = await auth();
    const clerkUserId = session?.userId;
    console.log('Favorites API - DELETE request from user:', clerkUserId);

    if (!clerkUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(clerkUserId);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }

    // Get the fusion ID from the URL
    const url = new URL(req.url);
    const fusionId = url.searchParams.get('fusionId');
    console.log('Favorites API - Removing fusion from favorites:', fusionId);

    // Validate the request parameters
    if (!fusionId) {
      console.log('Favorites API - Missing fusion ID parameter');
      return NextResponse.json(
        { error: 'Missing fusion ID' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Ensure the favorites table exists before deleting
    try {
      console.log('Favorites API - Checking if favorites table exists');
      const { data, error } = await supabaseClient
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('Favorites API - Error checking favorites table:', error.message);
        return NextResponse.json(
          { error: 'Failed to check favorites table' },
          { status: 500 }
        );
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table check:', tableError);
      // Continue anyway, as the table might already exist
    }

    // Remove the fusion from favorites
    const success = await removeFavorite(supabaseUserId, fusionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove from favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Get the URL and extract the userId query parameter
    const url = new URL(req.url);
    const clerkUserId = url.searchParams.get('userId');
    console.log('Favorites API - GET request with userId:', clerkUserId);

    // Verify the request is authenticated
    const session = await auth();
    const authClerkUserId = session?.userId;
    console.log('Favorites API - Authenticated userId from auth():', authClerkUserId);

    // Check for authorization header as fallback
    let finalUserId = authClerkUserId;
    
    if (!finalUserId) {
      console.log('Favorites API - No userId from auth(), checking Authorization header');
      const authHeader = req.headers.get('Authorization');
      console.log('Favorites API - Authorization header present:', authHeader ? 'Yes' : 'No');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        console.log('Favorites API - Extracted token (first 10 chars):', token.substring(0, 10) + '...');

        try {
          // Verify the token with Clerk
          const verifiedToken = await clerkClient.verifyToken(token);
          console.log('Favorites API - Token verification result:', verifiedToken ? 'Success' : 'Failed');

          if (verifiedToken && verifiedToken.sub) {
            console.log('Favorites API - Verified token, userId:', verifiedToken.sub);
            finalUserId = verifiedToken.sub;
          }
        } catch (tokenError) {
          console.error('Favorites API - Error verifying token:', tokenError);
        }
      }
    }

    // If no userId is provided or we couldn't authenticate, return an error
    if (!finalUserId) {
      console.log('Favorites API - No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // If the requested userId doesn't match the authenticated user, return an error
    if (clerkUserId && clerkUserId !== finalUserId) {
      console.warn('Favorites API - User requested favorites for a different user ID');
      console.warn('  Requested:', clerkUserId);
      console.warn('  Authenticated:', finalUserId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Use the authenticated user ID if no specific userId was requested
    const userIdToUse = clerkUserId || finalUserId;
    console.log('Favorites API - Using userId for lookup:', userIdToUse);

    // Get the corresponding Supabase user ID
    const supabaseUserId = await getSupabaseUserId(userIdToUse);
    console.log('Favorites API - Supabase user lookup result:', supabaseUserId ? 'Found' : 'Not found');

    if (!supabaseUserId) {
      console.log('Favorites API - User not found in database and could not be created');
      return NextResponse.json(
        { error: 'User not found in database and could not be created' },
        { status: 404 }
      );
    }
    
    console.log('Favorites API - Fetching favorites for user:', supabaseUserId);
    
    // Get Supabase client
    const supabaseClient = await getSupabaseAdminClient();
    if (!supabaseClient) {
      console.error('Favorites API - Failed to get Supabase admin client');
      return NextResponse.json({ error: 'Failed to get Supabase admin client' }, { status: 500 });
    }

    // Ensure the favorites table exists before querying
    try {
      console.log('Favorites API - Checking if favorites table exists');
      const { data, error } = await supabaseClient
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('Favorites API - Error checking favorites table, attempting to create it:', error.message);
        
        // Create the table with the correct structure matching the schema
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT now()
          );
        `;
        
        const { error: createTableError } = await supabaseClient.rpc('exec_sql', { query: createTableQuery });
        if (createTableError) {
          console.log('Favorites API - Error creating favorites table:', createTableError);
        } else {
          console.log('Favorites API - Favorites table created successfully');
        }
      } else {
        console.log('Favorites API - Favorites table already exists');
      }
    } catch (tableError) {
      console.log('Favorites API - Error in favorites table check/creation:', tableError);
      // Continue anyway, as the table might already exist
    }

    // Query the favorites table for this user
    const { data: favoritesData, error: favoritesError } = await supabaseClient
      .from('favorites')
      .select(`
        fusion_id,
        fusions (
          id,
          pokemon_1_name,
          pokemon_2_name,
          fusion_name,
          fusion_image,
          created_at
        )
      `)
      .eq('user_id', supabaseUserId);

    if (favoritesError) {
      console.error('Favorites API - Error fetching favorites:', favoritesError.message);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    console.log('Favorites API - Fetched favorites count:', favoritesData?.length || 0);

    // Transform the data to a more usable format
    const favorites = favoritesData?.map(item => {
      if (!item.fusions) return null;
      
      // Convert from Supabase format to our Fusion type format
      return {
        id: item.fusions.id,
        pokemon1Name: item.fusions.pokemon_1_name,
        pokemon2Name: item.fusions.pokemon_2_name,
        fusionName: item.fusions.fusion_name,
        fusionImage: item.fusions.fusion_image,
        createdAt: item.fusions.created_at
      };
    }).filter(Boolean) || [];

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites API - Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 