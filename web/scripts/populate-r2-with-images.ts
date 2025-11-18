/**
 * Populate R2 with Unsplash Images
 *
 * This script:
 * 1. Queries existing image records from the database
 * 2. Downloads matching images from Unsplash
 * 3. Uploads original images to R2
 * 4. Creates and uploads watermarked versions
 * 5. Creates and uploads thumbnails
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import fetch from 'node-fetch'
import 'dotenv/config'

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY!

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// ============================================
// Unsplash Search Keywords by Theme
// ============================================

const THEME_KEYWORDS: Record<string, string[]> = {
  'mountain-peaks': ['mountain peak', 'snowy mountain', 'alpine', 'summit'],
  'sunset-series': ['sunset', 'sunrise', 'golden hour', 'dusk'],
  'ocean-views': ['ocean', 'sea', 'beach', 'coastal'],
  'modern-buildings': ['modern architecture', 'skyscraper', 'contemporary building'],
  'historic-landmarks': ['historic building', 'monument', 'ancient architecture'],
  'street-photography': ['street scene', 'urban life', 'city street'],
  'geometric-patterns': ['geometric pattern', 'abstract geometry', 'symmetry'],
  'color-studies': ['colorful abstract', 'vibrant colors', 'color gradient'],
  'asian-destinations': ['asian architecture', 'temple', 'japan', 'china'],
  'european-cities': ['european city', 'paris', 'rome', 'barcelona'],
}

// ============================================
// Helper Functions
// ============================================

/**
 * Download image from Unsplash
 */
async function downloadUnsplashImage(query: string): Promise<Buffer> {
  const searchUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`

  const searchResponse = await fetch(searchUrl, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_KEY}`,
    },
  })

  if (!searchResponse.ok) {
    throw new Error(`Unsplash API error: ${searchResponse.status}`)
  }

  const data: any = await searchResponse.json()
  const imageUrl = data.urls.full // Get full resolution

  console.log(`  Downloading from Unsplash: ${imageUrl}`)

  // Download the actual image
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`)
  }

  const arrayBuffer = await imageResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Create watermarked version with PhotoVault branding
 */
async function createWatermarkedVersion(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    return imageBuffer
  }

  // Create watermark text
  const watermarkText = '© PhotoVault - Demo'
  const fontSize = Math.max(20, Math.floor(Math.min(metadata.width, metadata.height) / 40))

  // Create watermark SVG
  const watermarkSvg = `
    <svg width="${metadata.width}" height="${metadata.height}">
      <text
        x="50%"
        y="95%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        fill="white"
        fill-opacity="0.5"
        text-anchor="middle"
        font-weight="bold"
      >${watermarkText}</text>
    </svg>
  `

  return await image
    .composite([{
      input: Buffer.from(watermarkSvg),
      blend: 'over'
    }])
    .jpeg({ quality: 95, progressive: true })
    .toBuffer()
}

/**
 * Create thumbnail (400px width)
 */
async function createThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return await sharp(imageBuffer)
    .resize(400, null, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()
}

/**
 * Upload buffer to R2
 */
async function uploadToR2(key: string, buffer: Buffer, contentType: string = 'image/jpeg'): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await r2Client.send(command)
  console.log(`    ✅ Uploaded to R2: ${key}`)
}

/**
 * Get search query for a set based on its slug
 */
function getSearchQuery(slug: string): string {
  // Try to find matching theme
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (slug.includes(theme)) {
      return keywords[Math.floor(Math.random() * keywords.length)]
    }
  }

  // Fallback to generic queries
  const genericQueries = ['nature', 'landscape', 'scenic', 'mountains', 'architecture']
  return genericQueries[Math.floor(Math.random() * genericQueries.length)]
}

// ============================================
// Main Processing Functions
// ============================================

/**
 * Process a single image: download, watermark, thumbnail, upload
 */
async function processImage(image: any, setSlug: string, index: number, total: number) {
  console.log(`\n[${index + 1}/${total}] Processing: ${image.filename}`)

  try {
    // Get search query
    const searchQuery = getSearchQuery(setSlug)
    console.log(`  Search query: "${searchQuery}"`)

    // Download from Unsplash
    const originalBuffer = await downloadUnsplashImage(searchQuery)

    // Upload original
    if (image.r2_key) {
      await uploadToR2(image.r2_key, originalBuffer)
    }

    // Create and upload watermarked version
    if (image.watermarked_r2_key) {
      console.log('  Creating watermarked version...')
      const watermarkedBuffer = await createWatermarkedVersion(originalBuffer)
      await uploadToR2(image.watermarked_r2_key, watermarkedBuffer)
    }

    // Create and upload thumbnail
    if (image.thumbnail_r2_key) {
      console.log('  Creating thumbnail...')
      const thumbnailBuffer = await createThumbnail(originalBuffer)
      await uploadToR2(image.thumbnail_r2_key, thumbnailBuffer)
    }

    console.log(`  ✅ Completed: ${image.filename}`)

    // Rate limiting - wait 1 second between images to avoid Unsplash limits
    await new Promise(resolve => setTimeout(resolve, 1000))

  } catch (error: any) {
    console.error(`  ❌ Error processing ${image.filename}:`, error.message)
  }
}

/**
 * Process all images in a set
 */
async function processSet(set: any) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📦 Processing Set: ${set.title}`)
  console.log(`${'='.repeat(60)}`)

  // Get all images for this set
  const { data: images, error } = await supabase
    .from('images')
    .select('*')
    .eq('set_id', set.id)
    .order('order_index', { ascending: true })

  if (error || !images) {
    console.error(`Error fetching images for set ${set.id}:`, error)
    return
  }

  console.log(`Found ${images.length} images to process`)

  // Process each image
  for (let i = 0; i < images.length; i++) {
    await processImage(images[i], set.slug, i, images.length)
  }

  console.log(`\n✅ Completed set: ${set.title} (${images.length} images)`)
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting R2 population with Unsplash images\n')

  // Verify environment variables
  if (!UNSPLASH_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY not set')
    process.exit(1)
  }

  if (!R2_BUCKET_NAME) {
    console.error('❌ R2_BUCKET_NAME not set')
    process.exit(1)
  }

  console.log(`Using bucket: ${R2_BUCKET_NAME}`)
  console.log(`Unsplash API configured: ✅\n`)

  // Get all content sets
  const { data: sets, error } = await supabase
    .from('content_sets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !sets) {
    console.error('Error fetching content sets:', error)
    process.exit(1)
  }

  console.log(`Found ${sets.length} content sets to process\n`)

  // Process each set
  for (let i = 0; i < sets.length; i++) {
    console.log(`\n[Set ${i + 1}/${sets.length}]`)
    await processSet(sets[i])

    // Wait between sets
    if (i < sets.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next set...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 All sets processed successfully!')
  console.log('='.repeat(60))
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
