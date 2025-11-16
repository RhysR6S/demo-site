// src/app/api/admin/publish-scheduled/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/admin/publish-scheduled - Check and publish scheduled content
 * Can be called by cron job or manually
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
    // Get current UTC time
    const now = new Date().toISOString()
    
    // Find all scheduled posts that should be published
    const { data: scheduledPosts, error } = await supabase
      .from('content_sets')
      .select('id, title, scheduled_time')
      .is('published_at', null)
      .not('scheduled_time', 'is', null)
      .lte('scheduled_time', now)
    
    if (error) {
      console.error('[Publish Scheduled] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled posts' },
        { status: 500 }
      )
    }
    
    const publishedCount = scheduledPosts?.length || 0
    const results = []
    
    // Publish each scheduled post
    for (const post of scheduledPosts || []) {
      const { error: updateError } = await supabase
        .from('content_sets')
        .update({ 
          published_at: now,
          // DON'T clear scheduled_time - keep it for reference
          // This allows the gallery to show posts where scheduled_time <= now
        })
        .eq('id', post.id)
      
      if (updateError) {
        console.error(`[Publish Scheduled] Failed to publish ${post.id}:`, updateError)
        results.push({ id: post.id, title: post.title, success: false, error: updateError.message })
      } else {
        console.log(`[Publish Scheduled] Published: ${post.title} (${post.id})`)
        results.push({ id: post.id, title: post.title, success: true })
        
        // Update studio_schedule status if you're using it
        await supabase
          .from('studio_schedule')
          .update({ 
            status: 'posted',
            patreon_posted_at: now 
          })
          .eq('set_id', post.id)
      }
    }
    
    return NextResponse.json({
      message: `Checked for scheduled posts. Published: ${results.filter(r => r.success).length}/${publishedCount}`,
      publishedCount: results.filter(r => r.success).length,
      results
    })
  } catch (error) {
    console.error('[Publish Scheduled] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}