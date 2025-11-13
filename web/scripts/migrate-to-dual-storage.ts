// scripts/migrate-to-dual-storage.ts
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
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')

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

// Apply brand watermark function
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
      
      const watermarkText = '© KamiContent'
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
  processed: number
  failed: number
  skipped: number
}

async function migrateImages() {
  console.log('Starting migration to dual-storage system...')
  
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0
  }
  
  try {
    // Get all images that don't have watermarked_r2_key
    const { data: images, error } = await supabase
      .from('images')
      .select('id, r2_key, set_id')
      .is('watermarked_r2_key', null)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Failed to fetch images:', error)
      return
    }
    
    if (!images || images.length === 0) {
      console.log('No images to migrate')
      return
    }
    
    stats.total = images.length
    console.log(`Found ${stats.total} images to migrate`)
    
    // Process in batches
    const batchSize = 5
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize)
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(images.length / batchSize)}`)
      
      await Promise.all(
        batch.map(async (image) => {
          try {
            // Skip if the R2 key doesn't follow expected format
            if (!image.r2_key.includes('/')) {
              console.log(`Skipping image ${image.id}: Invalid R2 key format`)
              stats.skipped++
              return
            }
            
            console.log(`Processing image ${image.id}...`)
            
            // Download original image
            const result = await getImageFromR2(image.r2_key)
            if (!result.success || !result.data) {
              console.error(`Failed to download image ${image.id}`)
              stats.failed++
              return
            }
            
            // Create watermarked version
            const watermarkedBuffer = await applyBrandWatermark(result.data)
            
            // Generate watermarked R2 key
            // Convert: 2025/01/set-name/image.jpg -> 2025/01/set-name/watermarked/image.jpg
            const pathParts = image.r2_key.split('/')
            const filename = pathParts.pop()
            pathParts.push('watermarked', filename!)
            const watermarkedKey = pathParts.join('/')
            
            // Upload watermarked version
            await uploadToR2(watermarkedKey, watermarkedBuffer)
            
            // Update database
            const { error: updateError } = await supabase
              .from('images')
              .update({ watermarked_r2_key: watermarkedKey })
              .eq('id', image.id)
            
            if (updateError) {
              console.error(`Failed to update database for image ${image.id}:`, updateError)
              stats.failed++
              return
            }
            
            console.log(`Successfully migrated image ${image.id}`)
            stats.processed++
            
          } catch (error) {
            console.error(`Error processing image ${image.id}:`, error)
            stats.failed++
          }
        })
      )
      
      // Progress update
      const progress = ((i + batch.length) / images.length * 100).toFixed(1)
      console.log(`Progress: ${progress}% (${stats.processed} processed, ${stats.failed} failed, ${stats.skipped} skipped)`)
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
  
  // Final report
  console.log('\nMigration completed!')
  console.log('=====================================')
  console.log(`Total images: ${stats.total}`)
  console.log(`Successfully processed: ${stats.processed}`)
  console.log(`Failed: ${stats.failed}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log('=====================================')
  
  if (stats.failed > 0) {
    console.log('\nSome images failed to migrate. You may need to run the migration again.')
  }
}

// Run migration
migrateImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
