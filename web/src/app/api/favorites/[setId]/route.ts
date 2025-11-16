// src/app/api/favorites/[setId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET - Check if set is favorited
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const { setId } = await params
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('content_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('set_id', setId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking favorite status:', error)
      return NextResponse.json({ error: 'Failed to check favorite status' }, { status: 500 })
    }

    return NextResponse.json({ isFavorited: !!data })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const { setId } = await params
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Check if already favorited
    const { data: existing } = await supabase
      .from('content_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('set_id', setId)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Already favorited' }, { status: 200 })
    }

    // Add to favorites
    const { error: insertError } = await supabase
      .from('content_likes')
      .insert({
        user_id: userId,
        set_id: setId
      })

    if (insertError) {
      console.error('Error adding to favorites:', insertError)
      return NextResponse.json({ error: 'Failed to add to favorites' }, { status: 500 })
    }

    // Update like count on content set
    const { data: contentSet } = await supabase
      .from('content_sets')
      .select('like_count')
      .eq('id', setId)
      .single()

    if (contentSet) {
      await supabase
        .from('content_sets')
        .update({ like_count: (contentSet.like_count || 0) + 1 })
        .eq('id', setId)
    }

    // Dispatch event to refresh UI
    return NextResponse.json({ 
      message: 'Added to favorites',
      isFavorited: true 
    })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const { setId } = await params
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Remove from favorites
    const { error: deleteError } = await supabase
      .from('content_likes')
      .delete()
      .eq('user_id', userId)
      .eq('set_id', setId)

    if (deleteError) {
      console.error('Error removing from favorites:', deleteError)
      return NextResponse.json({ error: 'Failed to remove from favorites' }, { status: 500 })
    }

    // Update like count on content set
    const { data: contentSet } = await supabase
      .from('content_sets')
      .select('like_count')
      .eq('id', setId)
      .single()

    if (contentSet && contentSet.like_count > 0) {
      await supabase
        .from('content_sets')
        .update({ like_count: contentSet.like_count - 1 })
        .eq('id', setId)
    }

    return NextResponse.json({ 
      message: 'Removed from favorites',
      isFavorited: false 
    })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}