import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import { createServerClient, getSupabaseUserIdFromClerk, getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    console.log('Credits Packages API - Fetching packages');
    
    // Get the credit packages from Supabase
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('credits', { ascending: true });

      if (error) {
        console.error('Credits Packages API - Error fetching credit packages:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Format the packages for the frontend
        const packages = data.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          price: pkg.price_cents / 100, // Convert cents to euros
          currency: pkg.currency,
          priceId: pkg.pricing_id || CREDIT_PACKAGES[pkg.name.toUpperCase().replace(' ', '_') as keyof typeof CREDIT_PACKAGES]?.stripe_price_id || null
        }));

        console.log('Credits Packages API - Successfully retrieved packages:', packages.length);
        return NextResponse.json({ packages });
      }
    } catch (dbError) {
      console.error('Credits Packages API - Database error:', dbError);
    }
    
    // If we couldn't get packages from the database, return fallback packages
    console.log('Credits Packages API - Using fallback packages');
    const fallbackPackages = Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
      id: key.toLowerCase(),
      name: key.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      credits: pkg.credits,
      price: pkg.price_cents / 100,
      currency: 'EUR',
      priceId: pkg.stripe_price_id || '',
    }));
    
    return NextResponse.json({ packages: fallbackPackages });
  } catch (error) {
    console.error('Credits Packages API - Error listing credit packages:', error);
    
    // Return fallback packages in case of any error
    const fallbackPackages = Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
      id: key.toLowerCase(),
      name: key.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      credits: pkg.credits,
      price: pkg.price_cents / 100,
      currency: 'EUR',
      priceId: pkg.stripe_price_id || '',
    }));
    
    return NextResponse.json({ packages: fallbackPackages });
  }
}

// Add a POST endpoint to create or update credit packages
export async function POST(req: NextRequest) {
  try {
    // Check if the user is authenticated and has admin privileges
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's role from Clerk
    const user = await clerkClient.users.getUser(userId);
    const isAdmin = user.publicMetadata.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the request body
    const body = await req.json();
    const { id, name, credits, price_cents, currency = 'EUR', is_active = true, pricing_id } = body;

    // Validate required fields
    if (!name || !credits || !price_cents) {
      return NextResponse.json(
        { error: 'Missing required fields: name, credits, price_cents' },
        { status: 400 }
      );
    }

    // Get the Supabase admin client
    const supabase = await getSupabaseAdminClient();

    // Prepare the package data
    const packageData = {
      name,
      credits,
      price_cents,
      currency,
      is_active,
      pricing_id, // Include the pricing_id field
      updated_at: new Date().toISOString()
    };

    let result;
    
    if (id) {
      // Update an existing package
      console.log(`Updating credit package with ID: ${id}`);
      const { data, error } = await supabase
        .from('credit_packages')
        .update(packageData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating credit package:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      result = data;
    } else {
      // Create a new package
      console.log('Creating new credit package');
      const { data, error } = await supabase
        .from('credit_packages')
        .insert({ ...packageData, created_at: new Date().toISOString() })
        .select();

      if (error) {
        console.error('Error creating credit package:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json({ package: result[0] });
  } catch (error: any) {
    console.error('Error in credit packages POST endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 