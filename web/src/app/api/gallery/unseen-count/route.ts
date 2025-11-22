// app/api/gallery/unseen-count/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const supabase = getSupabaseAdmin()

    // Get all published content sets
    const { data: allSets, error: setsError } = await supabase
      .from('content_sets')
      .select('id')
      .or(`published_at.not.is.null,scheduled_time.lte.${new Date().toISOString()}`)
      .is('deleted_at', null)

    if (setsError) {
      console.error('Error fetching content sets:', setsError)
      return NextResponse.json({ count: 0 })
    }

    if (!allSets || allSets.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    // Get sets the user has viewed
    const { data: viewedSets, error: viewsError } = await supabase
      .from('user_set_views')
      .select('set_id')
      .eq('user_id', userId)

    if (viewsError) {
      console.error('Error fetching viewed sets:', viewsError)
      return NextResponse.json({ count: 0 })
    }

    // Calculate unseen count
    const viewedSetIds = new Set(viewedSets?.map(v => v.set_id) || [])
    const unseenCount = allSets.filter(set => !viewedSetIds.has(set.id)).length

    return NextResponse.json({
      count: unseenCount
    })
  } catch (error) {
    console.error('Unseen count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}