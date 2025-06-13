import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Verify the request is from Supabase webhook or authorized source
    const authHeader = request.headers.get('authorization');
    const webhookSecret = request.headers.get('x-supabase-webhook-secret');
    
    // Simple webhook verification (you can enhance this with HMAC verification)
    if (!authHeader && !webhookSecret) {
      console.error('Unauthorized fusion notification request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      );
    }

    // Extract fusion data from webhook payload
    const { record } = body;
    
    if (!record) {
      return NextResponse.json(
        { error: 'No fusion record provided' },
        { status: 400, headers }
      );
    }

    const { user_id, id: fusionId, pokemon1_name, pokemon2_name, clerk_user_id } = record;
    
    if (!user_id && !clerk_user_id) {
      return NextResponse.json(
        { error: 'No user ID provided in fusion record' },
        { status: 400, headers }
      );
    }

    // Check if required env vars are present
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.pokemon-fusion.com';

    if (!restApiKey || !appId) {
      throw new Error('Missing required OneSignal configuration');
    }

    console.log('Sending fusion creation notification:', {
      fusionId,
      userId: user_id || clerk_user_id,
      pokemon1: pokemon1_name,
      pokemon2: pokemon2_name
    });

    // Create personalized notification message
    const fusionName = pokemon1_name && pokemon2_name 
      ? `${pokemon1_name}-${pokemon2_name}` 
      : 'your new fusion';

    // Send notification to specific user via OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        // Target specific user by external_user_id (Clerk ID)
        include_external_user_ids: [clerk_user_id || user_id],
        contents: { 
          en: `Trainer, congrats on your new Pokémon fusion! Your ${fusionName} is waiting for you.` 
        },
        headings: { 
          en: 'Pokemon-Fusion 🐉✨' 
        },
        url: `${appUrl}/gallery`, // Direct to gallery page
        web_buttons: [
          {
            id: "see-pokemon",
            text: "See Pokémon",
            icon: `${appUrl}/icon-192x192.png`,
            url: `${appUrl}/gallery`
          }
        ],
        ttl: 43200, // 12 hours (fusion notifications are time-sensitive)
        isAnyWeb: true,
        target_channel: "push",
        channel_for_external_user_ids: "push",
        web_push_topic: "pokemon_fusion_created",
        priority: 10, // High priority for immediate delivery
        // Add custom data for tracking
        data: {
          type: 'fusion_created',
          fusion_id: fusionId,
          user_id: user_id || clerk_user_id,
          timestamp: new Date().toISOString()
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OneSignal API error for fusion notification:', {
        status: response.status,
        statusText: response.statusText,
        data,
        fusionId,
        userId: user_id || clerk_user_id
      });
      throw new Error(data.errors?.[0] || 'Failed to send fusion notification');
    }

    console.log('Successfully sent fusion creation notification:', {
      notificationId: data.id,
      recipients: data.recipients,
      fusionId,
      fusionName,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        notification: data,
        fusion: {
          id: fusionId,
          name: fusionName,
          user_id: user_id || clerk_user_id
        },
        timestamp: new Date().toISOString()
      }
    }, { headers });

  } catch (error) {
    console.error('Fusion creation notification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send fusion creation notification',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-supabase-webhook-secret',
    },
  });
} 