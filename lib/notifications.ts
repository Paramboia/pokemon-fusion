import OneSignal from '@onesignal/node-onesignal'

const client = new OneSignal.Client(
  process.env.ONESIGNAL_APP_ID!,
  process.env.ONESIGNAL_REST_API_KEY!
)

export async function sendNotification({
  userId,
  title,
  message,
  url,
}: {
  userId: string
  title: string
  message: string
  url?: string
}) {
  try {
    const notification = new OneSignal.Notification({
      contents: {
        en: message,
      },
      headings: {
        en: title,
      },
      include_external_user_ids: [userId],
      url,
    })

    await client.createNotification(notification)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
} 