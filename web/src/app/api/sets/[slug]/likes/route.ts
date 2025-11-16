// src/app/api/sets/[slug]/likes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    slug: string
  }>
}

// GET - Check if user has liked a content set
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ liked: false })
    }

    const { slug: setId } = await params
    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Check if like exists
    const { data: like } = await supabase
      .from('content_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('set_id', setId)
      .single()

    return NextResponse.json({ liked: !!like })
  } catch (error) {
    console.error('Error checking like status:', error)
    return NextResponse.json({ liked: false })
  }
}

// POST - Like a content set
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { slug: setId } = await params
    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('content_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('set_id', setId)
      .single()

    if (existingLike) {
      return NextResponse.json({ 
        error: 'Already liked',
        liked: true 
      })
    }

    // Create like
    const { error: insertError } = await supabase
      .from('content_likes')
      .insert({
        user_id: userId,
        set_id: setId
      })

    if (insertError) {
      console.error('Error creating like:', insertError)
      return NextResponse.json(
        { error: 'Failed to create like' },
        { status: 500 }
      )
    }

    // Increment like count
    await supabase.rpc('increment', {
      table_name: 'content_sets',
      column_name: 'like_count',
      row_id: setId
    })

    return NextResponse.json({ 
      success: true,
      liked: true 
    })
  } catch (error) {
    console.error('Error liking content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Unlike a content set
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { slug: setId } = await params
    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Delete like
    const { error: deleteError } = await supabase
      .from('content_likes')
      .delete()
      .eq('user_id', userId)
      .eq('set_id', setId)

    if (deleteError) {
      console.error('Error deleting like:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove like' },
        { status: 500 }
      )
    }

    // Decrement like count
    await supabase.rpc('decrement', {
      table_name: 'content_sets',
      column_name: 'like_count',
      row_id: setId
    })

    return NextResponse.json({ 
      success: true,
      liked: false 
    })
  } catch (error) {
    console.error('Error unliking content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}