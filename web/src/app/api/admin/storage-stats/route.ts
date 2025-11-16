// src/app/api/admin/storage-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// Storage limit in GB - can be made configurable later
const STORAGE_LIMIT_GB = 50 // Adjust based on your R2 plan

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get total content sets count
    const { count: setsCount, error: setsError } = await supabase
      .from('content_sets')
      .select('*', { count: 'exact', head: true })

    if (setsError) {
      throw new Error('Failed to count content sets')
    }

    // Get total images count and calculate total size - FIXED TABLE NAME
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('file_size_bytes')

    if (imagesError) {
      throw new Error('Failed to fetch image data')
    }

    // Calculate totals
    const totalImages = images?.length || 0
    const totalBytesUsed = images?.reduce((sum, img) => sum + (img.file_size_bytes || 0), 0) || 0
    const totalGBUsed = totalBytesUsed / (1024 * 1024 * 1024) // Convert to GB

    // Calculate percentage used
    const percentageUsed = (totalGBUsed / STORAGE_LIMIT_GB) * 100

    return NextResponse.json({
      storage: {
        used: totalGBUsed,
        limit: STORAGE_LIMIT_GB,
        percentage: percentageUsed
      },
      stats: {
        totalSets: setsCount || 0,
        totalImages: totalImages
      }
    })

  } catch (error) {
    console.error('Storage stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage statistics' },
      { status: 500 }
    )
  }
}