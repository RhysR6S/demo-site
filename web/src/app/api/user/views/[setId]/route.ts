// src/app/api/user/views/[setId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { setId } = await params
    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Upsert view record
    const { error } = await supabase
      .from('user_set_views')
      .upsert({
        user_id: userId,
        set_id: setId,
        last_viewed_at: new Date().toISOString(),
        view_count: 1
      }, {
        onConflict: 'user_id,set_id',
        ignoreDuplicates: false
      })

    if (error) {
      throw error
    }

    // Increment view count on set
    await supabase.rpc('increment_view_count', { set_id: setId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('View tracking error:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }
}