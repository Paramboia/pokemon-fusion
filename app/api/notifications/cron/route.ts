import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    
    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('Unauthorized cron request')
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

    console.log('OneSignal configuration:', {
      appId,
      restApiKeyPrefix: restApiKey.substring(0, 10) + '...',
      appUrl
    })

    // Send notification directly via OneSignal API
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
          en: 'Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!' 
        },
        headings: { 
          en: 'Pokemon-Fusion 🐉' 
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
        web_push_topic: "pokemon_fusion_daily",
        priority: 10 // High priority to ensure delivery
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('OneSignal API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
        requestBody: {
          app_id: appId,
          url: appUrl
        }
      })
      throw new Error(data.errors?.[0] || 'Failed to send notification')
    }

    console.log('Successfully sent daily Pokemon Fusion notification:', {
      notificationId: data.id,
      recipients: data.recipients,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        notification: data,
        timestamp: new Date().toISOString()
      }
    }, { headers })
  } catch (error) {
    console.error('Daily Pokemon Fusion notification error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send daily Pokemon Fusion notification',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 