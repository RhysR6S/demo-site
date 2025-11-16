// src/lib/r2.ts
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand,
  HeadObjectCommand 
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'

// Support both R2_ and CLOUDFLARE_ environment variable prefixes
const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_BUCKET

// Create R2 client with connection pooling optimizations
export const r2Client = accountId && accessKeyId && secretAccessKey
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Add connection pooling and timeout optimizations
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 10000,
        socketTimeout: 30000,
      }
    })
  : null

// Export bucket name for use in other modules
export const R2_BUCKET_NAME = bucketName

// Warn if configuration is incomplete
if (!r2Client) {
  console.warn('[R2] Client not initialized. Missing environment variables:')
  if (!accountId) console.warn('- CLOUDFLARE_ACCOUNT_ID')
  if (!accessKeyId) console.warn('- CLOUDFLARE_ACCESS_KEY_ID')
  if (!secretAccessKey) console.warn('- CLOUDFLARE_SECRET_ACCESS_KEY')
}

if (!bucketName) {
  console.warn('[R2] Bucket name not configured. Set CLOUDFLARE_BUCKET')
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<void> {
  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured')
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await r2Client.send(command)
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured')
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await r2Client.send(command)
}

/**
 * Generate a signed URL for temporary access
 */
export async function getSignedR2Url(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured')
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return await getSignedUrl(r2Client, command, { expiresIn })
}

/**
 * Generate R2 paths for both original and watermarked versions
 * Returns both paths for dual storage
 */
export function generateR2Paths(
  date: Date,
  slug: string,
  filename: string
): { original: string; watermarked: string } {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const basePath = `${year}/${month}/${slug}`
  
  return {
    original: `${basePath}/original/${filename}`,
    watermarked: `${basePath}/watermarked/${filename}`
  }
}

/**
 * Generate R2 path for uploaded images (legacy support)
 */
export function generateR2Path(
  date: Date,
  slug: string,
  filename: string
): string {
  const paths = generateR2Paths(date, slug, filename)
  return paths.original
}

/**
 * Delete an image from R2
 */
export async function deleteImageFromR2(r2Key: string): Promise<void> {
  try {
    await deleteFromR2(r2Key)
    console.log(`[R2] Deleted image: ${r2Key}`)
  } catch (error) {
    console.error(`[R2] Failed to delete image: ${r2Key}`, error)
    throw error
  }
}

/**
 * Delete both versions of an image from R2
 */
export async function deleteImageVersionsFromR2(
  originalKey: string,
  watermarkedKey: string | null
): Promise<void> {
  const deletePromises: Promise<void>[] = [deleteImageFromR2(originalKey)]
  
  if (watermarkedKey) {
    deletePromises.push(deleteImageFromR2(watermarkedKey))
  }
  
  await Promise.all(deletePromises)
}

/**
 * Upload an image to R2
 * Updated to return success/error object as expected by the upload route
 */
export async function uploadImageToR2(
  imageBuffer: Buffer,
  r2Key: string,
  mimeType: string
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    await uploadToR2(r2Key, imageBuffer, mimeType)
    console.log(`[R2] Uploaded image: ${r2Key}`)
    return { success: true, key: r2Key }
  } catch (error) {
    console.error(`[R2] Failed to upload image: ${r2Key}`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Upload both versions of an image to R2
 */
export async function uploadImageVersionsToR2(
  originalBuffer: Buffer,
  watermarkedBuffer: Buffer,
  originalKey: string,
  watermarkedKey: string,
  mimeType: string
): Promise<{ success: boolean; originalKey?: string; watermarkedKey?: string; error?: string }> {
  try {
    // Upload both versions in parallel
    const [originalResult, watermarkedResult] = await Promise.all([
      uploadImageToR2(originalBuffer, originalKey, mimeType),
      uploadImageToR2(watermarkedBuffer, watermarkedKey, mimeType)
    ])

    if (!originalResult.success || !watermarkedResult.success) {
      // If either fails, clean up the successful one
      if (originalResult.success) await deleteFromR2(originalKey)
      if (watermarkedResult.success) await deleteFromR2(watermarkedKey)

      return {
        success: false,
        error: originalResult.error || watermarkedResult.error
      }
    }

    return {
      success: true,
      originalKey,
      watermarkedKey
    }
  } catch (error) {
    console.error('[R2] Failed to upload image versions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Upload all three versions of an image to R2 (original, watermarked, thumbnail)
 * OPTIMIZED: Includes pre-generated thumbnail for faster serving
 */
export async function uploadImageWithThumbnailToR2(
  originalBuffer: Buffer,
  watermarkedBuffer: Buffer,
  thumbnailBuffer: Buffer,
  originalKey: string,
  watermarkedKey: string,
  thumbnailKey: string,
  mimeType: string
): Promise<{ success: boolean; originalKey?: string; watermarkedKey?: string; thumbnailKey?: string; error?: string }> {
  try {
    // Upload all three versions in parallel for maximum speed
    const [originalResult, watermarkedResult, thumbnailResult] = await Promise.all([
      uploadImageToR2(originalBuffer, originalKey, mimeType),
      uploadImageToR2(watermarkedBuffer, watermarkedKey, mimeType),
      uploadImageToR2(thumbnailBuffer, thumbnailKey, 'image/jpeg') // Thumbnails always JPEG
    ])

    if (!originalResult.success || !watermarkedResult.success || !thumbnailResult.success) {
      // If any fails, clean up successful uploads
      if (originalResult.success) await deleteFromR2(originalKey)
      if (watermarkedResult.success) await deleteFromR2(watermarkedKey)
      if (thumbnailResult.success) await deleteFromR2(thumbnailKey)

      return {
        success: false,
        error: originalResult.error || watermarkedResult.error || thumbnailResult.error
      }
    }

    return {
      success: true,
      originalKey,
      watermarkedKey,
      thumbnailKey
    }
  } catch (error) {
    console.error('[R2] Failed to upload image versions with thumbnail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Get an image from R2 (existing function maintained for compatibility)
 */
export async function getImageFromR2(
  key: string
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  if (!r2Client || !bucketName) {
    return { 
      success: false, 
      error: 'R2 client not configured' 
    }
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return { 
        success: false, 
        error: 'No data received from R2' 
      }
    }

    // Convert stream to buffer
    const chunks = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return { 
      success: true, 
      data: buffer 
    }
  } catch (error) {
    console.error(`[R2] Failed to get image: ${key}`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Stream an image directly from R2 without buffering
 * NEW: For optimized downloads
 */
export async function streamImageFromR2(key: string): Promise<NodeJS.ReadableStream | null> {
  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured')
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return null
    }

    // Return the stream directly
    return response.Body as NodeJS.ReadableStream
  } catch (error) {
    console.error(`[R2] Failed to stream image: ${key}`, error)
    throw error
  }
}

/**
 * Get multiple images in parallel with connection pooling
 * NEW: For batch operations
 */
export async function getImagesParallel(
  keys: string[],
  batchSize: number = 5
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>()
  
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (key) => {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
        
        const response = await r2Client!.send(command)
        
        if (response.Body) {
          const chunks = []
          for await (const chunk of response.Body as any) {
            chunks.push(chunk)
          }
          const buffer = Buffer.concat(chunks)
          results.set(key, buffer)
        }
      } catch (error) {
        console.error(`[R2] Failed to get image: ${key}`, error)
      }
    })
    
    await Promise.all(batchPromises)
  }
  
  return results
}

/**
 * Generate pre-signed URLs for client-side downloads
 * NEW: Offload download traffic from server
 */
export async function generateBatchSignedUrls(
  keys: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured')
  }

  const urls = new Map<string, string>()
  
  // Generate signed URLs in parallel
  const urlPromises = keys.map(async (key) => {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
      
      const url = await getSignedUrl(r2Client, command, { expiresIn })
      urls.set(key, url)
    } catch (error) {
      console.error(`[R2] Failed to generate signed URL for: ${key}`, error)
    }
  })
  
  await Promise.all(urlPromises)
  
  return urls
}

/**
 * Check if images exist before attempting download
 * NEW: Prevent unnecessary download attempts
 */
export async function checkImagesExist(keys: string[]): Promise<Set<string>> {
  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured')
  }

  const existing = new Set<string>()
  
  const checkPromises = keys.map(async (key) => {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
      
      await r2Client.send(command)
      existing.add(key)
    } catch (error) {
      // Image doesn't exist, skip it
    }
  })
  
  await Promise.all(checkPromises)
  
  return existing
}

export const getSignedImageUrl = getSignedR2Url