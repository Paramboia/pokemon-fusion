import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // For testing, require the cron secret
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401, headers }
      );
    }

    // Mock fusion data for testing
    const testFusionData = {
      record: {
        id: 'test-fusion-' + Date.now(),
        user_id: body.user_id || 'test-user',
        clerk_user_id: body.clerk_user_id || body.user_id || 'test-user',
        pokemon1_name: body.pokemon1_name || 'Pikachu',
        pokemon2_name: body.pokemon2_name || 'Charizard',
        created_at: new Date().toISOString()
      }
    };

    console.log('Testing fusion notification with data:', testFusionData);

    // Forward to the actual fusion-created endpoint
    const fusionEndpointUrl = new URL('/api/notifications/fusion-created', request.url);
    
    const response = await fetch(fusionEndpointUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-webhook',
      },
      body: JSON.stringify(testFusionData),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to send test notification', details: result },
        { status: response.status, headers }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test fusion notification sent successfully',
      testData: testFusionData.record,
      result
    }, { headers });

  } catch (error) {
    console.error('Test fusion notification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test fusion notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 