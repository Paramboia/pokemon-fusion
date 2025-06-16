import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clerkUserId, oneSignalPlayerId, userEmail } = body

    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // Validate required fields
    if (!clerkUserId || !oneSignalPlayerId) {
      return NextResponse.json(
        { error: 'Missing required fields: clerkUserId and oneSignalPlayerId' },
        { status: 400, headers }
      )
    }

    // Log the user linking for debugging
    console.log('User linking notification received:', {
      clerkUserId,
      oneSignalPlayerId,
      userEmail,
      timestamp: new Date().toISOString()
    })

    // Optional: Update OneSignal player with additional tags
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID

    if (restApiKey && appId) {
      try {
        // Update the OneSignal player with additional user information
        const updateResponse = await fetch(`https://onesignal.com/api/v1/players/${oneSignalPlayerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${restApiKey}`,
          },
          body: JSON.stringify({
            app_id: appId,
            tags: {
              clerk_user_id: clerkUserId,
              user_email: userEmail || '',
              last_linked: new Date().toISOString(),
              source: 'pokemon_fusion_app'
            }
          }),
        })

        if (updateResponse.ok) {
          console.log('Successfully updated OneSignal player with tags')
        } else {
          console.warn('Failed to update OneSignal player with tags:', await updateResponse.text())
        }
      } catch (updateError) {
        console.warn('Error updating OneSignal player:', updateError)
        // Don't fail the whole request if tagging fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User linking recorded successfully',
      data: {
        clerkUserId,
        oneSignalPlayerId,
        timestamp: new Date().toISOString()
      }
    }, { headers })

  } catch (error) {
    console.error('Error in link-user endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process user linking',
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