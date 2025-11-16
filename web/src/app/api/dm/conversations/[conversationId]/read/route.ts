// src/app/api/dm/conversations/[conversationId]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params // Await params
  const supabase = getSupabaseAdmin()

  try {
    if (session.user.isCreator) {
      // Creator marking conversation as read
      const { error } = await supabase
        .from('dm_conversations')
        .update({ creator_last_read_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (error) {
        console.error('Error updating creator read status:', error)
        return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
      }
    } else {
      // Member marking conversation as read
      // First check if the conversation belongs to this member
      const { data: conversation, error: checkError } = await supabase
        .from('dm_conversations')
        .select('member_id')
        .eq('id', conversationId)
        .single()

      if (checkError || !conversation || conversation.member_id !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Update the last_message_at to current time as a workaround
      // since member_last_read_at column doesn't exist
      const { error } = await supabase
        .from('dm_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('member_id', session.user.id)

      if (error) {
        console.error('Error updating member read status:', error)
        return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in read endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}