// src/app/api/admin/content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { deleteImageFromR2 } from '@/lib/r2'
import type { ContentSetWithRelations } from '@/types/database'

// Cache for performance
let contentCache: { data: any[]; timestamp: number } | null = null
const CACHE_DURATION = 10000 // 10 seconds cache

/**
 * GET /api/admin/content - Get all content sets with pagination and caching
 */
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Check cache first (unless force refresh)
    if (!forceRefresh && contentCache && Date.now() - contentCache.timestamp < CACHE_DURATION) {
      // Return paginated cached data
      const paginatedData = contentCache.data.slice(offset, offset + limit)
      return NextResponse.json({
        sets: paginatedData,
        total: contentCache.data.length,
        page,
        pageSize: limit,
        totalPages: Math.ceil(contentCache.data.length / limit)
      })
    }

    const supabase = getSupabaseAdmin()
    
    // First, get the total count for pagination
    const { count } = await supabase
      .from('content_sets')
      .select('*', { count: 'exact', head: true })

    // Get paginated content sets with minimal related data
    const { data: sets, error } = await supabase
      .from('content_sets')
      .select(`
        id,
        title,
        slug,
        description,
        image_count,
        is_commission,
        thumbnail_image_id,
        r2_folder_key,
        created_at,
        scheduled_time,
        published_at,
        patreon_post_id,
        patreon_posted_at,
        view_count,
        download_count,
        tags,
        generation_batch_id,
        flagged_for_review,
        like_count,
        set_characters!left (
          character:characters!inner (
            id,
            name,
            slug
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Content API] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch content sets', details: error.message },
        { status: 500 }
      )
    }

    // Transform the data
    const transformedSets: ContentSetWithRelations[] = (sets || []).map(set => ({
      ...set,
      characters: set.set_characters?.map((sc: any) => sc.character).filter(Boolean) || []
    }))

    // Update cache with all data if this is the first page
    if (page === 1 && limit >= (count || 0)) {
      contentCache = {
        data: transformedSets,
        timestamp: Date.now()
      }
    }

    return NextResponse.json({
      sets: transformedSets,
      total: count || 0,
      page,
      pageSize: limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('[Content API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/content?id=xxx - Delete a content set
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify creator access
    const token = await getToken({ req: request })
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const setId = searchParams.get('id')
    
    if (!setId) {
      return NextResponse.json(
        { error: 'Content set ID required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    console.log(`[Content API] Starting deletion for content set: ${setId}`)
    
    // Get images for R2 cleanup before deletion (minimal fields)
    const { data: images } = await supabase
      .from('images')
      .select('id, r2_key, watermarked_r2_key')
      .eq('set_id', setId)
    
    // Batch delete operations where possible
    const deletionSteps = [
      // Step 0: Clear thumbnail reference
      async () => {
        const { error } = await supabase
          .from('content_sets')
          .update({ thumbnail_image_id: null })
          .eq('id', setId)
        if (error) throw new Error(`Failed to clear thumbnail reference: ${error.message}`)
      },
      
      // Step 1-7: Delete all related records in parallel batches
      async () => {
        const imageIds = images?.map(img => img.id) || []
        
        // Execute deletions in parallel for better performance
        const parallelDeletions = []
        
        // Delete watermark cache entries
        if (imageIds.length > 0) {
          parallelDeletions.push(
            supabase
              .from('watermark_cache')
              .delete()
              .in('image_id', imageIds)
          )
        }
        
        // Delete user activity by set_id
        parallelDeletions.push(
          supabase
            .from('user_activity')
            .delete()
            .eq('set_id', setId)
        )
        
        // Delete user activity by image_id
        if (imageIds.length > 0) {
          parallelDeletions.push(
            supabase
              .from('user_activity')
              .delete()
              .in('image_id', imageIds)
          )
        }
        
        // Delete user set views
        parallelDeletions.push(
          supabase
            .from('user_set_views')
            .delete()
            .eq('set_id', setId)
        )
        
        // Delete user set downloads
        parallelDeletions.push(
          supabase
            .from('user_set_downloads')
            .delete()
            .eq('set_id', setId)
        )
        
        // Delete content likes
        parallelDeletions.push(
          supabase
            .from('content_likes')
            .delete()
            .eq('set_id', setId)
        )
        
        // Delete content comments
        parallelDeletions.push(
          supabase
            .from('content_comments')
            .delete()
            .eq('set_id', setId)
        )
        
        // Delete studio schedule entries
        parallelDeletions.push(
          supabase
            .from('studio_schedule')
            .delete()
            .eq('set_id', setId)
        )
        
        // Delete set_characters
        parallelDeletions.push(
          supabase
            .from('set_characters')
            .delete()
            .eq('set_id', setId)
        )
        
        // Wait for all parallel deletions
        const results = await Promise.allSettled(parallelDeletions)
        
        // Check for any failures
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0) {
          const firstError = (failures[0] as PromiseRejectedResult).reason
          throw new Error(`Parallel deletion failed: ${firstError}`)
        }
      },
      
      // Step 8: Delete images
      async () => {
        const { error } = await supabase
          .from('images')
          .delete()
          .eq('set_id', setId)
        if (error) throw new Error(`Failed to delete images: ${error.message}`)
      },
      
      // Step 9: Finally delete the content set
      async () => {
        const { error } = await supabase
          .from('content_sets')
          .delete()
          .eq('id', setId)
        if (error) throw new Error(`Failed to delete content set: ${error.message}`)
      }
    ]
    
    // Execute deletion steps
    for (const [index, step] of deletionSteps.entries()) {
      try {
        await step()
        console.log(`[Content API] Deletion step ${index + 1}/${deletionSteps.length} completed`)
      } catch (error) {
        console.error(`[Content API] Deletion step ${index + 1} failed:`, error)
        return NextResponse.json(
          { 
            error: error instanceof Error ? error.message : 'Failed to delete content set',
            details: `Step ${index + 1} of ${deletionSteps.length} failed`
          },
          { status: 500 }
        )
      }
    }
    
    // Invalidate cache after successful deletion
    invalidateCache()
    
    // Clean up R2 storage (async, don't wait)
    if (images && images.length > 0) {
      console.log(`[Content API] Scheduling R2 cleanup for ${images.length} images`)
      
      // Schedule R2 cleanup in background
      setImmediate(() => {
        Promise.all(
          images.flatMap(img => [
            img.r2_key ? deleteImageFromR2(img.r2_key) : Promise.resolve(),
            img.watermarked_r2_key ? deleteImageFromR2(img.watermarked_r2_key) : Promise.resolve()
          ])
        ).then(() => {
          console.log(`[Content API] R2 cleanup completed for set ${setId}`)
        }).catch(error => {
          console.error(`[Content API] R2 cleanup failed for set ${setId}:`, error)
        })
      })
    }
    
    console.log(`[Content API] Successfully deleted content set: ${setId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Content set deleted successfully'
    })
  } catch (error) {
    console.error('[Content API] Delete error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete content set', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/content - Update a content set
 */
export async function PUT(request: NextRequest) {
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
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Content set ID required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Update the content set
    const { data, error } = await supabase
      .from('content_sets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('[Content API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update content set', details: error.message },
        { status: 500 }
      )
    }
    
    // Invalidate cache after successful update
    invalidateCache()
    
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[Content API] Update error:', error)
    return NextResponse.json(
      { error: 'Failed to update content set', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to invalidate cache
export function invalidateCache() {
  contentCache = null
}