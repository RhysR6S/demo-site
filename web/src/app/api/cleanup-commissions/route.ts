// src/app/api/cleanup-commissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    
    // Calculate timestamp 24 hours ago
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    // Delete commissions completed more than 24 hours ago
    const { data, error } = await supabase
      .from('commissions')
      .delete()
      .eq('status', 'completed')
      .lte('completed_at', oneDayAgo.toISOString())
      .select()

    if (error) {
      console.error('Error cleaning up commissions:', error)
      return NextResponse.json({ error: 'Failed to cleanup commissions' }, { status: 500 })
    }

    const deletedCount = data?.length || 0
    console.log(`Cleaned up ${deletedCount} completed commissions`)

    return NextResponse.json({ 
      success: true, 
      deleted: deletedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Commission cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow manual trigger with same logic
  return GET(request)
}
