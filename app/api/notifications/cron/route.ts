import { NextResponse } from 'next/server'
import { sendDailyNotification } from '@/lib/notifications'

export async function GET(request: Request) {
  try {
    // Verify the request is coming from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Cron job triggered: Sending daily Pokemon Fusion notification')
    
    const result = await sendDailyNotification()
    
    console.log('Daily notification sent successfully:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily notification sent successfully',
      notificationId: result.id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in cron job:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send daily notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support POST for testing
export async function POST(request: Request) {
  try {
    // For testing, we can allow POST requests with a different auth mechanism
    const body = await request.json()
    
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Manual trigger: Sending daily Pokemon Fusion notification')
    
    const result = await sendDailyNotification()
    
    console.log('Daily notification sent successfully:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily notification sent successfully (manual trigger)',
      notificationId: result.id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in manual trigger:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send daily notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 