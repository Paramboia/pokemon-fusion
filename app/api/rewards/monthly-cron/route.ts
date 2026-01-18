import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

interface FusionDB {
  id: string;
  user_id: string;
  pokemon_1_name: string;
  pokemon_2_name: string;
  fusion_name: string;
  fusion_image: string;
  likes: number;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    // Verify this is a legitimate Vercel cron request
    const userAgent = request.headers.get('user-agent') || ''
    const isVercelCron = userAgent.includes('vercel-cron') || userAgent.includes('Vercel')
    
    // In production, verify it's from Vercel cron
    // In development, allow requests with the cron secret for testing
    const url = new URL(request.url)
    const testSecret = url.searchParams.get('secret')
    const authHeader = request.headers.get('authorization')
    
    const isValidRequest = 
      isVercelCron || 
      (process.env.NODE_ENV !== 'production') ||
      (testSecret === process.env.CRON_SECRET) ||
      (authHeader === `Bearer ${process.env.CRON_SECRET}`)

    if (!isValidRequest) {
      console.error('Unauthorized cron request:', {
        userAgent,
        isVercelCron,
        environment: process.env.NODE_ENV,
        hasTestSecret: !!testSecret,
        hasAuthHeader: !!authHeader
      })
      return NextResponse.json(
        { error: 'Unauthorized - This endpoint is only accessible by Vercel cron jobs' },
        { status: 401, headers }
      )
    }

    console.log('Monthly rewards cron job triggered:', {
      userAgent,
      isVercelCron,
      timestamp: new Date().toISOString()
    })

    // Check if required env vars are present
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500, headers }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current month and year to prevent duplicate rewards
    const now = new Date()
    const month = now.getMonth() + 1 // getMonth() returns 0-11
    const year = now.getFullYear()
    const period = `${year}-${month.toString().padStart(2, '0')}`

    console.log(`Processing monthly rewards for period: ${period}`)

    // Step 1: Get top 3 fusions using hot score ranking (same as Popular page)
    let topFusions: FusionDB[] = []

    try {
      // Try to use the hot score RPC function (same as Popular page)
      const { data: hotData, error: hotError } = await supabase.rpc(
        'get_top_hot_score_fusions',
        { limit_val: 3 }
      )

      if (hotError) {
        console.warn('Hot score function failed, falling back to most liked:', hotError)
        // Fallback to most liked if hot score is not available
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('fusions')
          .select('*')
          .order('likes', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(3)

        if (fallbackError) {
          console.error('Error fetching fusions:', fallbackError)
          return NextResponse.json(
            { error: 'Failed to fetch top fusions' },
            { status: 500, headers }
          )
        }

        topFusions = fallbackData || []
      } else {
        topFusions = hotData || []
      }
    } catch (error) {
      console.error('Exception fetching top fusions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch top fusions' },
        { status: 500, headers }
      )
    }

    if (topFusions.length === 0) {
      console.log('No fusions found for monthly rewards')
      return NextResponse.json(
        { message: 'No fusions found for monthly rewards', period },
        { status: 200, headers }
      )
    }

    console.log(`Found ${topFusions.length} top fusions for rewards`)

    // Step 2: Check if rewards have already been given for this period
    // We'll check by looking for transactions with the period in the description
    const { data: existingTransactions, error: checkError } = await supabase
      .from('credits_transactions')
      .select('id')
      .eq('transaction_type', 'monthly_reward')
      .ilike('description', `%${period}%`)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing transactions:', checkError)
      // Continue anyway, as this is not critical
    }

    if (existingTransactions && existingTransactions.length > 0) {
      console.log(`Monthly rewards already processed for period ${period}`)
      return NextResponse.json(
        { message: 'Monthly rewards already processed for this period', period },
        { status: 200, headers }
      )
    }

    // Step 3: Award credits to top 3 users
    const rewards = [
      { rank: 1, credits: 3 },
      { rank: 2, credits: 2 },
      { rank: 3, credits: 1 }
    ]

    const results = []

    for (let i = 0; i < Math.min(topFusions.length, 3); i++) {
      const fusion = topFusions[i]
      const reward = rewards[i]
      const userId = fusion.user_id

      if (!userId) {
        console.warn(`Fusion ${fusion.id} has no user_id, skipping`)
        continue
      }

      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, credits_balance')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        console.error(`User ${userId} not found for fusion ${fusion.id}:`, userError)
        continue
      }

      // Insert credit transaction
      const transactionDescription = `Monthly Reward - ${reward.rank === 1 ? '1st' : reward.rank === 2 ? '2nd' : '3rd'} Place (${period}) - Fusion: ${fusion.fusion_name}`

      const { data: transactionData, error: transactionError } = await supabase
        .from('credits_transactions')
        .insert({
          user_id: userId,
          amount: reward.credits,
          transaction_type: 'monthly_reward',
          description: transactionDescription
        })
        .select()
        .single()

      if (transactionError) {
        console.error(`Error inserting transaction for user ${userId}:`, transactionError)
        results.push({
          fusion_id: fusion.id,
          user_id: userId,
          rank: reward.rank,
          credits: reward.credits,
          success: false,
          error: transactionError.message
        })
        continue
      }

      // Update user's credit balance
      const newBalance = (userData.credits_balance || 0) + reward.credits
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits_balance: newBalance })
        .eq('id', userId)

      if (updateError) {
        console.error(`Error updating credits balance for user ${userId}:`, updateError)
        // Transaction was inserted, but balance update failed - log for manual fix
        results.push({
          fusion_id: fusion.id,
          user_id: userId,
          rank: reward.rank,
          credits: reward.credits,
          success: false,
          error: `Transaction created but balance update failed: ${updateError.message}`
        })
        continue
      }

      console.log(`Successfully awarded ${reward.credits} credits to user ${userId} (rank ${reward.rank})`)
      results.push({
        fusion_id: fusion.id,
        fusion_name: fusion.fusion_name,
        user_id: userId,
        rank: reward.rank,
        credits: reward.credits,
        success: true
      })
    }

    const successfulRewards = results.filter(r => r.success).length

    return NextResponse.json(
      {
        message: `Monthly rewards processed for ${period}`,
        period,
        top_fusions_count: topFusions.length,
        rewards_given: successfulRewards,
        results
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error('Monthly rewards cron job error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

