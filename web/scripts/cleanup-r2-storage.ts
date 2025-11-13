// scripts/cleanup-r2-storage.ts
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as readline from 'readline'

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') })

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Import AWS SDK after env is loaded
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

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

interface CleanupStats {
  scanned: number
  toDelete: number
  deleted: number
  failed: number
  sizeCleaned: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function shouldDelete(key: string): boolean {
  // Delete per-user watermark cache
  if (key.match(/^watermarks\/[^\/]+\/[^\/]+-\w+-\d+\.jpg$/)) {
    return true
  }
  
  // Delete user ID watermarks (they'll be generated on-the-fly now)
  if (key.match(/^watermarks\/user-ids\/[^\/]+\.png$/)) {
    return true
  }
  
  // Keep brand watermarks
  if (key === 'watermarks/brand-logo.png' || key.match(/^watermarks\/\d+-\d+\.png$/)) {
    return false
  }
  
  return false
}

async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function cleanupR2Storage(dryRun: boolean = true) {
  console.log(`\n=== R2 STORAGE CLEANUP ${dryRun ? '(DRY RUN)' : '(LIVE RUN)'} ===\n`)
  
  const stats: CleanupStats = {
    scanned: 0,
    toDelete: 0,
    deleted: 0,
    failed: 0,
    sizeCleaned: 0
  }

  const keysToDelete: { Key: string; Size?: number }[] = []
  
  try {
    // Step 1: Find all watermark cache files
    console.log('Step 1: Scanning for watermark cache files...')
    
    let continuationToken: string | undefined
    
    do {
      const response = await r2Client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'watermarks/',
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      }))
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (!object.Key) continue
          
          stats.scanned++
          
          // Identify cache files to delete
          if (shouldDelete(object.Key)) {
            keysToDelete.push({ Key: object.Key, Size: object.Size })
            stats.toDelete++
            stats.sizeCleaned += object.Size || 0
            
            if (keysToDelete.length <= 10) {
              console.log(`  - Will delete: ${object.Key} (${formatBytes(object.Size || 0)})`)
            } else if (keysToDelete.length === 11) {
              console.log(`  ... and ${stats.toDelete - 10} more files`)
            }
          }
          
          // Progress update
          if (stats.scanned % 1000 === 0) {
            console.log(`  Scanned ${stats.scanned} objects, found ${stats.toDelete} to delete...`)
          }
        }
      }
      
      continuationToken = response.NextContinuationToken
    } while (continuationToken)
    
    console.log(`\nScan complete:`)
    console.log(`  - Total scanned: ${stats.scanned}`)
    console.log(`  - Files to delete: ${stats.toDelete}`)
    console.log(`  - Space to recover: ${formatBytes(stats.sizeCleaned)}`)
    
    if (stats.toDelete === 0) {
      console.log('\nNo files to delete. Storage is already clean!')
      return
    }
    
    // Save list of files to delete
    const backupPath = `r2-cleanup-${Date.now()}.json`
    fs.writeFileSync(backupPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      dryRun,
      stats,
      filesToDelete: keysToDelete.slice(0, 1000) // First 1000 for review
    }, null, 2))
    console.log(`\nBackup list saved to: ${backupPath}`)
    
    if (dryRun) {
      console.log('\nThis was a DRY RUN. No files were deleted.')
      console.log('To actually delete files, run: npm run cleanup-storage:execute')
      return
    }
    
    // Step 2: Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete files from R2!')
    const confirm = await promptUser(`Delete ${stats.toDelete} files and free ${formatBytes(stats.sizeCleaned)}?`)
    
    if (!confirm) {
      console.log('Deletion cancelled.')
      return
    }
    
    // Step 3: Delete files in batches
    console.log('\nStep 2: Deleting files...')
    
    const batchSize = 1000 // S3 allows max 1000 per batch
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize)
      
      try {
        if (batch.length === 1) {
          // Single file deletion
          await r2Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: batch[0].Key
          }))
        } else {
          // Batch deletion
          await r2Client.send(new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: batch.map(item => ({ Key: item.Key })),
              Quiet: true
            }
          }))
        }
        
        stats.deleted += batch.length
        console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} files`)
      } catch (error) {
        console.error(`  Failed to delete batch: ${error}`)
        stats.failed += batch.length
      }
    }
    
    // Step 4: Clean up database
    console.log('\nStep 3: Cleaning up database...')
    
    // Check if watermark_cache table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'watermark_cache')
      .single()
    
    if (tables) {
      // Get count first
      const { count } = await supabase
        .from('watermark_cache')
        .select('*', { count: 'exact', head: true })
      
      console.log(`  Found ${count || 0} watermark cache entries in database`)
      
      if (count && count > 0) {
        // Delete all watermark cache entries
        const { error } = await supabase
          .from('watermark_cache')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        
        if (error) {
          console.error('  Failed to clean database:', error)
        } else {
          console.log(`  Deleted ${count} database entries`)
        }
      }
    } else {
      console.log('  watermark_cache table not found (already cleaned)')
    }
    
    // Final report
    console.log('\n=== CLEANUP COMPLETE ===')
    console.log(`Files deleted: ${stats.deleted}`)
    console.log(`Files failed: ${stats.failed}`)
    console.log(`Space recovered: ${formatBytes(stats.sizeCleaned)}`)
    
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
}

// Check command line arguments
const args = process.argv.slice(2)
const execute = args.includes('--execute')

// Run cleanup
cleanupR2Storage(!execute)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
