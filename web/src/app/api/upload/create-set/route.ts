// src/app/api/upload/create-set/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * POST endpoint for creating a content set without images
 */
export async function POST(request: NextRequest) {
  try {
    // Verify creator access
    const token = await getToken({ req: request })
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      characterIds,
      tags,
      isCommission,
      publishImmediately,
      scheduledTime,
      imageCount
    } = body

    // Validate required fields
    if (!title || !imageCount) {
      return NextResponse.json(
        { error: 'Title and image count are required' },
        { status: 400 }
      )
    }

    // Parse and validate scheduled time
    let scheduledTimeUTC: string | null = null
    let publishedAtUTC: string | null = null
    
    if (!publishImmediately) {
      if (!scheduledTime) {
        return NextResponse.json(
          { error: 'Scheduled time is required when not publishing immediately' },
          { status: 400 }
        )
      }

      const scheduledDate = new Date(scheduledTime)
      
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduled time format' },
          { status: 400 }
        )
      }

      scheduledTimeUTC = scheduledDate.toISOString()
    } else {
      publishedAtUTC = new Date().toISOString()
    }

    // Generate slug and folder structure
    const now = new Date()
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const folderKey = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${slug}`

    const supabase = getSupabaseAdmin()
    
    // Add image count prefix to title for display
    const displayTitle = `[${imageCount} ${imageCount === 1 ? 'IMAGE' : 'IMAGES'}] ${title}`
    
    // Create the content set
    const { data: contentSet, error: setError } = await supabase
      .from('content_sets')
      .insert({
        title: displayTitle,
        slug,
        description,
        image_count: imageCount,
        is_commission: isCommission,
        r2_folder_key: folderKey,
        scheduled_time: scheduledTimeUTC,
        published_at: publishedAtUTC,
        tags: tags || [],
      })
      .select()
      .single()

    if (setError) {
      console.error('Database error:', setError)
      return NextResponse.json(
        { error: 'Failed to create content set', details: setError.message },
        { status: 500 }
      )
    }

    // Link characters to the content set
    if (characterIds && characterIds.length > 0) {
      const characterRelations = characterIds.map((charId: string, index: number) => ({
        set_id: contentSet.id,
        character_id: charId,
        is_primary: index === 0
      }))

      const { error: charError } = await supabase
        .from('set_characters')
        .insert(characterRelations)
      
      if (charError) {
        console.error('Failed to link characters:', charError)
        // Non-critical error, continue
      }
    }

    return NextResponse.json({
      success: true,
      contentSet: {
        id: contentSet.id,
        title: contentSet.title,
        slug: contentSet.slug,
        r2_folder_key: contentSet.r2_folder_key,
        publishedAt: publishedAtUTC,
        scheduledTime: scheduledTimeUTC
      }
    })
  } catch (error) {
    console.error('Create set error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create content set', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
