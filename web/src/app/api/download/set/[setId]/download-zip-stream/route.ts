import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getImageFromR2 } from '@/lib/r2'
import { applyIdWatermark } from '@/lib/watermark-service'
import archiver from 'archiver'
import sharp from 'sharp'
import crypto from 'crypto'
import pLimit from 'p-limit'

// Concurrency limit for parallel processing
const PARALLEL_LIMIT = 3

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = token.sub
    const isCreator = token.isCreator || false
    const userTier: string = (token.membershipTier as string) || 'bronze'
    const { setId } = await params
    const supabase = getSupabaseAdmin()

    // Fetch user data and set data in parallel
    const [userData, setData, imagesData] = await Promise.all([
      supabase
        .from('users')
        .select('id, patreon_user_id')
        .eq('id', userId)
        .single(),
      supabase
        .from('content_sets')
        .select('*')
        .eq('id', setId)
        .single(),
      supabase
        .from('images')
        .select('*')
        .eq('set_id', setId)
        .order('order_index', { ascending: true })
    ])

    const watermarkUserId = userData.data?.patreon_user_id || userId

    if (setData.error || !setData.data) {
      return NextResponse.json({ error: 'Content set not found' }, { status: 404 })
    }

    if (imagesData.error || !imagesData.data) {
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
    }

    const set = setData.data
    const images = imagesData.data

    console.log(`[Download] Starting optimized stream for user ${userId} (tier: ${userTier})`)

    // Record download asynchronously (don't wait)
    Promise.all([
      supabase
        .from('user_set_downloads')
        .upsert({
          user_id: userId,
          set_id: setId,
          downloaded_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,set_id',
          ignoreDuplicates: false
        }),
      supabase.rpc('increment_download_count', { 
        p_user_id: userId, 
        p_set_id: setId 
      })
    ]).catch(err => console.error('[Download] Failed to record:', err))

    const folderName = set.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()

    // Create streaming response
    return new Response(
      new ReadableStream({
        async start(controller) {
          const archive = archiver('zip', {
            zlib: { level: 6 }, // Balanced compression
            highWaterMark: 1024 * 1024 // 1MB buffer
          })

          archive.on('data', (chunk) => controller.enqueue(chunk))
          archive.on('end', () => {
            console.log(`[Download] Stream completed for set ${setId}`)
            controller.close()
          })
          archive.on('error', (err) => {
            console.error('[Download] Archive error:', err)
            controller.error(err)
          })

          let processedCount = 0
          const limit = pLimit(PARALLEL_LIMIT)
          const processingQueue: Promise<void>[] = []

          // Process images with controlled parallelism
          for (let i = 0; i < images.length; i++) {
            const image = images[i]
            
            const task = limit(async () => {
              try {
                // Determine R2 key
                let r2Key = (userTier === 'bronze' && image.watermarked_r2_key) 
                  ? image.watermarked_r2_key 
                  : image.r2_key

                // Fetch from R2
                const result = await getImageFromR2(r2Key)
                
                if (!result.success || !result.data) {
                  // Fallback to original if needed
                  if (r2Key === image.watermarked_r2_key && image.r2_key) {
                    const fallback = await getImageFromR2(image.r2_key)
                    if (fallback.success && fallback.data) {
                      result.data = fallback.data
                      result.success = true
                    }
                  }
                  
                  if (!result.success || !result.data) {
                    console.error(`[Download] Failed to fetch image ${image.id}`)
                    return
                  }
                }

                // Get metadata early to determine format
                const metadata = await sharp(result.data).metadata()
                const fileExtension = metadata.format === 'png' ? 'png' : 'jpg'

                // Generate tracking ID once
                const trackingId = crypto.createHash('sha256')
                  .update(`${userId}-${setId}-${image.id}-${Date.now()}`)
                  .digest('hex')
                  .substring(0, 16)

                // OPTIMIZED: Skip expensive ID watermarking for trusted tiers (silver+)
                // Bronze tier already gets pre-watermarked versions from R2
                // Trusted patrons only need metadata tracking (90% cheaper)
                let processedBuffer: Buffer

                if (userTier === 'bronze') {
                  // Bronze: Apply ID watermark (expensive but necessary)
                  const watermarkedBuffer = await applyIdWatermark(result.data, watermarkUserId)
                  processedBuffer = await sharp(watermarkedBuffer)
                    .withMetadata({
                      exif: {
                        IFD0: {
                          Copyright: `Protected Content - Tracking ID: ${trackingId}`,
                          Artist: 'PhotoVault',
                          Software: 'PhotoVault Protection System',
                          UserTier: userTier
                        }
                      }
                    })
                    [metadata.format === 'png' ? 'png' : 'jpeg']({
                      quality: 100,
                      ...(metadata.format === 'png'
                        ? { compressionLevel: 9 }
                        : { progressive: true, mozjpeg: false })
                    })
                    .toBuffer()
                } else {
                  // Silver/Gold/Platinum: Skip watermarking, only add metadata (trusted patrons)
                  processedBuffer = await sharp(result.data)
                    .withMetadata({
                      exif: {
                        IFD0: {
                          Copyright: `Protected Content - Tracking ID: ${trackingId}`,
                          Artist: 'PhotoVault',
                          Software: 'PhotoVault Protection System',
                          UserTier: userTier
                        }
                      }
                    })
                    [metadata.format === 'png' ? 'png' : 'jpeg']({
                      quality: 100,
                      ...(metadata.format === 'png'
                        ? { compressionLevel: 9 }
                        : { progressive: true, mozjpeg: false })
                    })
                    .toBuffer()
                }

                // Add to archive
                const filename = `${String(image.order_index).padStart(3, '0')}-${image.id}.${fileExtension}`
                archive.append(processedBuffer, {
                  name: `${folderName}/${filename}`
                })

                processedCount++
                
                // Log progress
                if (processedCount % 10 === 0) {
                  console.log(`[Download] Processed ${processedCount}/${images.length}`)
                }

              } catch (err) {
                console.error(`[Download] Failed to process image ${image.id}:`, err)
              }
            })

            processingQueue.push(task)

            // Process in batches to prevent memory issues
            if (processingQueue.length >= PARALLEL_LIMIT * 2) {
              await Promise.all(processingQueue.splice(0, PARALLEL_LIMIT))
            }
          }

          // Wait for remaining tasks
          await Promise.all(processingQueue)

          // Finalize archive
          await archive.finalize()
          
          console.log(`[Download] Finalized archive with ${processedCount}/${images.length} images`)
        }
      }),
      {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${folderName}.zip"`,
          'Cache-Control': 'no-cache',
          'X-User-Tier': userTier,
        }
      }
    )

  } catch (error) {
    console.error('[Download] Route error:', error)
    return NextResponse.json(
      { error: 'Failed to download content' },
      { status: 500 }
    )
  }
}