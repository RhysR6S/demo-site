// scripts/fix-watermarks.ts
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') })

// Initialize Supabase
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

// Get actual watermark settings from database
async function getCreatorWatermarkSettings() {
  console.log('Fetching watermark settings from database...')
  
  const { data, error } = await supabase
    .from('creator_watermark_settings')
    .select('*')
    .eq('user_id', '109483064') // Your creator user ID
    .single()
  
  if (error || !data) {
    console.error('Failed to fetch watermark settings:', error)
    throw new Error('Could not load watermark settings')
  }
  
  console.log('Loaded settings:', {
    type: data.watermark_type,
    image: data.watermark_image_r2_key,
    position: data.position,
    opacity: data.opacity,
    scale: data.scale,
    offset_x: data.offset_x,
    offset_y: data.offset_y
  })
  
  return data
}

// Apply brand watermark with correct settings
async function applyBrandWatermark(imageBuffer: Buffer, settings: any): Promise<Buffer> {
  try {
    if (!settings || !settings.enabled) {
      console.log('Watermark is disabled')
      return imageBuffer
    }

    if (settings.watermark_type === 'image' && settings.watermark_image_r2_key) {
      console.log(`Applying image watermark: ${settings.watermark_image_r2_key}`)
      
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
      
      // Scale watermark - using your scale setting (1.70 = 170%)
      // Base size is 15% of image width, then multiplied by scale
      const scaledWidth = Math.floor(metadata.width * 0.15 * settings.scale)
      const scaledHeight = Math.floor(
        (scaledWidth / watermarkMetadata.width) * watermarkMetadata.height
      )
      
      console.log(`Watermark size: ${scaledWidth}x${scaledHeight} (scale: ${settings.scale})`)
      
      // Resize watermark with opacity
      const opacity = parseFloat(settings.opacity)
      const processedWatermark = await watermark
        .resize(scaledWidth, scaledHeight, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .composite([{
          input: Buffer.from(
            `<svg width="${scaledWidth}" height="${scaledHeight}">
              <rect width="100%" height="100%" fill="white" fill-opacity="${opacity}"/>
            </svg>`
          ),
          blend: 'dest-in'
        }])
        .toBuffer()
      
      // Position in top-left corner with offsets
      const offsetX = parseFloat(settings.offset_x) || 0
      const offsetY = parseFloat(settings.offset_y) || 0
      
      // Base position is 20px padding, then apply percentage offsets
      let left = 20 + Math.floor((offsetX / 100) * metadata.width)
      let top = 20 + Math.floor((offsetY / 100) * metadata.height)
      
      // Ensure watermark stays within bounds
      left = Math.max(0, Math.min(left, metadata.width - scaledWidth))
      top = Math.max(0, Math.min(top, metadata.height - scaledHeight))
      
      console.log(`Position: left=${left}, top=${top} (offsets: x=${offsetX}, y=${offsetY})`)
      
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
      // Text watermark fallback
      console.log('Using text watermark')
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
  } catch (error: any) {
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
  } catch (error: any) {
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

interface FixStats {
  total: number
  processed: number
  failed: number
  skipped: number
}

async function fixWatermarks(limit?: number) {
  console.log('Starting watermark fix process...\n')
  
  const stats: FixStats = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0
  }
  
  const startTime = Date.now()
  
  try {
    // Load watermark settings first
    const watermarkSettings = await getCreatorWatermarkSettings()
    console.log('\nWatermark settings loaded successfully\n')
    
    // Get total count first
    const { count: totalCount } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .not('watermarked_r2_key', 'is', null)
    
    console.log(`Total watermarked images in database: ${totalCount}`)
    
    // If limit is specified, use it; otherwise process all
    const imagesToProcess = limit || totalCount || 0
    console.log(`Will process: ${imagesToProcess} images\n`)
    
    // Fetch images in chunks to avoid Supabase limit
    const chunkSize = 1000
    let allImages: any[] = []
    
    for (let offset = 0; offset < imagesToProcess; offset += chunkSize) {
      const { data: chunk, error } = await supabase
        .from('images')
        .select('id, r2_key, watermarked_r2_key')
        .not('watermarked_r2_key', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, Math.min(offset + chunkSize - 1, imagesToProcess - 1))
      
      if (error) {
        console.error(`Failed to fetch images at offset ${offset}:`, error)
        continue
      }
      
      if (chunk) {
        allImages = allImages.concat(chunk)
        console.log(`Fetched ${chunk.length} images (total fetched: ${allImages.length})`)
      }
      
      // Stop if we've reached the limit
      if (limit && allImages.length >= limit) {
        allImages = allImages.slice(0, limit)
        break
      }
    }
    
    const images = allImages
    
    if (!images || images.length === 0) {
      console.log('No images found')
      return
    }
    
    stats.total = images.length
    console.log(`\nReady to fix ${stats.total} watermarked images`)
    console.log('This will re-create all watermarked versions with the correct brand logo\n')
    
    // Process in batches
    const batchSize = 5
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize)
      
      console.log(`\n=== Batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(images.length / batchSize)} ===`)
      console.log(`Processing images ${i + 1}-${Math.min(i + batchSize, images.length)} of ${images.length}`)
      
      await Promise.all(
        batch.map(async (image) => {
          try {
            if (!image.watermarked_r2_key) {
              stats.skipped++
              return
            }
            
            console.log(`Processing: ${image.watermarked_r2_key}`)
            
            // Download original image
            const result = await getImageFromR2(image.r2_key)
            if (!result.success || !result.data) {
              console.error(`  ✗ Failed to download original`)
              stats.failed++
              return
            }
            
            // Apply correct watermark
            const watermarkedBuffer = await applyBrandWatermark(result.data, watermarkSettings)
            
            // Upload watermarked version (overwrites existing)
            await uploadToR2(image.watermarked_r2_key, watermarkedBuffer)
            
            console.log(`  ✓ Fixed watermark`)
            stats.processed++
            
          } catch (error: any) {
            console.error(`  ✗ Failed:`, error)
            stats.failed++
          }
        })
      )
      
      // Progress update
      const totalProcessed = stats.processed + stats.failed + stats.skipped
      const progress = ((totalProcessed / images.length) * 100).toFixed(1)
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      
      // Calculate ETA
      if (totalProcessed > 0) {
        const avgTimePerImage = elapsed / totalProcessed
        const remainingImages = images.length - totalProcessed
        const estimatedSecondsRemaining = Math.round(remainingImages * avgTimePerImage)
        const etaMinutes = Math.ceil(estimatedSecondsRemaining / 60)
        
        console.log(`\nProgress: ${progress}% (${totalProcessed}/${images.length})`)
        console.log(`Time elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`)
        console.log(`Estimated time remaining: ${etaMinutes} minutes`)
      } else {
        console.log(`\nProgress: ${progress}% (${elapsed}s elapsed)`)
      }
    }
    
  } catch (error: any) {
    console.error('Fix process failed:', error)
  }
  
  // Final report
  const totalTime = Math.round((Date.now() - startTime) / 60000)
  console.log('\n=== WATERMARK FIX COMPLETE ===')
  console.log('=====================================')
  console.log(`Total images: ${stats.total}`)
  console.log(`Successfully fixed: ${stats.processed}`)
  console.log(`Failed: ${stats.failed}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log(`Total time: ${totalTime} minutes`)
  console.log('=====================================')
  
  if (stats.processed > 0) {
    console.log(`\n✓ Successfully updated ${stats.processed} watermarked images!`)
    console.log('Bronze users will now see the correct brand watermark.')
  }
}

// Check command line arguments
const args = process.argv.slice(2)
const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1]

// Run the fix
async function run() {
  try {
    if (limit) {
      console.log(`Running with limit of ${limit} images (most recent first)\n`)
      await fixWatermarks(parseInt(limit))
    } else {
      console.log(`Running fix for ALL watermarked images\n`)
      await fixWatermarks()
    }
    process.exit(0)
  } catch (error: any) {
    console.error('Process failed:', error)
    process.exit(1)
  }
}

run()
