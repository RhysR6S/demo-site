// src/app/api/content/likes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const setId = searchParams.get('setId')
    
    if (!setId) {
      return NextResponse.json({ error: 'Set ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Get like status
    const { data: likeData } = await supabase
      .from('content_likes')
      .select('*')
      .eq('user_id', token.sub)
      .eq('set_id', setId)
      .maybeSingle()

    // Get total count
    const { count } = await supabase
      .from('content_likes')
      .select('*', { count: 'exact', head: true })
      .eq('set_id', setId)

    return NextResponse.json({ 
      liked: !!likeData,
      count: count || 0 
    })
  } catch (error) {
    console.error('Likes API error:', error)
    return NextResponse.json({ error: 'Failed to load likes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { setId } = body

    if (!setId) {
      return NextResponse.json({ error: 'Set ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Check existing like
    const { data: existing } = await supabase
      .from('content_likes')
      .select('*')
      .eq('user_id', token.sub)
      .eq('set_id', setId)
      .maybeSingle()

    if (existing) {
      // Unlike
      await supabase
        .from('content_likes')
        .delete()
        .eq('id', existing.id)

      // Update count
      await supabase.rpc('decrement_like_count', { set_id: setId })

      return NextResponse.json({ liked: false })
    } else {
      // Like
      await supabase
        .from('content_likes')
        .insert({
          user_id: token.sub,
          set_id: setId
        })

      // Update count
      await supabase.rpc('increment_like_count', { set_id: setId })

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Like toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}