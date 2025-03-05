import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the credit packages from Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('credits', { ascending: true });

    if (error) {
      console.error('Error fetching credit packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credit packages' },
        { status: 500 }
      );
    }

    // Format the packages for the frontend
    const packages = data.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price_cents / 100, // Convert cents to euros
      currency: pkg.currency,
      priceId: CREDIT_PACKAGES[pkg.name.toUpperCase().replace(' ', '_') as keyof typeof CREDIT_PACKAGES]?.stripe_price_id || null
    }));

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error listing credit packages:', error);
    return NextResponse.json(
      { error: 'Failed to list credit packages' },
      { status: 500 }
    );
  }
} 