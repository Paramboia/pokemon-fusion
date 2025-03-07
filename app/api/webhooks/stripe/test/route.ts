import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    console.log('Test endpoint called');
    
    // Get the Supabase admin client
    const supabase = await getSupabaseAdminClient();
    console.log('Got Supabase admin client');
    
    // Try to insert a test record
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // Default user ID
      amount: 1,
      transaction_type: 'test',
      description: 'Test transaction from API'
    };
    
    console.log('Inserting test transaction:', testData);
    
    const { data, error } = await supabase
      .from('credits_transactions')
      .insert(testData)
      .select();
      
    if (error) {
      console.error('Error inserting test transaction:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }
    
    console.log('Test transaction inserted successfully:', data);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test transaction inserted successfully',
      data
    });
  } catch (error: any) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 