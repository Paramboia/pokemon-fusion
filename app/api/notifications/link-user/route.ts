import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    // Verify the request is from an authenticated user
    const session = await auth()
    const userId = session?.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clerkUserId, supabaseUserId, oneSignalPlayerId, userEmail } = body

    // Verify the authenticated user matches the request
    if (userId !== clerkUserId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    console.log('Link User API - Linking user:', {
      clerkUserId,
      supabaseUserId,
      oneSignalPlayerId: oneSignalPlayerId?.substring(0, 10) + '...',
      userEmail
    })

    // Get OneSignal configuration
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID

    if (!restApiKey || !appId) {
      console.error('Link User API - Missing OneSignal configuration')
      return NextResponse.json(
        { error: 'OneSignal configuration missing' },
        { status: 500 }
      )
    }

    // Update the OneSignal player with external user ID
    const oneSignalResponse = await fetch(`https://onesignal.com/api/v1/players/${oneSignalPlayerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        external_user_id: supabaseUserId, // Use Supabase ID as external ID
        tags: {
          clerk_id: clerkUserId,
          supabase_id: supabaseUserId,
          user_email: userEmail,
          linked_at: new Date().toISOString()
        }
      }),
    })

    const oneSignalData = await oneSignalResponse.json()

    if (!oneSignalResponse.ok) {
      console.error('Link User API - OneSignal API error:', {
        status: oneSignalResponse.status,
        data: oneSignalData
      })
      return NextResponse.json(
        { 
          error: 'Failed to update OneSignal player',
          details: oneSignalData
        },
        { status: 500 }
      )
    }

    console.log('Link User API - Successfully linked user to OneSignal:', {
      playerId: oneSignalPlayerId,
      externalUserId: supabaseUserId,
      success: oneSignalData.success
    })

    return NextResponse.json({
      success: true,
      message: 'User successfully linked to OneSignal',
      data: {
        oneSignalPlayerId,
        externalUserId: supabaseUserId,
        clerkUserId,
        linkedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Link User API - Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Support OPTIONS for CORS
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