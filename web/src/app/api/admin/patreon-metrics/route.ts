// src/app/api/admin/patreon-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PatreonMetricsService } from '@/lib/patreon-metrics'

export async function GET(request: NextRequest) {
  try {
    // Check for force refresh parameter
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('[API Route] Patreon metrics requested, force refresh:', forceRefresh)
    
    // Get the JWT token which contains the access token
    const token = await getToken({ req: request })
    
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    // Check if we have a valid access token
    if (!token.accessToken) {
      return NextResponse.json(
        { error: 'No access token available. Please sign in again.' },
        { status: 401 }
      )
    }
    
    // Clear cache if force refresh
    if (forceRefresh) {
      console.log('[API Route] Clearing Patreon metrics cache...')
      const { getSupabaseAdmin } = await import('@/lib/supabase')
      const supabase = getSupabaseAdmin()
      await supabase
        .from('cache')
        .delete()
        .eq('key', 'patreon_metrics')
    }

    // Get metrics with the actual access token
    const metrics = await PatreonMetricsService.getMetrics(token.accessToken as string)
    
    // Log the currency for debugging
    console.log('[API Route] Returning metrics with currency:', metrics.currency)

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching Patreon metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
