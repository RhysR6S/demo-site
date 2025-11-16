// src/app/api/community/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id
  const now = new Date().toISOString()

  try {
    // Mark all channels as read
    const { data: channels } = await supabase
      .from('channels')
      .select('id')
      .is('deleted_at', null)

    if (channels) {
      for (const channel of channels) {
        await supabase
          .from('channel_read_status')
          .upsert({
            user_id: userId,
            channel_id: channel.id,
            last_read_at: now
          }, {
            onConflict: 'user_id,channel_id'
          })
      }
    }

    // Mark DMs as read
    if (session.user.isCreator) {
      // Creator: mark all conversations as read
      await supabase
        .from('dm_conversations')
        .update({ creator_last_read_at: now })
    } else {
      // Member: update their conversation
      const { data: conversation } = await supabase
        .from('dm_conversations')
        .select('id')
        .eq('member_id', userId)
        .single()

      if (conversation) {
        await supabase
          .from('dm_conversations')
          .update({ member_last_read_at: now })
          .eq('id', conversation.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking all as read:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}