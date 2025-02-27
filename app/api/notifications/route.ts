import { NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    await sendNotification(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
} 