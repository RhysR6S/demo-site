// src/app/api/publish-scheduled/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * API endpoint to automatically publish scheduled content
 * This should be called via cron job at the specified time slots
 * 
 * GET /api/publish-scheduled - Publish any content scheduled for the current time
 * GET /api/publish-scheduled?cron_secret=YOUR_SECRET - For automated cron calls
 * 
 * Time slots checked: 10AM, 12PM, 2PM, 4PM, 6PM, 8PM, 10PM, 12AM (BST/GMT)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cronSecret = searchParams.get('cron_secret')
    
    // Verify cron secret if provided (for automated calls)
    if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Invalid cron secret' },
        { status: 401 }
      )
    }
    
    const supabase = getSupabaseAdmin()
    
    // Get current time and round to nearest scheduled slot
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Define valid publishing hours (24-hour format)
    const VALID_HOURS = [0, 10, 12, 14, 16, 18, 20, 22]
    
    // Check if current time is within 5 minutes of a valid slot
    const isValidTime = VALID_HOURS.includes(currentHour) && currentMinute <= 5
    
    if (!isValidTime && !searchParams.get('force')) {
      console.log(`[Auto-publish] Not a valid publishing time: ${currentHour}:${currentMinute}`)
      return NextResponse.json({
        message: 'Not a scheduled publishing time',
        currentTime: now.toISOString(),
        nextSlot: getNextPublishingSlot(now)
      })
    }
    
    // Create time window for publishing (current time ± 5 minutes)
    const publishWindowStart = new Date(now)
    publishWindowStart.setMinutes(publishWindowStart.getMinutes() - 5)
    
    const publishWindowEnd = new Date(now)
    publishWindowEnd.setMinutes(publishWindowEnd.getMinutes() + 5)
    
    console.log(`[Auto-publish] Checking for content to publish between ${publishWindowStart.toISOString()} and ${publishWindowEnd.toISOString()}`)
    
    // Find all content scheduled for this time window that hasn't been published yet
    const { data: scheduledContent, error: fetchError } = await supabase
      .from('content_sets')
      .select('*')
      .gte('scheduled_time', publishWindowStart.toISOString())
      .lte('scheduled_time', publishWindowEnd.toISOString())
      .is('published_at', null)
      .order('scheduled_time', { ascending: true })
    
    if (fetchError) {
      console.error('[Auto-publish] Error fetching scheduled content:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled content', details: fetchError.message },
        { status: 500 }
      )
    }
    
    if (!scheduledContent || scheduledContent.length === 0) {
      console.log('[Auto-publish] No content to publish at this time')
      return NextResponse.json({
        message: 'No content scheduled for publishing',
        checked: true,
        publishWindow: {
          start: publishWindowStart.toISOString(),
          end: publishWindowEnd.toISOString()
        }
      })
    }
    
    console.log(`[Auto-publish] Found ${scheduledContent.length} content sets to publish`)
    
    // Publish each scheduled content set
    const publishResults = []
    
    for (const contentSet of scheduledContent) {
      try {
        // Update the content set to mark it as published
        const { data: publishedSet, error: publishError } = await supabase
          .from('content_sets')
          .update({
            published_at: now.toISOString(),
            // Keep scheduled_time for historical reference
          })
          .eq('id', contentSet.id)
          .select()
          .single()
        
        if (publishError) {
          console.error(`[Auto-publish] Failed to publish set ${contentSet.id}:`, publishError)
          publishResults.push({
            id: contentSet.id,
            title: contentSet.title,
            success: false,
            error: publishError.message
          })
          continue
        }
        
        console.log(`[Auto-publish] Successfully published: ${contentSet.title} (ID: ${contentSet.id})`)
        
        // Optional: Trigger any post-publish actions here
        // - Send notifications to subscribers
        // - Post to Patreon
        // - Update cache
        // - Generate thumbnails
        
        publishResults.push({
          id: contentSet.id,
          title: contentSet.title,
          success: true,
          publishedAt: publishedSet.published_at
        })
        
        // Optional: Add a small delay between publishes to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`[Auto-publish] Unexpected error publishing set ${contentSet.id}:`, error)
        publishResults.push({
          id: contentSet.id,
          title: contentSet.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Log summary
    const successCount = publishResults.filter(r => r.success).length
    const failureCount = publishResults.filter(r => !r.success).length
    
    console.log(`[Auto-publish] Summary: ${successCount} published, ${failureCount} failed`)
    
    return NextResponse.json({
      success: true,
      summary: {
        total: publishResults.length,
        published: successCount,
        failed: failureCount
      },
      results: publishResults,
      timestamp: now.toISOString()
    })
    
  } catch (error) {
    console.error('[Auto-publish] Critical error:', error)
    return NextResponse.json(
      { 
        error: 'Auto-publish failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to manually trigger publishing (for testing or admin override)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Force flag allows manual triggering outside of scheduled times
    searchParams.set('force', 'true')
    
    // Create a new request with the force parameter
    const modifiedUrl = new URL(request.url)
    modifiedUrl.searchParams.set('force', 'true')
    const modifiedRequest = new NextRequest(modifiedUrl.toString())
    
    // Call the GET handler with force flag
    return GET(modifiedRequest)
  } catch (error) {
    return NextResponse.json(
      { error: 'Manual publish failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get the next valid publishing slot
 * @param currentTime - The current time
 * @returns The next publishing slot time
 */
function getNextPublishingSlot(currentTime: Date): Date {
  const VALID_HOURS = [0, 10, 12, 14, 16, 18, 20, 22]
  const currentHour = currentTime.getHours()
  
  // Find the next valid hour
  let nextHour = VALID_HOURS.find(hour => hour > currentHour)
  
  const nextSlot = new Date(currentTime)
  
  if (nextHour !== undefined) {
    // Next slot is today
    nextSlot.setHours(nextHour, 0, 0, 0)
  } else {
    // Next slot is tomorrow at the first valid hour
    nextSlot.setDate(nextSlot.getDate() + 1)
    nextSlot.setHours(VALID_HOURS[0], 0, 0, 0)
  }
  
  return nextSlot
}
