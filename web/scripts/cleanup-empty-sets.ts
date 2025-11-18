/**
 * Cleanup Empty Content Sets
 *
 * This script identifies and optionally removes content sets that have no
 * images actually stored in R2. Useful after rate limit failures where
 * database records exist but no images were uploaded.
 *
 * Usage:
 *   npm run cleanup-empty-sets              # Dry run (preview only)
 *   npm run cleanup-empty-sets -- --execute # Actually delete empty sets
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME

// Check if --execute flag is provided
const EXECUTE_MODE = process.argv.includes('--execute')

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  R2_ACCOUNT_ID: R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: R2_BUCKET_NAME,
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:')
  missingVars.forEach(varName => console.error(`  - ${varName}`))
  console.error('\nMake sure your .env.local file is in the /web directory and contains all required variables.\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
})

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an object exists in R2
 */
async function checkR2ObjectExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: key,
    })
    await r2Client.send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    // For other errors, assume it doesn't exist
    return false
  }
}

/**
 * Check how many images in a set actually exist in R2
 */
async function countExistingImages(setId: string): Promise<{
  total: number
  existing: number
  missing: number
}> {
  // Get all images for this set
  const { data: images, error } = await supabase
    .from('images')
    .select('r2_key, watermarked_r2_key, thumbnail_r2_key')
    .eq('set_id', setId)

  if (error || !images || images.length === 0) {
    return { total: 0, existing: 0, missing: 0 }
  }

  let existingCount = 0

  // Check each image - if ANY version exists, count it as existing
  for (const image of images) {
    const checks = await Promise.all([
      image.r2_key ? checkR2ObjectExists(image.r2_key) : Promise.resolve(false),
      image.watermarked_r2_key ? checkR2ObjectExists(image.watermarked_r2_key) : Promise.resolve(false),
      image.thumbnail_r2_key ? checkR2ObjectExists(image.thumbnail_r2_key) : Promise.resolve(false),
    ])

    // If any version exists, count this image as existing
    if (checks.some(exists => exists)) {
      existingCount++
    }
  }

  return {
    total: images.length,
    existing: existingCount,
    missing: images.length - existingCount,
  }
}

/**
 * Delete a content set and all its associated images
 */
async function deleteSet(setId: string, setTitle: string): Promise<boolean> {
  try {
    // First delete all images associated with this set
    const { error: imagesError } = await supabase
      .from('images')
      .delete()
      .eq('set_id', setId)

    if (imagesError) {
      console.error(`  ❌ Error deleting images for set ${setTitle}:`, imagesError.message)
      return false
    }

    // Then delete the set itself
    const { error: setError } = await supabase
      .from('content_sets')
      .delete()
      .eq('id', setId)

    if (setError) {
      console.error(`  ❌ Error deleting set ${setTitle}:`, setError.message)
      return false
    }

    return true
  } catch (error: any) {
    console.error(`  ❌ Error deleting set ${setTitle}:`, error.message)
    return false
  }
}

// ============================================
// Main Function
// ============================================

async function main() {
  console.log('🔍 Scanning for empty content sets...\n')

  if (EXECUTE_MODE) {
    console.log('⚠️  EXECUTE MODE: Empty sets will be DELETED from the database!')
  } else {
    console.log('📋 DRY RUN MODE: No changes will be made (use --execute to actually delete)')
  }

  console.log(`\nUsing bucket: ${R2_BUCKET_NAME}`)
  console.log(`Supabase URL: ${SUPABASE_URL}\n`)

  // Get all content sets
  const { data: sets, error } = await supabase
    .from('content_sets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !sets) {
    console.error('Error fetching content sets:', error)
    process.exit(1)
  }

  console.log(`Found ${sets.length} content sets to check\n`)
  console.log('='.repeat(70))

  const emptySets: any[] = []
  const partialSets: any[] = []
  const completeSets: any[] = []

  // Check each set
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]
    process.stdout.write(`[${i + 1}/${sets.length}] Checking: ${set.title}... `)

    const stats = await countExistingImages(set.id)

    if (stats.total === 0) {
      console.log(`❓ No images in database`)
      emptySets.push({ ...set, stats })
    } else if (stats.existing === 0) {
      console.log(`❌ Empty (0/${stats.total} in R2)`)
      emptySets.push({ ...set, stats })
    } else if (stats.existing < stats.total) {
      console.log(`⚠️  Partial (${stats.existing}/${stats.total} in R2)`)
      partialSets.push({ ...set, stats })
    } else {
      console.log(`✅ Complete (${stats.existing}/${stats.total} in R2)`)
      completeSets.push({ ...set, stats })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 Summary')
  console.log('='.repeat(70))
  console.log(`✅ Complete sets: ${completeSets.length}`)
  console.log(`⚠️  Partial sets:  ${partialSets.length} (have some images but not all)`)
  console.log(`❌ Empty sets:    ${emptySets.length} (no images in R2)\n`)

  if (emptySets.length > 0) {
    console.log('Empty sets that can be cleaned up:')
    emptySets.forEach(set => {
      console.log(`  • ${set.title} (${set.stats.total} database records, 0 in R2)`)
    })
    console.log()
  }

  if (partialSets.length > 0) {
    console.log('Partial sets (run populate-r2:resume to complete):')
    partialSets.forEach(set => {
      console.log(`  • ${set.title} (${set.stats.existing}/${set.stats.total} images)`)
    })
    console.log()
  }

  // Execute deletion if requested
  if (EXECUTE_MODE && emptySets.length > 0) {
    console.log('🗑️  Deleting empty sets...\n')

    let successCount = 0
    let failCount = 0

    for (const set of emptySets) {
      process.stdout.write(`Deleting: ${set.title}... `)
      const success = await deleteSet(set.id, set.title)
      if (success) {
        console.log('✅ Deleted')
        successCount++
      } else {
        console.log('❌ Failed')
        failCount++
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log(`✅ Successfully deleted: ${successCount} sets`)
    if (failCount > 0) {
      console.log(`❌ Failed to delete: ${failCount} sets`)
    }
    console.log('='.repeat(70))

  } else if (!EXECUTE_MODE && emptySets.length > 0) {
    console.log('💡 To actually delete these empty sets, run:')
    console.log('   npm run cleanup-empty-sets -- --execute\n')
  } else if (emptySets.length === 0) {
    console.log('🎉 No empty sets found! All sets have at least some images.\n')
  }

  // Recommendations
  if (partialSets.length > 0) {
    console.log('💡 Recommended next steps:')
    console.log('   1. Wait for Unsplash rate limit to reset (1 hour)')
    console.log('   2. Run: npm run populate-r2:resume')
    console.log('   3. Repeat until all sets are complete\n')
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
