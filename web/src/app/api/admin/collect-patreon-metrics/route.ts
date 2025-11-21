// src/app/api/admin/collect-patreon-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { PatreonMetricsService } from '@/lib/patreon-metrics'

const DEV_BYPASS_ENABLED = process.env.DEV_BYPASS_AUTH === 'true'

/**
 * API endpoint to collect current Patreon metrics and store them in the database
 * This should be called periodically (via cron job or scheduled function)
 *
 * GET /api/admin/collect-patreon-metrics - Collect metrics (requires creator auth)
 * GET /api/admin/collect-patreon-metrics?cron_secret=YOUR_SECRET - For automated collection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cronSecret = searchParams.get('cron_secret')

    // Demo mode: Return mock success response
    if (DEV_BYPASS_ENABLED && !cronSecret) {
      console.log('🔓 DEV MODE: Returning mock metrics collection success')

      // Insert mock metrics into database for demo purposes
      const supabase = getSupabaseAdmin()

      const mockMetrics = {
        total_patrons: 150,
        total_earnings_cents: 75000, // £750 in cents
        patron_count_by_tier: {
          'tier-1': 100,
          'tier-2': 40,
          'tier-3': 10
        },
        earnings_by_tier: {
          'tier-1': 30000,
          'tier-2': 30000,
          'tier-3': 15000
        }
      }

      const { data: snapshot, error: insertError } = await supabase
        .from('patreon_metrics_history')
        .insert(mockMetrics)
        .select()
        .single()

      if (insertError) {
        console.error('[Demo Metrics] Database error:', insertError)
        // Don't fail in demo mode, just return success
        return NextResponse.json({
          success: true,
          demo: true,
          message: 'Demo mode - mock metrics generated'
        })
      }

      return NextResponse.json({
        success: true,
        demo: true,
        snapshot: {
          id: snapshot.id,
          created_at: snapshot.created_at,
          total_patrons: snapshot.total_patrons,
          total_earnings_cents: snapshot.total_earnings_cents
        },
        message: 'Demo mode - metrics collected successfully'
      })
    }

    // Two authentication methods:
    // 1. Manual trigger by creator (via admin panel)
    // 2. Automated trigger with cron secret

    let accessToken: string | null = null

    if (cronSecret) {
      // Verify cron secret for automated collection
      if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json(
          { error: 'Invalid cron secret' },
          { status: 401 }
        )
      }

      // For automated collection, use stored creator access token
      accessToken = process.env.PATREON_CREATOR_ACCESS_TOKEN || null

      if (!accessToken) {
        console.error('[Metrics Collector] No creator access token available for automated collection')
        return NextResponse.json(
          { error: 'No access token configured for automated collection' },
          { status: 500 }
        )
      }
    } else {
      // Manual trigger - check creator authentication
      const session = await getServerSession(authOptions)

      if (!session?.user?.isCreator) {
        return NextResponse.json(
          { error: 'Creator access required' },
          { status: 403 }
        )
      }

      // For manual collection, use stored creator access token
      // In your setup, you'd store this when the creator connects their Patreon account
      accessToken = process.env.PATREON_CREATOR_ACCESS_TOKEN || null

      if (!accessToken) {
        return NextResponse.json(
          {
            error: 'No Patreon access token configured',
            message: 'Please set PATREON_CREATOR_ACCESS_TOKEN in environment variables'
          },
          { status: 401 }
        )
      }
    }
    
    // Fetch current metrics from Patreon using the existing service
    console.log('[Metrics Collector] Fetching current Patreon metrics...')
    const metrics = await PatreonMetricsService.getMetrics(accessToken)
    
    // Store metrics in database
    const supabase = getSupabaseAdmin()
    
    const { data: snapshot, error: insertError } = await supabase
      .from('patreon_metrics_history')
      .insert({
        total_patrons: metrics.patronCount,
        total_earnings_cents: metrics.monthlyRevenue,
        patron_count_by_tier: metrics.tierBreakdown,
        earnings_by_tier: metrics.earningsByTier || {}
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Metrics Collector] Database error:', insertError)
      return NextResponse.json(
        { error: 'Failed to store metrics', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('[Metrics Collector] Successfully stored metrics snapshot:', snapshot.id)

    // Clean up old snapshots (keep last 90 days of data)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { error: cleanupError } = await supabase
      .from('patreon_metrics_history')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString())

    if (cleanupError) {
      console.warn('[Metrics Collector] Cleanup error:', cleanupError)
    }

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        created_at: snapshot.created_at,
        total_patrons: snapshot.total_patrons,
        total_earnings_cents: snapshot.total_earnings_cents
      },
      message: 'Metrics collected successfully'
    })
    
  } catch (error) {
    console.error('[Metrics Collector] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to collect metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to manually trigger a collection (for testing)
 */
export async function POST(request: NextRequest) {
  // Reuse GET logic for manual collection
  return GET(request)
}