import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OneSignal from '@onesignal/node-onesignal'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Basic authentication
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting OneSignal user sync...')
    
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get all users from Supabase
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, clerk_id')
      .limit(100) // Start with smaller batch
    
    if (fetchError) {
      console.error('Error fetching users from Supabase:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch users from Supabase', details: fetchError.message },
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
        // Create player object with proper OneSignal format
        const playerData = {
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
          external_user_id: user.clerk_id || user.id,
          device_type: 11, // Web Push (required field)
          identifier: user.email || undefined, // Email identifier
          tags: user.name ? { name: user.name } : undefined
        }

        // Create the player record
        const result = await client.createPlayer(playerData as OneSignal.Player)
        syncedCount++
        
        console.log(`Synced user: ${user.email} (${user.id})`)
      } catch (userError: any) {
        console.error(`Error syncing user ${user.email}:`, userError)
        errors.push({
          userId: user.id,
          email: user.email,
          error: userError?.message || 'Unknown error'
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

  } catch (error: any) {
    console.error('Error in sync-users endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync users',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Explicitly export GET to return 405 for GET requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
} 