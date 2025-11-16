// src/app/api/user/recent-activity/route.ts
// src/app/api/user/recent-activity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const supabase = getSupabaseAdmin()
    const activities = []

    // Get unread DM messages
    const { data: unreadDMs } = await supabase
      .from('dm_messages')
      .select(`
        id,
        content,
        created_at,
        conversation_id,
        sender_name,
        dm_conversations!conversation_id(
          member_id,
          creator_last_read_at,
          member_last_read_at
        )
      `)
      .eq('sender_role', token.isCreator ? 'member' : 'creator')
      .order('created_at', { ascending: false })
      .limit(5)

    if (unreadDMs) {
      for (const dm of unreadDMs) {
        const conversation = dm.dm_conversations as any
        const lastReadAt = token.isCreator 
          ? conversation?.creator_last_read_at
          : conversation?.member_last_read_at

        if (!lastReadAt || new Date(dm.created_at) > new Date(lastReadAt)) {
          activities.push({
            id: dm.id,
            type: 'message',
            content: `New message from ${dm.sender_name}`,
            timestamp: dm.created_at,
            link: '/community/dms'
          })
        }
      }
    }

    // Get new content sets from last 7 days
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { data: newSets } = await supabase
      .from('content_sets')
      .select('id, title, slug, published_at')
      .not('published_at', 'is', null)
      .gte('published_at', weekAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(5)

    if (newSets) {
      for (const set of newSets) {
        activities.push({
          id: set.id,
          type: 'new_content',
          content: `New set: ${set.title}`,
          timestamp: set.published_at || new Date().toISOString(),
          link: `/sets/${set.slug}`
        })
      }
    }

    // Sort by timestamp and limit to 5 most recent
    activities.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime()
      const dateB = new Date(b.timestamp || 0).getTime()
      return dateB - dateA
    })
    
    const recentActivities = activities.slice(0, 5)

    console.log('API returning activities:', recentActivities) // Debug

    return NextResponse.json({ activities: recentActivities })
  } catch (error) {
    console.error('Recent activity API error:', error)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}