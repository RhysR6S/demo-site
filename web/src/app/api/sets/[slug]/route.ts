// src/app/api/sets/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { logSetView } from '@/lib/activity-logger'
import type { ContentSetWithRelations } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Await params as required in Next.js 15+
    const { slug } = await params
    
    // Get authenticated user
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const isCreator = token.isCreator || false
    const supabase = getSupabaseAdmin()

    // Fetch content set with related data
    // Fix: Use the explicit foreign key relationship name
    const { data: contentSet, error } = await supabase
      .from('content_sets')
      .select(`
        *,
        images!images_set_id_fkey (
          id,
          filename,
          r2_key,
          order_index,
          width,
          height,
          file_size_bytes,
          mime_type
        ),
        set_characters (
          character:characters (
            id,
            name,
            slug,
            series:series_id (
              id,
              name,
              slug
            )
          )
        )
      `)
      .eq('slug', slug)
      .single()

    if (error || !contentSet) {
      console.error('[Sets API] Database error:', error)
      return NextResponse.json({ error: 'Content set not found' }, { status: 404 })
    }

    // Check if content is published
    const now = new Date().toISOString()
    const isPublished = contentSet.published_at || 
                       (contentSet.scheduled_time && contentSet.scheduled_time <= now)

    if (!isPublished && !isCreator) {
      return NextResponse.json({ error: 'Content not yet available' }, { status: 403 })
    }

    // Get user-specific data
    const [viewData, downloadData, likeData] = await Promise.all([
      // Get view data
      supabase
        .from('user_set_views')
        .select('*')
        .eq('user_id', userId)
        .eq('set_id', contentSet.id)
        .single(),
      
      // Get download data
      supabase
        .from('user_set_downloads')
        .select('*')
        .eq('user_id', userId)
        .eq('set_id', contentSet.id)
        .single(),
      
      // Get like data
      supabase
        .from('content_likes')
        .select('*')
        .eq('user_id', userId)
        .eq('set_id', contentSet.id)
        .single()
    ])

    // Transform the data
    const transformedSet: ContentSetWithRelations = {
      ...contentSet,
      characters: contentSet.set_characters?.map((sc: any) => sc.character).filter(Boolean) || [],
      images: contentSet.images || [],
      thumbnail: contentSet.images?.find((img: any) => img.id === contentSet.thumbnail_image_id) || contentSet.images?.[0]
    }

    // OPTIMIZED: Use atomic increment and upsert for efficient view tracking
    // Old: 2-3 separate queries (read, update user, update set)
    // New: 2 queries (upsert + atomic increment) with no race conditions

    // Update user view record with upsert (handles insert OR update)
    await supabase
      .from('user_set_views')
      .upsert({
        user_id: userId,
        set_id: contentSet.id,
        first_viewed_at: viewData.data?.first_viewed_at || now,
        last_viewed_at: now,
        view_count: (viewData.data?.view_count || 0) + 1
      }, {
        onConflict: 'user_id,set_id',
        ignoreDuplicates: false
      })

    // Atomic increment of view count (no race condition, single query)
    await supabase.rpc('increment_view_count', { set_id: contentSet.id })

    // Log activity (async, doesn't block response)
    logSetView(contentSet.id, userId, request).catch(console.error)

    return NextResponse.json({
      contentSet: transformedSet,
      userHasViewed: !!viewData.data,
      userHasDownloaded: !!downloadData.data,
      userHasLiked: !!likeData.data,
      viewCount: viewData.data?.view_count || 1
    })
  } catch (error) {
    console.error('[Sets API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}