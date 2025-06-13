import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OneSignal from '@onesignal/node-onesignal'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    // Basic authentication
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    }

    console.log('IMPORTANT: This endpoint should NOT be used for push notifications!')
    
    return NextResponse.json({
      success: false,
      important_notice: "⚠️ Push Notification Sync Not Supported",
      explanation: {
        issue: "Syncing users from Supabase creates EMAIL subscribers, not PUSH subscribers",
        why: "Push notifications require explicit browser permission from each user",
        solution: "Users must opt-in through the website frontend using OneSignal's SDK"
      },
      correct_approach: {
        step1: "Users visit your website with OneSignal SDK initialized",
        step2: "Users click notification permission prompt in their browser", 
        step3: "OneSignal automatically creates push subscribers",
        step4: "Use 'Total Subscriptions' segment to target all push subscribers"
      },
      current_stats: {
        message: "Check OneSignal dashboard - synced users show as EMAIL (✉️) not PUSH (🔔)",
        recommendation: "Remove synced email records and focus on organic push subscriptions"
      }
    }, { headers })

  } catch (error: any) {
    console.error('Error in sync-users info endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to provide sync info',
        details: error?.message || 'Unknown error'
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

// Explicitly export GET to return method info
export async function GET() {
  return NextResponse.json({ 
    message: 'This endpoint provides information about user sync limitations for push notifications',
    method: 'Use POST with secret parameter to get detailed information'
  }, { status: 200 })
} 