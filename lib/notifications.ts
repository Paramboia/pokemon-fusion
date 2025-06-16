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

// Send notification to all users
export async function sendNotificationToAll({
  title,
  content,
  url,
  data,
  buttons,
}: {
  title: string
  content: string
  url?: string
  data?: Record<string, any>
  buttons?: Array<{ id: string; text: string; icon?: string }>
}) {
  try {
    const notification = new OneSignal.Notification()
    notification.app_id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
    notification.contents = { en: content }
    notification.headings = { en: title }
    // Target all subscribed users - using the standard OneSignal segment
    notification.included_segments = ['Subscribed Users']
    
    if (url) {
      notification.url = url
    }
    
    if (data) {
      notification.data = data
    }

    // Add custom action buttons if provided (simplified configuration)
    if (buttons && buttons.length > 0) {
      notification.buttons = buttons.map(button => ({
        id: button.id,
        text: button.text,
        icon: button.icon
      }))
    }

    const response = await client.createNotification(notification)
    
    // Enhanced logging for debugging
    console.log('OneSignal API Response:', {
      id: response.id,
      recipients: response.recipients,
      errors: response.errors
    })
    
    // Check for errors in the response
    if (response.errors && Object.keys(response.errors).length > 0) {
      console.error('OneSignal notification errors:', response.errors)
      throw new Error(`OneSignal notification failed: ${JSON.stringify(response.errors)}`)
    }
    
    if (!response.id) {
      console.error('OneSignal notification failed: No notification ID returned')
      throw new Error('OneSignal notification failed: No notification ID returned')
    }
    
    console.log('OneSignal notification sent successfully with ID:', response.id)
    return { success: true, id: response.id, recipients: response.recipients }
  } catch (error) {
    console.error('Error sending OneSignal notification:', error)
    throw error
  }
}

// Send notification to specific user by external user ID (Supabase or Clerk ID)
export async function sendNotification({
  userId,
  title,
  message,
  url,
  data,
}: {
  userId: string // This should be the Supabase user ID (preferred) or Clerk ID
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}) {
  try {
    const notification = new OneSignal.Notification()
    notification.app_id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
    notification.contents = { en: message }
    notification.headings = { en: title }
    notification.include_external_user_ids = [userId]
    
    if (url) {
      notification.url = url
    }
    
    if (data) {
      notification.data = data
    }

    const response = await client.createNotification(notification)
    console.log('OneSignal notification sent successfully:', response)
    return { success: true, id: response.id }
  } catch (error) {
    console.error('Error sending OneSignal notification:', error)
    throw error
  }
}

// Send notification to specific user by Supabase user ID
export async function sendNotificationToSupabaseUser({
  supabaseUserId,
  title,
  message,
  url,
  data,
}: {
  supabaseUserId: string
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}) {
  console.log('Sending notification to Supabase user:', supabaseUserId)
  return await sendNotification({
    userId: supabaseUserId,
    title,
    message,
    url,
    data
  })
}

// Send notification to multiple users by their Supabase user IDs
export async function sendNotificationToSupabaseUsers({
  supabaseUserIds,
  title,
  message,
  url,
  data,
}: {
  supabaseUserIds: string[]
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}) {
  try {
    const notification = new OneSignal.Notification()
    notification.app_id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
    notification.contents = { en: message }
    notification.headings = { en: title }
    notification.include_external_user_ids = supabaseUserIds
    
    if (url) {
      notification.url = url
    }
    
    if (data) {
      notification.data = data
    }

    const response = await client.createNotification(notification)
    console.log('OneSignal notification sent to multiple Supabase users successfully:', response)
    return { success: true, id: response.id, recipients: response.recipients }
  } catch (error) {
    console.error('Error sending OneSignal notification to multiple users:', error)
    throw error
  }
}

// Send daily notification to all users
export async function sendDailyNotification() {
  const title = "Pokemon-Fusion 🐉"
  const content = "Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!"
  const url = "https://www.pokemon-fusion.com"
  
  return await sendNotificationToAll({
    title,
    content,
    url,
    data: {
      type: 'daily_motivation',
      timestamp: new Date().toISOString()
    }
    // Temporarily removing buttons to test if they're causing the issue
    // buttons: [
    //   {
    //     id: 'generate_fusion',
    //     text: 'Generate Fusion',
    //     icon: 'https://www.pokemon-fusion.com/favicon-32x32.png'
    //   }
    // ]
  })
}

// Send test notification to verify targeting
export async function sendTestNotification() {
  const title = "Pokemon-Fusion Test 🧪"
  const content = "This is a test notification to verify all subscribers are receiving messages!"
  const url = "https://www.pokemon-fusion.com"
  
  return await sendNotificationToAll({
    title,
    content,
    url,
    data: {
      type: 'test_notification',
      timestamp: new Date().toISOString()
    },
    buttons: [
      {
        id: 'test_action',
        text: 'Test Successful',
        icon: 'https://www.pokemon-fusion.com/favicon-32x32.png'
      }
    ]
  })
} 