// src/lib/upload-service.ts
import sharp from 'sharp'
import { generateR2Paths, uploadImageVersionsToR2 } from './r2'
import { applyBrandWatermark } from './watermark-service'
import { getSupabaseAdmin } from './supabase'

export interface UploadResult {
  success: boolean
  imageId?: string
  originalKey?: string
  watermarkedKey?: string
  error?: string
}

/**
 * Process and upload an image with both original and watermarked versions
 */
export async function processAndUploadImage(
  imageBuffer: Buffer,
  filename: string,
  setId: string,
  orderIndex: number,
  mimeType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    console.log(`[Upload Service] Processing image: ${filename}`)
    
    // Get content set info for R2 path generation
    const supabase = getSupabaseAdmin()
    const { data: contentSet, error: setError } = await supabase
      .from('content_sets')
      .select('slug, created_at')
      .eq('id', setId)
      .single()
    
    if (setError || !contentSet) {
      return {
        success: false,
        error: 'Content set not found'
      }
    }
    
    // Process image with sharp for optimization
    const processedImage = sharp(imageBuffer)
    const metadata = await processedImage.metadata()
    
    // Optimize the image
    const optimizedBuffer = await processedImage
      .jpeg({
        quality: 95,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      })
      .toBuffer()
    
    console.log('[Upload Service] Creating watermarked version')
    
    // Create watermarked version for Bronze users
    const watermarkedBuffer = await applyBrandWatermark(optimizedBuffer)
    
    // Generate R2 paths
    const paths = generateR2Paths(
      new Date(contentSet.created_at),
      contentSet.slug,
      filename
    )
    
    console.log('[Upload Service] Uploading both versions to R2')
    
    // Upload both versions
    const uploadResult = await uploadImageVersionsToR2(
      optimizedBuffer,
      watermarkedBuffer,
      paths.original,
      paths.watermarked,
      mimeType
    )
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error
      }
    }
    
    console.log('[Upload Service] Saving to database')
    
    // Save to database with both R2 keys
    const { data: newImage, error: dbError } = await supabase
      .from('images')
      .insert({
        set_id: setId,
        filename: filename,
        r2_key: paths.original,
        watermarked_r2_key: paths.watermarked,
        order_index: orderIndex,
        width: metadata.width || null,
        height: metadata.height || null,
        file_size_bytes: optimizedBuffer.length,
        mime_type: mimeType
      })
      .select()
      .single()
    
    if (dbError || !newImage) {
      // Clean up uploaded files if database insert fails
      const { deleteImageVersionsFromR2 } = await import('./r2')
      await deleteImageVersionsFromR2(paths.original, paths.watermarked)
      
      return {
        success: false,
        error: 'Failed to save image to database'
      }
    }
    
    console.log('[Upload Service] Image processed successfully')
    
    return {
      success: true,
      imageId: newImage.id,
      originalKey: paths.original,
      watermarkedKey: paths.watermarked
    }
  } catch (error) {
    console.error('[Upload Service] Error processing image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process multiple images in parallel
 */
export async function processAndUploadImages(
  images: { buffer: Buffer; filename: string }[],
  setId: string,
  batchSize: number = 3
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize)
    
    const batchPromises = batch.map((image, index) =>
      processAndUploadImage(
        image.buffer,
        image.filename,
        setId,
        i + index,
        'image/jpeg'
      )
    )
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }
  
  return results
}