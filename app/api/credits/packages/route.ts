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
          priceId: CREDIT_PACKAGES[pkg.name.toUpperCase().replace(' ', '_') as keyof typeof CREDIT_PACKAGES]?.stripe_price_id || null
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