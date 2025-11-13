// scripts/analyze-r2-structure.ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { S3Client, ListObjectsV2Command, ListObjectsV2CommandInput } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Initialize clients
const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_BUCKET

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface StructureAnalysis {
  totalObjects: number
  totalSize: number
  structure: {
    [pattern: string]: {
      count: number
      size: number
      examples: string[]
    }
  }
  userCacheAnalysis: {
    totalCachedImages: number
    totalCacheSize: number
    uniqueUsers: Set<string>
    uniqueImageIds: Set<string>
  }
}

async function analyzeR2Structure(): Promise<void> {
  console.log('Analyzing R2 Storage Structure...\n')
  
  const analysis: StructureAnalysis = {
    totalObjects: 0,
    totalSize: 0,
    structure: {},
    userCacheAnalysis: {
      totalCachedImages: 0,
      totalCacheSize: 0,
      uniqueUsers: new Set(),
      uniqueImageIds: new Set()
    }
  }

  let continuationToken: string | undefined
  let scannedCount = 0

  try {
    do {
      const listParams: ListObjectsV2CommandInput = {
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      }

      const response = await r2Client.send(new ListObjectsV2Command(listParams))
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (!object.Key) continue
          
          analysis.totalObjects++
          analysis.totalSize += object.Size || 0
          scannedCount++

          // Categorize the object
          const category = categorizeObject(object.Key)
          
          if (!analysis.structure[category]) {
            analysis.structure[category] = {
              count: 0,
              size: 0,
              examples: []
            }
          }
          
          analysis.structure[category].count++
          analysis.structure[category].size += object.Size || 0
          
          // Keep up to 3 examples per category
          if (analysis.structure[category].examples.length < 3) {
            analysis.structure[category].examples.push(object.Key)
          }

          // Special analysis for watermark cache
          if (object.Key.startsWith('watermarks/') && object.Key.includes('/') && !object.Key.includes('user-ids')) {
            analysis.userCacheAnalysis.totalCachedImages++
            analysis.userCacheAnalysis.totalCacheSize += object.Size || 0
            
            // Extract user ID and image ID from cache key
            const match = object.Key.match(/watermarks\/([^\/]+)\/([^-]+)-/)
            if (match) {
              analysis.userCacheAnalysis.uniqueImageIds.add(match[1])
              analysis.userCacheAnalysis.uniqueUsers.add(match[2])
            }
          }

          // Progress update
          if (scannedCount % 1000 === 0) {
            console.log(`Scanned ${scannedCount} objects...`)
          }
        }
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    // Generate report
    console.log('\n=== R2 STORAGE STRUCTURE ANALYSIS ===\n')
    console.log(`Total Objects: ${analysis.totalObjects.toLocaleString()}`)
    console.log(`Total Size: ${formatBytes(analysis.totalSize)}\n`)

    console.log('=== STRUCTURE BREAKDOWN ===\n')
    
    // Sort categories by size (largest first)
    const sortedCategories = Object.entries(analysis.structure)
      .sort(([, a], [, b]) => b.size - a.size)

    for (const [category, data] of sortedCategories) {
      console.log(`${category}:`)
      console.log(`  Count: ${data.count.toLocaleString()} objects`)
      console.log(`  Size: ${formatBytes(data.size)} (${((data.size / analysis.totalSize) * 100).toFixed(1)}% of total)`)
      console.log(`  Examples:`)
      data.examples.forEach(example => {
        console.log(`    - ${example}`)
      })
      console.log()
    }

    console.log('=== WATERMARK CACHE ANALYSIS ===\n')
    console.log(`Cached Watermarked Images: ${analysis.userCacheAnalysis.totalCachedImages.toLocaleString()}`)
    console.log(`Cache Size: ${formatBytes(analysis.userCacheAnalysis.totalCacheSize)} (${((analysis.userCacheAnalysis.totalCacheSize / analysis.totalSize) * 100).toFixed(1)}% of total)`)
    console.log(`Unique Users with Cache: ${analysis.userCacheAnalysis.uniqueUsers.size}`)
    console.log(`Unique Images Cached: ${analysis.userCacheAnalysis.uniqueImageIds.size}`)
    
    if (analysis.userCacheAnalysis.uniqueUsers.size > 0 && analysis.userCacheAnalysis.uniqueImageIds.size > 0) {
      const avgCachesPerImage = analysis.userCacheAnalysis.totalCachedImages / analysis.userCacheAnalysis.uniqueImageIds.size
      console.log(`Average Caches per Image: ${avgCachesPerImage.toFixed(1)}`)
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'r2-structure-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2))
    console.log(`\nDetailed report saved to: ${reportPath}`)

    // Check database for orphaned cache entries
    console.log('\n=== DATABASE CACHE ANALYSIS ===\n')
    const { data: cacheEntries, error } = await supabase
      .from('watermark_cache')
      .select('r2_key', { count: 'exact' })

    if (!error && cacheEntries) {
      console.log(`Database Cache Entries: ${cacheEntries.length}`)
      
      // Check if R2 keys exist
      const dbKeys = new Set(cacheEntries.map(entry => entry.r2_key))
      const r2Keys = new Set<string>()
      
      // Collect all R2 watermark cache keys
      Object.entries(analysis.structure).forEach(([category, data]) => {
        if (category.includes('watermark_cache')) {
          data.examples.forEach(key => r2Keys.add(key))
        }
      })
      
      console.log(`Potential orphaned DB entries: ${dbKeys.size - r2Keys.size}`)
    }

  } catch (error) {
    console.error('Error analyzing R2 structure:', error)
  }
}

function categorizeObject(key: string): string {
  // Watermark cache (user-specific)
  if (key.match(/^watermarks\/[^\/]+\/[^\/]+-\w+-\d+\.jpg$/)) {
    return 'watermark_cache (per-user cached images)'
  }
  
  // User ID watermarks
  if (key.match(/^watermarks\/user-ids\/[^\/]+\.png$/)) {
    return 'user_id_watermarks'
  }
  
  // Brand logo watermark
  if (key.match(/^watermarks\/[^\/]+\.(png|jpg)$/)) {
    return 'brand_watermarks'
  }
  
  // Original content images (YYYY/MM/slug/filename)
  if (key.match(/^\d{4}\/\d{2}\/[^\/]+\/[^\/]+\.(jpg|jpeg|png)$/)) {
    return 'original_content_images'
  }
  
  // Already migrated watermarked images
  if (key.match(/^\d{4}\/\d{2}\/[^\/]+\/watermarked\/[^\/]+\.(jpg|jpeg|png)$/)) {
    return 'migrated_watermarked_images'
  }
  
  // Already migrated original images
  if (key.match(/^\d{4}\/\d{2}\/[^\/]+\/original\/[^\/]+\.(jpg|jpeg|png)$/)) {
    return 'migrated_original_images'
  }
  
  // Other
  return 'other'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Run analysis
if (require.main === module) {
  analyzeR2Structure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Analysis failed:', error)
      process.exit(1)
    })
}

export { analyzeR2Structure }
