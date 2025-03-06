import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Only allow this endpoint in development
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log('API Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  isDevelopment
});

// Create a Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase Configuration:', {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Test the Supabase connection
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('credits_transactions').select('count').limit(1);
    if (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  console.log('\n--- Credits Test API - New Request ---');
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (!isDevelopment) {
    console.log('Credits Test API - Rejected: Not in development mode');
    return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 });
  }

  // Test connection before proceeding
  const isConnected = await testConnection();
  if (!isConnected) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { userId, amount, transactionType, description } = body;
    
    console.log('Credits Test API - Processing transaction:', {
      userId,
      amount,
      transactionType,
      description
    });

    // First, insert the transaction
    const { error: transactionError } = await supabase
      .from('credits_transactions')
      .insert({
        user_id: userId,
        amount,
        transaction_type: transactionType,
        description
      });

    if (transactionError) {
      console.error('Credits Test API - Error inserting transaction:', transactionError);
      return NextResponse.json({ 
        error: 'Failed to insert transaction',
        details: transactionError
      }, { status: 500 });
    }

    console.log('Credits Test API - Transaction inserted successfully');

    // Then, update the user's balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({ credits_balance: supabase.rpc('get_new_balance', { user_id: userId, delta: amount }) })
      .eq('id', userId)
      .select('credits_balance')
      .single();

    if (userError) {
      console.error('Credits Test API - Error updating user balance:', userError);
      return NextResponse.json({ 
        error: 'Failed to update user balance',
        details: userError
      }, { status: 500 });
    }

    console.log('Credits Test API - Success:', {
      newBalance: userData?.credits_balance
    });

    return NextResponse.json({
      success: true,
      newBalance: userData?.credits_balance
    });

  } catch (error) {
    console.error('Credits Test API - Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 