// src/app/api/download/set/[setId]/info/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    // Verify authentication
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Await params before accessing setId
    const { setId } = await params

    // Initialize Supabase client
    const supabase = getSupabaseAdmin()

    // Get images for this set
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .eq('set_id', setId)
      .order('order_index', { ascending: true })

    if (error) {
      throw error
    }

    const imageCount = images?.length || 0
    
    // Calculate accurate size based on actual file sizes
    const totalSize = images?.reduce((sum, img) => {
      // Use actual file size if available, otherwise use 380KB average
      return sum + (img.file_size_bytes || 380 * 1024)
    }, 0) || 0

    // When images are processed with quality: 100, they roughly double in size
    // ZIP doesn't compress JPEGs, adds ~2% overhead
    const qualityMultiplier = 2.0  // Quality 100 roughly doubles JPEG size
    const zipOverhead = 1.02
    const estimatedZipSize = Math.round(totalSize * qualityMultiplier * zipOverhead)
    
    console.log(`[Download Info] Set ${setId}: ${imageCount} images`)
    console.log(`[Download Info] Original size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`)
    console.log(`[Download Info] Estimated ZIP: ${(estimatedZipSize / 1024 / 1024).toFixed(1)}MB`)
    
    return NextResponse.json({
      imageCount,
      estimatedZipSize,
      estimatedZipSizeMB: (estimatedZipSize / (1024 * 1024)).toFixed(1) + ' MB'
    })
  } catch (error) {
    console.error('Download info error:', error)
    return NextResponse.json(
      { error: 'Failed to get download info' },
      { status: 500 }
    )
  }
}