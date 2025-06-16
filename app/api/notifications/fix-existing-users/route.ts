import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    // Get the current user from Clerk
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { oneSignalPlayerId, forceUpdate } = body

    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // Validate required fields
    if (!oneSignalPlayerId) {
      return NextResponse.json(
        { error: 'Missing required field: oneSignalPlayerId' },
        { status: 400, headers }
      )
    }

    // Log the fixing attempt
    console.log('Fixing existing user subscription:', {
      clerkUserId: userId,
      oneSignalPlayerId,
      forceUpdate,
      timestamp: new Date().toISOString()
    })

    const restApiKey = process.env.ONESIGNAL_REST_API_KEY
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID

    if (!restApiKey || !appId) {
      throw new Error('Missing required OneSignal configuration')
    }

    // First, get the current player info to see what we're working with
    const getPlayerResponse = await fetch(`https://onesignal.com/api/v1/players/${oneSignalPlayerId}?app_id=${appId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${restApiKey}`,
      },
    })

    let currentPlayerData = null
    if (getPlayerResponse.ok) {
      currentPlayerData = await getPlayerResponse.json()
      console.log('Current player data:', {
        playerId: currentPlayerData.id,
        externalUserId: currentPlayerData.external_user_id,
        tags: currentPlayerData.tags
      })
    }

    // Update the OneSignal player to link it with the Clerk user ID
    const updateResponse = await fetch(`https://onesignal.com/api/v1/players/${oneSignalPlayerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        external_user_id: userId, // Link to Clerk user ID
        tags: {
          clerk_user_id: userId,
          fixed_existing_user: new Date().toISOString(),
          source: 'pokemon_fusion_app',
          ...(currentPlayerData?.tags || {}) // Preserve existing tags
        }
      }),
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text()
      console.error('Failed to update OneSignal player:', errorData)
      throw new Error(`OneSignal update failed: ${errorData}`)
    }

    const updatedPlayerData = await updateResponse.json()
    console.log('Successfully updated OneSignal player:', updatedPlayerData)

    // Also try to use the OneSignal API to set the external user ID from their side
    try {
      const setExternalUserResponse = await fetch('https://onesignal.com/api/v1/players/external_user_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${restApiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          external_user_id: userId,
          subscription_id: oneSignalPlayerId
        }),
      })

      if (setExternalUserResponse.ok) {
        console.log('External user ID set via OneSignal API')
      } else {
        console.warn('Failed to set external user ID via OneSignal API:', await setExternalUserResponse.text())
      }
    } catch (externalUserError) {
      console.warn('Error setting external user ID:', externalUserError)
    }

    return NextResponse.json({
      success: true,
      message: 'User subscription fixed successfully',
      data: {
        clerkUserId: userId,
        oneSignalPlayerId,
        previousData: currentPlayerData,
        updatedData: updatedPlayerData,
        timestamp: new Date().toISOString()
      }
    }, { headers })

  } catch (error) {
    console.error('Error fixing existing user subscription:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fix user subscription',
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