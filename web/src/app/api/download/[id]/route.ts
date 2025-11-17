// src/app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getImageFromR2 } from '@/lib/r2'
import { applyIdWatermark } from '@/lib/watermark-service'
import sharp from 'sharp'
import crypto from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params
    
    // Verify authentication
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = token.sub
    const userTier: string = (token.membershipTier as string) || 'bronze'

    // Get user's patreon_user_id for watermarking
    const supabase = getSupabaseAdmin()
    const { data: userData } = await supabase
      .from('users')
      .select('patreon_user_id')
      .eq('id', userId)
      .single()

    const watermarkUserId = userData?.patreon_user_id || userId

    // Get image info
    const { data: image } = await supabase
      .from('images')
      .select('r2_key, watermarked_r2_key, filename, set_id')
      .eq('id', imageId)
      .single()

    if (!image) {
      return new NextResponse('Image not found', { status: 404 })
    }

    // Determine which R2 key to use based on user tier
    let r2Key: string
    if (userTier === 'bronze' && image.watermarked_r2_key) {
      r2Key = image.watermarked_r2_key
    } else {
      r2Key = image.r2_key
    }

    // Fetch from R2
    const result = await getImageFromR2(r2Key)
    
    if (!result.success || !result.data) {
      // Fallback to original if watermarked doesn't exist
      if (r2Key === image.watermarked_r2_key) {
        const fallback = await getImageFromR2(image.r2_key)
        if (fallback.success && fallback.data) {
          result.data = fallback.data
          result.success = true
        }
      }
      
      if (!result.success || !result.data) {
        return new NextResponse('Failed to fetch image', { status: 500 })
      }
    }

    // Generate tracking ID
    const trackingId = crypto.createHash('sha256')
      .update(`${userId}-${imageId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16)

    // Get metadata early
    const metadata = await sharp(result.data).metadata()

    // OPTIMIZED: Skip expensive ID watermarking for trusted tiers (silver+)
    // Bronze tier already gets pre-watermarked versions from R2
    // Trusted patrons only need metadata tracking (90% cheaper)
    let processedBuffer: Buffer

    if (userTier === 'bronze') {
      // Bronze: Apply ID watermark (expensive but necessary)
      const watermarkedBuffer = await applyIdWatermark(result.data, watermarkUserId)

      if (metadata.format === 'png') {
        processedBuffer = await sharp(watermarkedBuffer)
          .withMetadata({
            exif: {
              IFD0: {
                Copyright: `Protected Content - Tracking ID: ${trackingId}`,
                Artist: 'PhotoVault',
                Software: 'PhotoVault Protection System',
                UserTier: userTier
              }
            }
          })
          .png({ compressionLevel: 9, quality: 100 })
          .toBuffer()
      } else {
        processedBuffer = await sharp(watermarkedBuffer)
          .withMetadata({
            exif: {
              IFD0: {
                Copyright: `Protected Content - Tracking ID: ${trackingId}`,
                Artist: 'PhotoVault',
                Software: 'PhotoVault Protection System',
                UserTier: userTier
              }
            }
          })
          .jpeg({ quality: 100, progressive: true })
          .toBuffer()
      }
    } else {
      // Silver/Gold/Platinum: Skip watermarking, only add metadata (trusted patrons)
      if (metadata.format === 'png') {
        processedBuffer = await sharp(result.data)
          .withMetadata({
            exif: {
              IFD0: {
                Copyright: `Protected Content - Tracking ID: ${trackingId}`,
                Artist: 'PhotoVault',
                Software: 'PhotoVault Protection System',
                UserTier: userTier
              }
            }
          })
          .png({ compressionLevel: 9, quality: 100 })
          .toBuffer()
      } else {
        processedBuffer = await sharp(result.data)
          .withMetadata({
            exif: {
              IFD0: {
                Copyright: `Protected Content - Tracking ID: ${trackingId}`,
                Artist: 'PhotoVault',
                Software: 'PhotoVault Protection System',
                UserTier: userTier
              }
            }
          })
          .jpeg({ quality: 100, progressive: true })
          .toBuffer()
      }
    }

    // Return the image
    return new NextResponse(new Uint8Array(processedBuffer), {
      headers: {
        'Content-Type': metadata.format === 'png' ? 'image/png' : 'image/jpeg',
        'Content-Disposition': `attachment; filename="${image.filename}"`,
        'Cache-Control': 'no-cache',
        'X-User-Tier': userTier,
      },
    })
  } catch (error) {
    console.error('[Download] Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}