// src/app/api/thumbnail/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getImageFromR2 } from '@/lib/r2'
import sharp from 'sharp'

export const runtime = 'nodejs'

interface ThumbnailCacheEntry {
  buffer: Buffer
  contentType: string
  expires: number
}

// In-memory cache for thumbnails
const thumbnailCache = new Map<string, ThumbnailCacheEntry>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Cleanup expired cache entries
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of thumbnailCache.entries()) {
    if (entry.expires < now) {
      thumbnailCache.delete(key)
    }
  }
}, 10 * 60 * 1000) // Clean every 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required in Next.js 15+
    const { id } = await params
    
    // Check cache first (thumbnails don't need user-specific cache)
    const cached = thumbnailCache.get(id)
    if (cached && cached.expires > Date.now()) {
      return new NextResponse(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Cache': 'HIT',
          'X-Thumbnail-Type': 'cached'
        }
      })
    }

    const supabase = getSupabaseAdmin()

    // Get image metadata (including thumbnail_r2_key for pre-generated thumbnails)
    const { data: image, error } = await supabase
      .from('images')
      .select(`
        *,
        content_sets!images_set_id_fkey (
          id,
          published_at,
          scheduled_time
        )
      `)
      .eq('id', id)
      .single()

    if (error || !image) {
      console.error('[Thumbnail API] Database error:', error)
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Check if content is published (thumbnails are public once published)
    if (image.content_sets) {
      const now = new Date().toISOString()
      const isPublished = image.content_sets.published_at ||
                         (image.content_sets.scheduled_time && image.content_sets.scheduled_time <= now)

      if (!isPublished) {
        const token = await getToken({ req: request })
        if (!token?.isCreator) {
          return NextResponse.json({ error: 'Content not yet available' }, { status: 403 })
        }
      }
    }

    // OPTIMIZED: Check for pre-generated thumbnail first (much faster)
    if (image.thumbnail_r2_key) {
      console.log(`[Thumbnail API] Fetching pre-generated thumbnail: ${image.thumbnail_r2_key}`)
      const thumbnailResult = await getImageFromR2(image.thumbnail_r2_key)

      if (thumbnailResult.success && thumbnailResult.data) {
        // Cache and return pre-generated thumbnail
        thumbnailCache.set(id, {
          buffer: thumbnailResult.data,
          contentType: 'image/jpeg',
          expires: Date.now() + CACHE_TTL
        })

        return new NextResponse(thumbnailResult.data, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-Cache': 'MISS',
            'X-Thumbnail-Type': 'pre-generated'
          }
        })
      }

      console.log('[Thumbnail API] Pre-generated thumbnail not found, falling back to on-the-fly generation')
    }

    // BACKWARDS COMPATIBLE: Fall back to on-the-fly thumbnail generation
    console.log(`[Thumbnail API] Generating thumbnail on-the-fly from: ${image.r2_key}`)
    const r2Result = await getImageFromR2(image.r2_key)
    
    if (!r2Result.success || !r2Result.data) {
      console.error(`[Thumbnail API] Failed to fetch image from R2:`, r2Result.error)
      return NextResponse.json({ 
        error: 'Failed to load image from storage',
        details: r2Result.error 
      }, { status: 500 })
    }

    const imageBuffer = r2Result.data

    // Verify buffer is valid
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      console.error(`[Thumbnail API] Invalid buffer received for: ${image.r2_key}`)
      return NextResponse.json({ error: 'Invalid image data received' }, { status: 500 })
    }

    console.log(`[Thumbnail API] Buffer size: ${imageBuffer.length} bytes`)

    // Generate thumbnail
    try {
      const thumbnail = await sharp(imageBuffer)
        .resize(400, 600, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer()

      // Cache the thumbnail
      thumbnailCache.set(id, {
        buffer: thumbnail,
        contentType: 'image/jpeg',
        expires: Date.now() + CACHE_TTL
      })

      // Return thumbnail with appropriate headers
      return new NextResponse(thumbnail, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'X-Cache': 'MISS',
          'X-Thumbnail-Type': 'on-the-fly'
        }
      })
    } catch (sharpError) {
      console.error('[Thumbnail API] Sharp processing error:', sharpError)
      return NextResponse.json({ 
        error: 'Failed to process image', 
        details: sharpError instanceof Error ? sharpError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Thumbnail API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}