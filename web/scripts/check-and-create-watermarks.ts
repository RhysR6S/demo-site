// scripts/check-and-create-watermarks.ts
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') })

// Now we can use the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Import R2 functions after env is loaded
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  }
})

const bucketName = process.env.CLOUDFLARE_BUCKET!

// Import watermark settings function
async function getCreatorWatermarkSettings() {
  const { data, error } = await supabase
    .from('creator_watermark_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    // Return defaults if no settings exist
    return {
      watermark_type: 'image',
      watermark_image_r2_key: 'watermarks/brand-logo.png',
      position: 'corner',
      opacity: 0.15,
      scale: 1.0,
      enabled: true,
      offset_x: 0,
      offset_y: 0
    }
  }
  
  return data
}

// Apply brand watermark function (same as before)
async function applyBrandWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const settings = await getCreatorWatermarkSettings()
    
    if (!settings || !settings.enabled) {
      return imageBuffer
    }

    if (settings.watermark_type === 'image' && settings.watermark_image_r2_key) {
      // Fetch watermark image from R2
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: settings.watermark_image_r2_key,
      })
      
      const response = await r2Client.send(command)
      const chunks = []
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }
      const watermarkBuffer = Buffer.concat(chunks)
      
      // Apply watermark
      const image = sharp(imageBuffer)
      const metadata = await image.metadata()
      
      if (!metadata.width || !metadata.height) {
        return imageBuffer
      }
      
      const watermark = sharp(watermarkBuffer)
      const watermarkMetadata = await watermark.metadata()
      
      if (!watermarkMetadata.width || !watermarkMetadata.height) {
        return imageBuffer
      }
      
      // Scale watermark to 15% of image width
      const scaledWidth = Math.floor(metadata.width * settings.scale * 0.15)
      const scaledHeight = Math.floor(
        (scaledWidth / watermarkMetadata.width) * watermarkMetadata.height
      )
      
      // Resize watermark with opacity
      const processedWatermark = await watermark
        .resize(scaledWidth, scaledHeight, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .composite([{
          input: Buffer.from(
            `<svg width="${scaledWidth}" height="${scaledHeight}">
              <rect width="100%" height="100%" fill="white" fill-opacity="${settings.opacity}"/>
            </svg>`
          ),
          blend: 'dest-in'
        }])
        .toBuffer()
      
      // Position in top-left corner
      const left = 20 + Math.floor((settings.offset_x || 0) * metadata.width / 100)
      const top = 20 + Math.floor((settings.offset_y || 0) * metadata.height / 100)
      
      // Apply watermark
      return await image
        .composite([{
          input: processedWatermark,
          left: Math.floor(left),
          top: Math.floor(top),
          blend: 'over'
        }])
        .jpeg({
          quality: 95,
          progressive: true,
          mozjpeg: true,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer()
    } else {
      // Text watermark
      const image = sharp(imageBuffer)
      const metadata = await image.metadata()
      
      if (!metadata.width || !metadata.height) {
        return imageBuffer
      }
      
      const watermarkText = '© PhotoVault'
      const fontSize = Math.max(
        14,
        Math.floor(Math.min(metadata.width, metadata.height) / 40 * settings.scale)
      )
      
      const padding = 20
      const x = padding
      const y = fontSize + padding
      
      const watermarkSvg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
          <text 
            x="${x}" 
            y="${y}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            fill="white" 
            fill-opacity="${settings.opacity}"
            style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5)"
          >${watermarkText}</text>
        </svg>`
      
      return await image
        .composite([{
          input: Buffer.from(watermarkSvg),
          blend: 'over'
        }])
        .jpeg({
          quality: 95,
          progressive: true,
          mozjpeg: true,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer()
    }
  } catch (error) {
    console.error('[Watermark] Failed to apply brand watermark:', error)
    return imageBuffer
  }
}

// Check if file exists in R2
async function checkFileExists(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    }))
    return true
  } catch (error) {
    return false
  }
}

// Helper functions
async function getImageFromR2(key: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return { success: false, error: 'No data received' }
    }

    const chunks = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return { success: true, data: buffer }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function uploadToR2(key: string, body: Buffer): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: 'image/jpeg',
  })

  await r2Client.send(command)
}

interface MigrationStats {
  total: number
  alreadyExists: number
  created: number
  failed: number
  skipped: number
}

async function checkAndCreateWatermarks() {
  console.log('Checking and creating missing watermarked images...\n')
  
  const stats: MigrationStats = {
    total: 0,
    alreadyExists: 0,
    created: 0,
    failed: 0,
    skipped: 0
  }
  
  // Track start time for ETA
  const startTime = Date.now()
  
  try {
    // First check watermark settings
    console.log('Checking watermark settings...')
    const settings = await getCreatorWatermarkSettings()
    console.log(`Watermark type: ${settings.watermark_type}`)
    if (settings.watermark_type === 'image') {
      console.log(`Watermark image: ${settings.watermark_image_r2_key}`)
    }
    console.log(`Watermark enabled: ${settings.enabled}\n`)
    // Get count of images first
    const { count: totalCount } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .not('watermarked_r2_key', 'is', null)
    
    console.log(`Total images in database: ${totalCount}`)
    
    // Process in chunks of 1000 (Supabase limit)
    const chunkSize = 1000
    let allImages: any[] = []
    
    for (let offset = 0; offset < (totalCount || 0); offset += chunkSize) {
      const { data: chunk, error } = await supabase
        .from('images')
        .select('id, r2_key, watermarked_r2_key')
        .not('watermarked_r2_key', 'is', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + chunkSize - 1)
      
      if (error) {
        console.error(`Failed to fetch images at offset ${offset}:`, error)
        continue
      }
      
      if (chunk) {
        allImages = allImages.concat(chunk)
        console.log(`Fetched ${chunk.length} images (total so far: ${allImages.length})`)
      }
    }
    
    const images = allImages
    
    if (!images || images.length === 0) {
      console.log('No images found')
      return
    }
    
    stats.total = images.length
    console.log(`\nReady to process ${stats.total} images`)
    console.log('This will check each image and create watermarked versions where missing.')
    console.log('Processing in batches of 5 images...\n')
    
    // Process in batches
    const batchSize = 5
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize)
      
      console.log(`\nBatch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(images.length / batchSize)} (Images ${i + 1}-${Math.min(i + batchSize, images.length)})`)
      
      await Promise.all(
        batch.map(async (image) => {
          try {
            if (!image.watermarked_r2_key) {
              stats.skipped++
              return
            }
            
            // Check if watermarked version already exists
            const exists = await checkFileExists(image.watermarked_r2_key)
            
            if (exists) {
              console.log(`✓ Watermark exists: ${image.watermarked_r2_key}`)
              stats.alreadyExists++
              return
            }
            
            console.log(`✗ Creating watermark: ${image.watermarked_r2_key}`)
            
            // Download original image
            const result = await getImageFromR2(image.r2_key)
            if (!result.success || !result.data) {
              console.error(`  Failed to download original: ${image.r2_key}`)
              stats.failed++
              return
            }
            
            // Create watermarked version
            const watermarkedBuffer = await applyBrandWatermark(result.data)
            
            // Upload watermarked version
            await uploadToR2(image.watermarked_r2_key, watermarkedBuffer)
            
            console.log(`  ✓ Created watermark successfully`)
            stats.created++
            
          } catch (error) {
            console.error(`  Failed to process image ${image.id}:`, error)
            stats.failed++
          }
        })
      )
      
      // Progress update
      const processed = stats.alreadyExists + stats.created + stats.failed + stats.skipped
      const progress = (processed / images.length * 100).toFixed(1)
      
      // Calculate ETA
      const elapsed = Date.now() - startTime
      const avgTimePerImage = elapsed / processed
      const remainingImages = images.length - processed
      const estimatedTimeRemaining = remainingImages * avgTimePerImage
      const etaMinutes = Math.ceil(estimatedTimeRemaining / 60000)
      
      console.log(`\nProgress: ${progress}% (${stats.created} created, ${stats.alreadyExists} existed, ${stats.failed} failed)`)
      if (processed > 0) {
        console.log(`Estimated time remaining: ${etaMinutes} minutes`)
      }
    }
    
  } catch (error) {
    console.error('Check failed:', error)
  }
  
  // Final report
  const totalTime = Math.round((Date.now() - startTime) / 60000)
  console.log('\n=== WATERMARK CHECK COMPLETE ===')
  console.log('=====================================')
  console.log(`Total images checked: ${stats.total}`)
  console.log(`Already had watermarks: ${stats.alreadyExists}`)
  console.log(`Watermarks created: ${stats.created}`)
  console.log(`Failed: ${stats.failed}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log(`Total time: ${totalTime} minutes`)
  console.log('=====================================')
  
  if (stats.failed > 0) {
    console.log('\nSome images failed. You may need to run this again.')
  }
  
  if (stats.created > 0) {
    console.log(`\n✓ Successfully created ${stats.created} watermarked images!`)
    console.log('You can now run the cleanup script to remove old cached watermarks.')
  }
}

// Run the check and create process
checkAndCreateWatermarks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Process failed:', error)
    process.exit(1)
  })
