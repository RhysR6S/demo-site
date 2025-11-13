// src/app/api/user/stats/route.ts
// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Get viewed sets
    const { data: viewData } = await supabase
      .from('user_set_views')
      .select('set_id')
      .eq('user_id', userId)
    
    const viewedSets = viewData ? new Set(viewData.map(v => v.set_id)).size : 0

    // Get downloaded sets
    const { data: downloadData } = await supabase
      .from('user_set_downloads')
      .select('set_id')
      .eq('user_id', userId)
    
    const downloadedSets = downloadData ? new Set(downloadData.map(d => d.set_id)).size : 0

    // Get commissions
    const { data: commissionData } = await supabase
      .from('commissions')
      .select('id')
      .eq('user_id', userId)
    
    const commissionCount = commissionData?.length || 0

    // Get new content (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data: newContentData } = await supabase
      .from('content_sets')
      .select('id')
      .not('published_at', 'is', null)
      .gte('published_at', weekAgo.toISOString())
    
    const newContent = newContentData?.length || 0

    return NextResponse.json({
      viewedSets,
      downloadedSets,
      commissionCount,
      newContent,
      unreadMessages: 0
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
