/**
 * Script to link existing OneSignal subscribers to their Supabase user IDs
 * 
 * This script helps resolve the issue where users subscribed to OneSignal
 * before the external user ID linking was implemented.
 * 
 * Usage:
 * 1. Set environment variables (ONESIGNAL_REST_API_KEY, etc.)
 * 2. Run: node scripts/link-existing-users.js
 */

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_ONESIGNAL_APP_ID')
  console.error('- ONESIGNAL_REST_API_KEY') 
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function getOneSignalPlayers() {
  console.log('📡 Fetching OneSignal players...')
  
  try {
    const response = await fetch(`https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=300`, {
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`📊 Found ${data.players?.length || 0} OneSignal players`)
    
    return data.players || []
  } catch (error) {
    console.error('❌ Error fetching OneSignal players:', error)
    return []
  }
}

async function getSupabaseUsers() {
  console.log('🗄️ Fetching Supabase users...')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    const { data, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, name')
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }
    
    console.log(`📊 Found ${data?.length || 0} Supabase users`)
    return data || []
  } catch (error) {
    console.error('❌ Error fetching Supabase users:', error)
    return []
  }
}

async function linkPlayerToUser(playerId, supabaseUserId, userEmail, clerkId) {
  try {
    console.log(`🔗 Linking player ${playerId.substring(0, 8)}... to user ${supabaseUserId}`)
    
    const response = await fetch(`https://onesignal.com/api/v1/players/${playerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        external_user_id: supabaseUserId,
        tags: {
          clerk_id: clerkId || '',
          supabase_id: supabaseUserId,
          user_email: userEmail || '',
          linked_at: new Date().toISOString(),
          linked_by: 'bulk_script'
        }
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Successfully linked player ${playerId.substring(0, 8)}...`)
      return { success: true, playerId, supabaseUserId }
    } else {
      console.error(`❌ Failed to link player ${playerId.substring(0, 8)}...:`, data)
      return { success: false, playerId, supabaseUserId, error: data }
    }
  } catch (error) {
    console.error(`❌ Error linking player ${playerId.substring(0, 8)}...:`, error)
    return { success: false, playerId, supabaseUserId, error: error.message }
  }
}

async function main() {
  console.log('🚀 Starting OneSignal user linking process...')
  console.log('⚠️  This script will link existing OneSignal players to Supabase user IDs')
  console.log('')

  // Get data from both sources
  const [oneSignalPlayers, supabaseUsers] = await Promise.all([
    getOneSignalPlayers(),
    getSupabaseUsers()
  ])

  if (oneSignalPlayers.length === 0 || supabaseUsers.length === 0) {
    console.error('❌ No data found from OneSignal or Supabase')
    return
  }

  // Create email lookup map for Supabase users
  const usersByEmail = new Map()
  supabaseUsers.forEach(user => {
    if (user.email) {
      usersByEmail.set(user.email.toLowerCase(), user)
    }
  })

  console.log(`📋 Created lookup map for ${usersByEmail.size} users`)
  console.log('')

  // Find players that need linking
  const playersToLink = []
  const playersAlreadyLinked = []
  const playersNoMatch = []

  oneSignalPlayers.forEach(player => {
    // Skip if already has external_user_id
    if (player.external_user_id) {
      playersAlreadyLinked.push(player)
      return
    }

    // Try to find matching Supabase user by email
    // OneSignal might have email in tags or other fields
    let userEmail = null
    
    // Check various places where email might be stored
    if (player.tags && player.tags.user_email) {
      userEmail = player.tags.user_email
    } else if (player.email) {
      userEmail = player.email
    }

    if (userEmail) {
      const supabaseUser = usersByEmail.get(userEmail.toLowerCase())
      if (supabaseUser) {
        playersToLink.push({
          player,
          supabaseUser,
          email: userEmail
        })
      } else {
        playersNoMatch.push({ player, email: userEmail })
      }
    } else {
      playersNoMatch.push({ player, email: 'no_email' })
    }
  })

  console.log('📊 Analysis Results:')
  console.log(`   ✅ Already linked: ${playersAlreadyLinked.length}`)
  console.log(`   🔗 Can be linked: ${playersToLink.length}`)
  console.log(`   ❓ No match found: ${playersNoMatch.length}`)
  console.log('')

  if (playersToLink.length === 0) {
    console.log('✨ No players need linking!')
    return
  }

  console.log(`🔗 Starting to link ${playersToLink.length} players...`)
  console.log('')

  const results = []
  for (const { player, supabaseUser, email } of playersToLink) {
    const result = await linkPlayerToUser(
      player.id,
      supabaseUser.id,
      email,
      supabaseUser.clerk_id
    )
    results.push(result)
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Summary
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('')
  console.log('🎉 Linking process completed!')
  console.log(`   ✅ Successfully linked: ${successful}`)
  console.log(`   ❌ Failed to link: ${failed}`)
  
  if (failed > 0) {
    console.log('')
    console.log('❌ Failed linkings:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   Player ${r.playerId.substring(0, 8)}...: ${r.error}`)
    })
  }

  console.log('')
  console.log('💡 Next steps:')
  console.log('   1. Check OneSignal dashboard to verify External IDs are set')
  console.log('   2. Test targeted notifications using External User IDs')
  console.log('   3. For unmatched players, users need to re-subscribe through the app')
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error)
  process.exit(1)
}) 