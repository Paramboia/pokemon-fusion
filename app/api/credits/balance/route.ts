import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    // Get user data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, credits_balance')
      .eq('clerk_id', userId)
      .single();

    if (userError || !userData) {
      // Create user with 0 balance if they don't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          credits_balance: 0
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      return NextResponse.json({ 
        balance: 0,
        userId: newUser.id
      });
    }

    return NextResponse.json({ 
      balance: userData.credits_balance || 0,
      userId: userData.id
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 