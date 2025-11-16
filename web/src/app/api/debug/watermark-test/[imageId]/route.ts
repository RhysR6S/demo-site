// src/app/api/debug/watermark-test/[imageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getImageFromR2 } from '@/lib/r2'
import { applyTierBasedWatermark } from '@/lib/watermark-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params
    
    // Get auth token
    const token = await getToken({ req: request })
    if (!token || !token.sub || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get image
    const { data: image, error } = await supabase
      .from('images')
      .select('r2_key, set_id, filename')
      .eq('id', imageId)
      .single()

    if (error || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Fetch from R2
    const result = await getImageFromR2(image.r2_key)
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'Failed to load image' },
        { status: 500 }
      )
    }

    // Force watermark as Bronze user for testing
    const watermarkedBuffer = await applyTierBasedWatermark(result.data, {
      userId: token.sub,
      userTier: 'bronze', // Force bronze tier for testing
      setId: image.set_id,
      imageId: imageId,
      skipCache: true // Skip cache for testing
    })

    // Return watermarked image for download
    return new NextResponse(watermarkedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="watermark-test-${image.filename}"`,
        'Cache-Control': 'no-store'
      }
    })

  } catch (error) {
    console.error('Watermark test error:', error)
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    )
  }
}