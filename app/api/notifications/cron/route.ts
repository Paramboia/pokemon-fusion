import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // Verify this is a legitimate Vercel cron request
    const userAgent = request.headers.get('user-agent') || ''
    const isVercelCron = userAgent.includes('vercel-cron') || userAgent.includes('Vercel')
    
    // In production, verify it's from Vercel cron
    // In development, allow requests with the cron secret for testing
    const url = new URL(request.url)
    const testSecret = url.searchParams.get('secret')
    const authHeader = request.headers.get('authorization')
    
    const isValidRequest = 
      isVercelCron || 
      (process.env.NODE_ENV !== 'production') ||
      (testSecret === process.env.CRON_SECRET) ||
      (authHeader === `Bearer ${process.env.CRON_SECRET}`)

    if (!isValidRequest) {
      console.error('Unauthorized cron request:', {
        userAgent,
        isVercelCron,
        environment: process.env.NODE_ENV,
        hasTestSecret: !!testSecret,
        hasAuthHeader: !!authHeader,
        headers: Object.fromEntries(request.headers.entries())
      })
      return NextResponse.json(
        { error: 'Unauthorized - This endpoint is only accessible by Vercel cron jobs' },
        { status: 401, headers }
      )
    }

    console.log('Cron job triggered successfully:', {
      userAgent,
      isVercelCron,
      timestamp: new Date().toISOString()
    })

    // Check if required env vars are present
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.pokemon-fusion.com'

    if (!restApiKey || !appId) {
      console.error('Missing OneSignal configuration:', {
        hasRestApiKey: !!restApiKey,
        hasAppId: !!appId
      })
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