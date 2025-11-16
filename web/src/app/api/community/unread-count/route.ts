// src/app/api/community/unread-count/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  try {
    // OPTIMIZED: Use database functions to count unread in single query each
    // Replaces N+1 pattern (50+ queries) with 2-3 queries total
    let dmUnread = 0
    let channelUnread = 0

    if (session.user.isCreator) {
      // Creator: count unread DMs from all members
      const { data: dmCount, error: dmError } = await supabase
        .rpc('count_creator_unread_dms')

      if (dmError) {
        console.error('[Unread Count] Error counting creator DMs:', dmError)
      } else {
        dmUnread = dmCount || 0
      }
    } else {
      // Member: count unread DMs from creator
      const { data: dmCount, error: dmError } = await supabase
        .rpc('count_member_unread_dms', { p_user_id: userId })

      if (dmError) {
        console.error('[Unread Count] Error counting member DMs:', dmError)
      } else {
        dmUnread = dmCount || 0
      }
    }

    // Count unread channel messages
    const { data: channelCount, error: channelError } = await supabase
      .rpc('count_user_unread_channels', { p_user_id: userId })

    if (channelError) {
      console.error('[Unread Count] Error counting channels:', channelError)
    } else {
      channelUnread = channelCount || 0
    }

    const totalUnread = dmUnread + channelUnread

    return NextResponse.json({ unreadCount: totalUnread })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ unreadCount: 0 })
  }
}