import { NextResponse } from 'next/server'
import { sendDailyNotification, sendNotificationToAll, sendTestNotification } from '@/lib/notifications'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Basic authentication for testing
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Test notification triggered')
    
    let result;
    
    if (body.type === 'custom') {
      // Send custom notification
      result = await sendNotificationToAll({
        title: body.title || 'Test Notification',
        content: body.content || 'This is a test notification',
        url: body.url || 'https://www.pokemon-fusion.com',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      })
    } else if (body.type === 'targeting') {
      // Send targeting test notification
      result = await sendTestNotification()
    } else {
      // Send daily notification
      result = await sendDailyNotification()
    }
    
    console.log('Test notification sent successfully:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent successfully',
      notificationId: result.id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 