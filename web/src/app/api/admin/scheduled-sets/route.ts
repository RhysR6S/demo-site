// src/app/api/admin/scheduled-sets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verify creator access
    const token = await getToken({ req: request })
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get all content sets with scheduled times
    const { data: scheduledSets, error } = await supabase
      .from('content_sets')
      .select('id, title, scheduled_time, published_at')
      .not('scheduled_time', 'is', null)
      .order('scheduled_time', { ascending: true })

    if (error) {
      console.error('[Scheduled Sets API] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled sets', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sets: scheduledSets || [],
      count: scheduledSets?.length || 0
    })
  } catch (error) {
    console.error('[Scheduled Sets API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}