// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateR2Paths, uploadImageVersionsToR2 } from '@/lib/r2'
import { applyBrandWatermark } from '@/lib/watermark-service'
import sharp from 'sharp'

export const maxDuration = 60 // 60 seconds for large uploads

/**
 * Helper function to validate scheduled time is at allowed slot
 * @param scheduledTime - The scheduled time to validate
 * @returns boolean indicating if time is valid
 */
function isValidScheduleSlot(scheduledTime: Date): boolean {
  const hours = scheduledTime.getHours()
  const minutes = scheduledTime.getMinutes()
  
  // Valid hours: 0 (12 AM), 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM
  const VALID_HOURS = [0, 10, 12, 14, 16, 18, 20, 22]
  
  // Check if hour is valid and minutes are 0 (on the hour)
  return VALID_HOURS.includes(hours) && minutes === 0
}

/**
 * Helper function to extract character name from filename
 * Assumes character name is at the start of the filename before any delimiter
 * @param filename - The original filename
 * @returns The character name or 'unknown' if not found
 */
function extractCharacterName(filename: string): string {
  // Common patterns for character names in filenames:
  // "CharacterName_anything.jpg"
  // "CharacterName anything.jpg"
  // "CharacterName-anything.jpg"
  // "CharacterName.anything.jpg"
  
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Try to extract character name (assume it's the first part before delimiter)
  const match = nameWithoutExt.match(/^([^_\-\s.]+)/)
  
  if (match && match[1]) {
    return match[1].toLowerCase()
  }
  
  // If no clear delimiter, try to get first word
  const firstWord = nameWithoutExt.split(/[\s_\-.]/, 1)[0]
  return firstWord ? firstWord.toLowerCase() : 'unknown'
}

/**
 * Helper function to shuffle an array in place using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns The shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Helper function to shuffle images within character groups
 * @param files - Array of files with their original names
 * @returns Shuffled array maintaining character grouping
 */
function shuffleImagesByCharacter(files: { file: File; originalName: string }[]): { file: File; originalName: string }[] {
  // Group files by character
  const characterGroups = new Map<string, { file: File; originalName: string }[]>()
  
  files.forEach(fileObj => {
    const character = extractCharacterName(fileObj.originalName)
    if (!characterGroups.has(character)) {
      characterGroups.set(character, [])
    }
    characterGroups.get(character)!.push(fileObj)
  })
  
  console.log(`📊 Grouped images into ${characterGroups.size} character groups`)
  
  // Shuffle within each character group and combine
  const shuffledFiles: { file: File; originalName: string }[] = []
  
  // Sort character names for consistent ordering
  const sortedCharacters = Array.from(characterGroups.keys()).sort()
  
  sortedCharacters.forEach(character => {
    const group = characterGroups.get(character)!
    const shuffledGroup = shuffleArray(group)
    console.log(`🔀 Shuffled ${shuffledGroup.length} images for character: ${character}`)
    shuffledFiles.push(...shuffledGroup)
  })
  
  return shuffledFiles
}

/**
 * POST endpoint for uploading content sets with images
 * Handles file uploads, image processing, and database records
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
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    
    // FIX: Handle different formats for arrays
    let characterIds: string[] = []
    let tags: string[] = []
    
    try {
      // Try parsing as JSON first
      const characterIdsRaw = formData.get('characterIds') as string
      if (characterIdsRaw && characterIdsRaw.trim()) {
        try {
          characterIds = JSON.parse(characterIdsRaw)
        } catch {
          // If JSON parse fails, try comma-separated
          characterIds = characterIdsRaw.split(',').filter(id => id.trim())
        }
      }
    } catch (e) {
      console.log('Error parsing characterIds:', e)
    }
    
    try {
      // Handle tags - ensure they're always an array
      const tagsRaw = formData.get('tags') as string
      if (tagsRaw && tagsRaw.trim()) {
        try {
          tags = JSON.parse(tagsRaw)
        } catch {
          // If JSON parse fails, try comma-separated
          tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        }
      }
      // Ensure tags is always an array
      if (!Array.isArray(tags)) {
        tags = []
      }
    } catch (e) {
      console.log('Error parsing tags:', e)
      tags = []
    }
    
    const isCommission = formData.get('isCommission') === 'true'
    const publishImmediately = formData.get('publishImmediately') === 'true'
    const scheduledTime = formData.get('scheduledTime') as string
    
    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Collect all image files with their original names
    const imageFileObjects: { file: File; originalName: string }[] = []
    const entries = Array.from(formData.entries())
    
    // Handle both formats: images[] and images[0], images[1], etc.
    for (const [key, value] of entries) {
      if ((key === 'images[]' || key.startsWith('images[')) && value instanceof File) {
        imageFileObjects.push({
          file: value,
          originalName: value.name
        })
      }
    }

    if (imageFileObjects.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      )
    }

    // SHUFFLE IMAGES WITHIN CHARACTER GROUPS
    console.log(`🎲 Shuffling ${imageFileObjects.length} images within character groups...`)
    const shuffledImageObjects = shuffleImagesByCharacter(imageFileObjects)
    
    // Extract just the files in the new order
    const imageFiles = shuffledImageObjects.map(obj => obj.file)

    // Parse and validate scheduled time
    let scheduledTimeUTC: string | null = null
    let publishedAtUTC: string | null = null
    let scheduledDate: Date | null = null
    
    if (!publishImmediately) {
      if (!scheduledTime) {
        return NextResponse.json(
          { error: 'Scheduled time is required when not publishing immediately' },
          { status: 400 }
        )
      }

      scheduledDate = new Date(scheduledTime)
      
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduled time format' },
          { status: 400 }
        )
      }

      // Validate time is at allowed slot
      if (!isValidScheduleSlot(scheduledDate)) {
        return NextResponse.json(
          { error: 'Scheduled time must be at one of the allowed time slots' },
          { status: 400 }
        )
      }

      // Check if scheduled time is in the future
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        )
      }

      scheduledTimeUTC = scheduledDate.toISOString()
      console.log(`📅 Scheduled for: ${scheduledTimeUTC}`)
    } else {
      // Publishing immediately
      publishedAtUTC = new Date().toISOString()
      console.log(`🚀 Publishing immediately at: ${publishedAtUTC}`)
    }

    console.log(`📤 Upload request: "${title}" with ${imageFiles.length} images (shuffled within character groups)`)
    console.log(`📸 Processing ${imageFiles.length} images`)

    // Generate slug and folder structure
    const now = new Date()
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const folderKey = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${slug}`

    // Create content set in database
    const supabase = getSupabaseAdmin()
    
    // Check if scheduled time slot is already taken (only if scheduling)
    if (!publishImmediately && scheduledDate) {
      const slotStart = new Date(scheduledDate)
      slotStart.setMinutes(slotStart.getMinutes() - 1)
      const slotEnd = new Date(scheduledDate)
      slotEnd.setMinutes(slotEnd.getMinutes() + 1)
      
      const { data: existingScheduled } = await supabase
        .from('content_sets')
        .select('id, title')
        .gte('scheduled_time', slotStart.toISOString())
        .lte('scheduled_time', slotEnd.toISOString())
        .single()
      
      if (existingScheduled) {
        return NextResponse.json(
          { error: `Time slot already taken by: ${existingScheduled.title}` },
          { status: 409 }
        )
      }
    }
    
    // Create the content set with proper tags format
    // FIXED: Add image count prefix to title for display
    const displayTitle = `[${imageFiles.length} ${imageFiles.length === 1 ? 'IMAGE' : 'IMAGES'}] ${title}`
    
    const { data: contentSet, error: setError } = await supabase
      .from('content_sets')
      .insert({
        title: displayTitle, // Use the title with image count prefix
        slug,
        description,
        image_count: imageFiles.length,
        is_commission: isCommission,
        r2_folder_key: folderKey,
        scheduled_time: scheduledTimeUTC,
        published_at: publishedAtUTC,
        tags: tags, // This is now guaranteed to be an array
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

    // Process and upload images (now in shuffled order)
    const uploadedImages = []
    let thumbnailId = null
    const errors = []

    for (let index = 0; index < imageFiles.length; index++) {
      try {
        const file = imageFiles[index]
        const originalName = shuffledImageObjects[index].originalName
        const buffer = Buffer.from(await file.arrayBuffer())
        
        console.log(`Processing image ${index + 1}/${imageFiles.length}: ${originalName} (character: ${extractCharacterName(originalName)})`)
        
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
        console.log(`Creating watermarked version for image ${index + 1}`)
        const watermarkedBuffer = await applyBrandWatermark(optimized)

        // Generate filename with padding for proper sorting
        const filename = `${String(index + 1).padStart(3, '0')}.jpg`
        
        // Generate both R2 paths
        const paths = generateR2Paths(now, slug, filename)

        // Upload both versions to R2
        const uploadResult = await uploadImageVersionsToR2(
          optimized,
          watermarkedBuffer,
          paths.original,
          paths.watermarked,
          'image/jpeg'
        )
        
        if (!uploadResult.success) {
          console.error(`Failed to upload image ${index + 1}:`, uploadResult.error)
          errors.push(`Image ${index + 1}: ${uploadResult.error}`)
          continue
        }

        // Save image record to database with both R2 keys
        const { data: imageRecord, error: imgError } = await supabase
          .from('images')
          .insert({
            set_id: contentSet.id,
            filename,
            r2_key: paths.original,
            watermarked_r2_key: paths.watermarked,
            order_index: index,
            width: metadata.width,
            height: metadata.height,
            file_size_bytes: optimized.length,
            mime_type: 'image/jpeg',
            prompt_tags: null,
            generation_model: null
          })
          .select()
          .single()

        if (!imgError && imageRecord) {
          uploadedImages.push(imageRecord)
          // Use first image as thumbnail
          if (index === 0) {
            thumbnailId = imageRecord.id
          }
        } else if (imgError) {
          console.error(`Failed to save image record ${index + 1}:`, imgError)
          errors.push(`Image record ${index + 1}: ${imgError.message}`)
          // Clean up uploaded files
          const { deleteImageVersionsFromR2 } = await import('@/lib/r2')
          await deleteImageVersionsFromR2(paths.original, paths.watermarked)
        }
      } catch (error) {
        console.error(`Error processing image ${index + 1}:`, error)
        errors.push(`Image ${index + 1}: ${error instanceof Error ? error.message : 'Processing failed'}`)
      }
    }

    // Update thumbnail if we have one
    if (thumbnailId) {
      await supabase
        .from('content_sets')
        .update({ 
          thumbnail_image_id: thumbnailId,
          // Update image count in case some failed
          image_count: uploadedImages.length 
        })
        .eq('id', contentSet.id)
    }

    // Link characters to the content set
    if (characterIds.length > 0) {
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

    // Log summary
    const success = uploadedImages.length === imageFiles.length
    console.log(`✅ Upload ${success ? 'complete' : 'partial'}: ${uploadedImages.length}/${imageFiles.length} images (shuffled within character groups)`)
    
    if (errors.length > 0) {
      console.log(`⚠️  Upload errors:`, errors)
    }

    // Prepare response message
    let message: string
    let displayTime: string
    
    if (publishImmediately) {
      message = errors.length > 0 
        ? `Published ${uploadedImages.length} of ${imageFiles.length} images (shuffled). Some uploads failed.`
        : `Successfully published all ${imageFiles.length} images (shuffled within character groups)`
      displayTime = new Date().toLocaleString('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/London'
      })
    } else {
      message = errors.length > 0 
        ? `Uploaded ${uploadedImages.length} of ${imageFiles.length} images (shuffled). Some uploads failed.`
        : `Successfully uploaded all ${imageFiles.length} images (shuffled) and scheduled for ${scheduledDate!.toLocaleString('en-GB', { timeStyle: 'short' })}`
      displayTime = scheduledDate!.toLocaleString('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/London'
      })
    }

    // Return response
    return NextResponse.json({
      success: errors.length === 0,
      contentSet: {
        id: contentSet.id,
        title: contentSet.title, // This now includes the [123 IMAGES] prefix
        slug: contentSet.slug,
        imageCount: uploadedImages.length,
        publishTime: displayTime,
        publishTimeUTC: publishImmediately ? publishedAtUTC : scheduledTimeUTC
      },
      uploadedImages: uploadedImages.length,
      totalImages: imageFiles.length,
      errors: errors.length > 0 ? errors : undefined,
      message
    }, {
      status: errors.length > 0 ? 207 : 200 // 207 Multi-Status for partial success
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
