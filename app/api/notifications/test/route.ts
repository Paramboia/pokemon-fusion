import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // For testing, we can allow POST requests with a different auth mechanism
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401, headers }
      )
    }

    // Check if required env vars are present
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pokemon-fusion-ai.vercel.app'

    if (!restApiKey || !appId) {
      throw new Error('Missing required OneSignal configuration')
    }

    console.log('Test notification - OneSignal configuration:', {
      appId,
      restApiKeyPrefix: restApiKey.substring(0, 10) + '...',
      appUrl
    })

    // Send test notification directly via OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['Total Subscriptions'], // Target all subscribed users
        contents: { 
          en: 'Test: Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!' 
        },
        headings: { 
          en: 'Pokemon-Fusion 🐉 (Test)' 
        },
        url: appUrl, // Open the website when notification is clicked
        web_buttons: [
          {
            id: "generate-fusion",
            text: "Generate Fusion",
            icon: `${appUrl}/icon-192x192.png`,
            url: appUrl
          }
        ],
        ttl: 86400, // Expire after 24 hours if not delivered
        isAnyWeb: true,
        target_channel: "push",
        channel_for_external_user_ids: "push",
        web_push_topic: "pokemon_fusion_test",
        priority: 10 // High priority to ensure delivery
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('OneSignal API error (test):', {
        status: response.status,
        statusText: response.statusText,
        data,
        requestBody: {
          app_id: appId,
          url: appUrl
        }
      })
      throw new Error(data.errors?.[0] || 'Failed to send test notification')
    }

    console.log('Successfully sent test Pokemon Fusion notification:', {
      notificationId: data.id,
      recipients: data.recipients,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent successfully',
      data: {
        notification: data,
        timestamp: new Date().toISOString()
      }
    }, { headers })
  } catch (error) {
    console.error('Test Pokemon Fusion notification error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test Pokemon Fusion notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
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
  })
} 