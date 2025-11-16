// src/app/api/image/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateSignedR2Url } from '@/lib/r2-signed'
import { logImageAccess } from '@/lib/forensic-logger'
import { getCachedSignedUrl, setCachedSignedUrl } from '@/lib/cache'

export const runtime = 'nodejs'

// OPTIMIZED: Allow browser caching for 4 minutes (URLs expire in 5 min)
const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=240, stale-while-revalidate=30',
  'Vary': 'Authorization',
}

// For errors, still use no-cache
const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: imageId } = await params

  try {
    if (!imageId || imageId === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid image ID' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    const userId = token.sub
    const isCreator = token.isCreator || false
    const userTier: string = (token.membershipTier as string) || 'bronze'

    const supabase = getSupabaseAdmin()
    
    const { data: image, error: imageError } = await supabase
    .from('images')
    .select(`
      r2_key,
      watermarked_r2_key,
      set_id,
      filename,
      content_sets!images_set_id_fkey (
        published_at,
        scheduled_time
      )
    `)
    .eq('id', imageId)
    .single()

    console.log(`[Image API] Query result for ${imageId}:`, {
      hasData: !!image,
      hasError: !!imageError,
      error: imageError,
      image: image ? { id: imageId, filename: image.filename, hasR2Key: !!image.r2_key } : null
    })

    if (imageError || !image) {
      console.error(`[Image API] Image not found: ${imageId}`, imageError)
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    if (!isCreator) {
      const contentSet = (image as any).content_sets
      const now = new Date()
      const isPublished = contentSet?.published_at !== null
      const isScheduledInPast = contentSet?.scheduled_time &&
        new Date(contentSet.scheduled_time) <= now

      if (!isPublished && !isScheduledInPast) {
        return NextResponse.json(
          { error: 'Content not available' },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }
    }

    let r2Key: string

    if (userTier === 'bronze' && image.watermarked_r2_key) {
      r2Key = image.watermarked_r2_key
    } else {
      r2Key = image.r2_key
    }

    // OPTIMIZED: Check Redis cache for signed URL
    const { url: cachedUrl, cacheStatus } = await getCachedSignedUrl(r2Key, userTier)
    let signedUrl: string

    if (cachedUrl) {
      signedUrl = cachedUrl
    } else {
      // Generate new signed URL
      signedUrl = await generateSignedR2Url(r2Key, 900)

      // Cache it for 4 minutes (URLs expire in 5 min) - only if Redis is working
      if (cacheStatus !== 'ERROR') {
        await setCachedSignedUrl(r2Key, signedUrl, userTier)
      }
    }

    logImageAccess({
      userId,
      imageId,
      setId: image.set_id,
      action: 'view',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
      userAgent: request.headers.get('user-agent'),
      userTier,
      referer: request.headers.get('referer'),
    }, request).catch(console.error)

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 900,
      filename: image.filename,
      tier: userTier,
      accessToken: generateAccessToken(userId, imageId)
    }, {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        'X-Cache-Status': cacheStatus,
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-User-Tier': userTier
      }
    })

  } catch (error) {
    console.error('[Image API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

function generateAccessToken(userId: string, imageId: string): string {
  const timestamp = Date.now()
  const data = `${userId}:${imageId}:${timestamp}`
  return Buffer.from(data).toString('base64')
}