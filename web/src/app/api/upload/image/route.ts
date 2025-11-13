// src/app/api/upload/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateR2Paths, uploadImageVersionsToR2 } from '@/lib/r2'
import { applyBrandWatermark } from '@/lib/watermark-service'
import sharp from 'sharp'

export const maxDuration = 30 // 30 seconds per image

/**
 * POST endpoint for uploading a single image to an existing content set
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

    // Parse multipart form data
    const formData = await request.formData()
    const contentSetId = formData.get('contentSetId') as string
    const imageFile = formData.get('image') as File
    const imageIndex = parseInt(formData.get('index') as string)
    const isFirstImage = formData.get('isFirstImage') === 'true'
    
    if (!contentSetId || !imageFile || isNaN(imageIndex)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get content set details
    const { data: contentSet, error: fetchError } = await supabase
      .from('content_sets')
      .select('*')
      .eq('id', contentSetId)
      .single()
    
    if (fetchError || !contentSet) {
      return NextResponse.json(
        { error: 'Content set not found' },
        { status: 404 }
      )
    }

    // Process image
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    
    // Process image with Sharp
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    // Optimize image (original version)
    const optimized = await image
      .jpeg({
        quality: 90,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer()

    // Create watermarked version for Bronze users
    console.log(`Creating watermarked version for image index ${imageIndex}`)
    const watermarkedBuffer = await applyBrandWatermark(optimized)

    // OPTIMIZED: Generate thumbnail (400x600 JPEG) for faster serving
    console.log(`Generating thumbnail for image index ${imageIndex}`)
    const thumbnailBuffer = await sharp(optimized)
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

    // Generate filename with padding for proper sorting
    const filename = `${String(imageIndex + 1).padStart(3, '0')}.jpg`
    
    // Parse the folder key to get date and slug
    const folderParts = contentSet.r2_folder_key.split('/')
    const year = parseInt(folderParts[0])
    const month = parseInt(folderParts[1])
    const slug = folderParts[2]
    
    // Create date object for path generation
    const setDate = new Date(contentSet.created_at)
    setDate.setFullYear(year)
    setDate.setMonth(month - 1)
    
    // Generate all R2 paths (original, watermarked, thumbnail)
    const paths = generateR2Paths(setDate, slug, filename)
    const thumbnailPath = paths.original.replace('/original/', '/thumbnails/')

    // OPTIMIZED: Upload all three versions to R2 (original, watermarked, thumbnail)
    const { uploadImageWithThumbnailToR2 } = await import('@/lib/r2')
    const uploadResult = await uploadImageWithThumbnailToR2(
      optimized,
      watermarkedBuffer,
      thumbnailBuffer,
      paths.original,
      paths.watermarked,
      thumbnailPath,
      'image/jpeg'
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      )
    }

    // Save image record to database with all R2 keys (including thumbnail)
    const { data: imageRecord, error: imgError } = await supabase
      .from('images')
      .insert({
        set_id: contentSetId,
        filename,
        r2_key: paths.original,
        watermarked_r2_key: paths.watermarked,
        thumbnail_r2_key: thumbnailPath,
        order_index: imageIndex,
        width: metadata.width,
        height: metadata.height,
        file_size_bytes: optimized.length,
        mime_type: 'image/jpeg',
        prompt_tags: null,
        generation_model: null
      })
      .select()
      .single()

    if (imgError) {
      // Try to clean up R2 uploads (all three versions)
      console.error('Failed to save image record, cleaning up R2:', imgError)
      const { deleteFromR2 } = await import('@/lib/r2')
      await Promise.all([
        deleteFromR2(paths.original),
        deleteFromR2(paths.watermarked),
        deleteFromR2(thumbnailPath)
      ])

      return NextResponse.json(
        { error: `Database error: ${imgError.message}` },
        { status: 500 }
      )
    }

    // If this is the first image, set it as thumbnail
    if (isFirstImage && imageRecord) {
      await supabase
        .from('content_sets')
        .update({ thumbnail_image_id: imageRecord.id })
        .eq('id', contentSetId)
    }

    return NextResponse.json({
      success: true,
      imageId: imageRecord.id,
      index: imageIndex,
      originalKey: paths.original,
      watermarkedKey: paths.watermarked
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
