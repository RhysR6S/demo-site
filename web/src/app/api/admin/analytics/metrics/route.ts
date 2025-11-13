// src/app/api/admin/analytics/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * API endpoint to fetch analytics metrics data
 * Returns current metrics, historical data, and staleness status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }
    
    const supabase = getSupabaseAdmin()
    
    // Fetch the most recent snapshot
    const { data: currentSnapshot, error: currentError } = await supabase
      .from('patreon_metrics_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (currentError && currentError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Analytics API] Error fetching current snapshot:', currentError)
      return NextResponse.json(
        { error: 'Failed to fetch current metrics' },
        { status: 500 }
      )
    }
    
    // Fetch historical data (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { data: history, error: historyError } = await supabase
      .from('patreon_metrics_history')
      .select('*')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true })
    
    if (historyError) {
      console.error('[Analytics API] Error fetching history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch historical metrics' },
        { status: 500 }
      )
    }
    
    // Determine if data is stale (older than 24 hours)
    let isStale = true
    let lastUpdated = null
    
    if (currentSnapshot) {
      lastUpdated = currentSnapshot.created_at
      const lastUpdateTime = new Date(currentSnapshot.created_at).getTime()
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
      isStale = lastUpdateTime < twentyFourHoursAgo
    }
    
    // If no data exists at all, we definitely need to collect
    if (!currentSnapshot || !history || history.length === 0) {
      isStale = true
    }
    
    return NextResponse.json({
      current: currentSnapshot,
      history: history || [],
      lastUpdated,
      isStale,
      summary: {
        totalSnapshots: history?.length || 0,
        oldestSnapshot: history && history.length > 0 ? history[0].created_at : null,
        newestSnapshot: currentSnapshot?.created_at || null,
        dataAgeHours: currentSnapshot 
          ? Math.floor((Date.now() - new Date(currentSnapshot.created_at).getTime()) / (1000 * 60 * 60))
          : null
      }
    })
    
  } catch (error) {
    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
