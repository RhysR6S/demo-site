// src/app/api/content/comments/route.ts
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

    const { data: comments, error } = await supabase
      .from('content_comments')
      .select('*')
      .eq('set_id', setId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ comments: comments || [] })
  } catch (error) {
    console.error('Comments API error:', error)
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { setId, comment } = body

    if (!setId || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('content_comments')
      .insert({
        user_id: token.sub,
        user_name: token.name || 'Anonymous',
        user_email: token.email || '',
        set_id: setId,
        comment
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ comment: data })
  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}