// src/app/api/sets/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ContentSetWithRelations } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    // Fetch published content sets with related data
    const now = new Date().toISOString()
    const { data: sets, error, count } = await supabase
      .from('content_sets')
      .select(`
        *,
        images!inner (
          id,
          filename,
          r2_key,
          order_index
        ),
        set_characters!inner (
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
      `, { count: 'exact' })
      .or(`published_at.not.is.null,scheduled_time.lte.${now}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch content sets' },
        { status: 500 }
      )
    }

    // Transform the data to match our TypeScript types
    const transformedSets: ContentSetWithRelations[] = (sets || []).map(set => ({
      ...set,
      characters: set.set_characters?.map((sc: any) => sc.character).filter(Boolean) || [],
      images: set.images || [],
      thumbnail: set.images?.find((img: any) => img.id === set.thumbnail_image_id) || set.images?.[0]
    }))

    // Get total pages
    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      sets: transformedSets,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new content set (admin only - add auth check in production)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.r2_folder_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate slug from title
    const slug = `${body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    // Insert the content set
    const { data: contentSet, error } = await supabase
      .from('content_sets')
      .insert({
        title: body.title,
        slug,
        description: body.description || null,
        image_count: body.image_count || 0,
        is_commission: body.is_commission || false,
        r2_folder_key: body.r2_folder_key,
        scheduled_time: body.scheduled_time || null,
        tags: body.tags || [],
        generation_batch_id: body.generation_batch_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create content set' },
        { status: 500 }
      )
    }

    // Handle character associations if provided
    if (body.character_ids && body.character_ids.length > 0) {
      const characterRelations = body.character_ids.map((char_id: string, index: number) => ({
        set_id: contentSet.id,
        character_id: char_id,
        is_primary: index === 0
      }))

      const { error: charError } = await supabase
        .from('set_characters')
        .insert(characterRelations)

      if (charError) {
        console.error('Character association error:', charError)
        // Non-fatal error, content set was still created
      }
    }

    return NextResponse.json({
      success: true,
      data: contentSet
    }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}