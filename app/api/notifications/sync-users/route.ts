import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OneSignal from '@onesignal/node-onesignal'

// Initialize OneSignal client
const configuration = OneSignal.createConfiguration({
  authMethods: {
    app_key: {
      tokenProvider: {
        getToken(): string {
          return process.env.ONESIGNAL_REST_API_KEY || ''
        }
      }
    }
  }
})

const client = new OneSignal.DefaultApi(configuration)

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Basic authentication
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Syncing users from Supabase to OneSignal...')
    
    // Get all users from Supabase
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, clerk_id')
      .limit(1000) // Process in batches of 1000
    
    if (fetchError) {
      console.error('Error fetching users from Supabase:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch users from Supabase' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users found in Supabase',
        syncedCount: 0
      })
    }

    console.log(`Found ${users.length} users in Supabase`)

    // Sync users to OneSignal
    let syncedCount = 0
    let errors = []

    for (const user of users) {
      try {
        // Create external user ID record in OneSignal
        const player = new OneSignal.Player()
        player.app_id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
        player.external_user_id = user.clerk_id || user.id // Use clerk_id if available, otherwise use supabase id
        player.device_type = 'web' as any // For web push notifications
        
        // Add user metadata
        if (user.email) {
          player.email = user.email
        }
        
        if (user.name) {
          player.tags = { name: user.name }
        }

        // Create the player record
        await client.createPlayer(player)
        syncedCount++
        
        console.log(`Synced user: ${user.email} (${user.id})`)
      } catch (userError) {
        console.error(`Error syncing user ${user.email}:`, userError)
        errors.push({
          userId: user.id,
          email: user.email,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        })
      }
    }

    console.log(`Successfully synced ${syncedCount} out of ${users.length} users`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} users to OneSignal`,
      totalUsers: users.length,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in sync-users endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 