// scripts/check-r2-keys.ts
// Run with: npx tsx scripts/check-r2-keys.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkR2Keys() {
  console.log('Checking R2 keys in database...\n')

  // Get all images
  const { data: images, error } = await supabase
    .from('images')
    .select('id, filename, r2_key, set_id')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching images:', error)
    return
  }

  console.log(`Found ${images?.length || 0} images\n`)

  let missingKeys = 0
  let validKeys = 0

  images?.forEach((image, index) => {
    console.log(`Image ${index + 1}:`)
    console.log(`  ID: ${image.id}`)
    console.log(`  Filename: ${image.filename}`)
    console.log(`  R2 Key: ${image.r2_key || 'MISSING!'}`)
    console.log(`  Set ID: ${image.set_id}`)
    
    if (!image.r2_key) {
      missingKeys++
      console.log('  ❌ Missing R2 key!')
    } else {
      validKeys++
      console.log('  ✅ Has R2 key')
    }
    console.log('')
  })

  console.log('\nSummary:')
  console.log(`  Valid R2 keys: ${validKeys}`)
  console.log(`  Missing R2 keys: ${missingKeys}`)

  // Check a sample content set
  console.log('\n\nChecking sample content set...')
  const { data: contentSet, error: setError } = await supabase
    .from('content_sets')
    .select(`
      id,
      title,
      slug,
      thumbnail_image_id,
      r2_folder_key,
      images (
        id,
        filename,
        r2_key
      )
    `)
    .limit(1)
    .single()

  if (setError) {
    console.error('Error fetching content set:', setError)
    return
  }

  if (contentSet) {
    console.log('\nContent Set:')
    console.log(`  Title: ${contentSet.title}`)
    console.log(`  Slug: ${contentSet.slug}`)
    console.log(`  R2 Folder: ${contentSet.r2_folder_key}`)
    console.log(`  Thumbnail ID: ${contentSet.thumbnail_image_id || 'None'}`)
    console.log(`  Images: ${contentSet.images?.length || 0}`)
    
    if (contentSet.images && contentSet.images.length > 0) {
      console.log('\n  First 3 images:')
      contentSet.images.slice(0, 3).forEach((img: any, i: number) => {
        console.log(`    ${i + 1}. ${img.filename} - R2: ${img.r2_key || 'MISSING'}`)
      })
    }
  }
}

checkR2Keys().catch(console.error)
