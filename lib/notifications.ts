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
    notification.included_segments = ['All']
    
    if (url) {
      notification.url = url
    }
    
    if (data) {
      notification.data = data
    }

    // Add custom action buttons if provided
    if (buttons && buttons.length > 0) {
      notification.buttons = buttons.map(button => ({
        id: button.id,
        text: button.text,
        icon: button.icon
      }))
    }

    // Configure web push settings to customize behavior
    notification.web_buttons = buttons ? buttons.map(button => ({
      id: button.id,
      text: button.text,
      icon: button.icon,
      url: url || 'https://www.pokemon-fusion.com'
    })) : undefined

    const response = await client.createNotification(notification)
    console.log('OneSignal notification sent successfully:', response)
    return { success: true, id: response.id }
  } catch (error) {
    console.error('Error sending OneSignal notification:', error)
    throw error
  }
}

// Send notification to specific user
export async function sendNotification({
  userId,
  title,
  message,
  url,
  data,
}: {
  userId: string
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
    },
    buttons: [
      {
        id: 'generate_fusion',
        text: 'Generate Fusion',
        icon: 'https://www.pokemon-fusion.com/favicon-32x32.png'
      }
    ]
  })
} 