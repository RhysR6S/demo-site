// Path: src/app/api/channels/[channelId]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { supabase } from '@/lib/supabase'
import { checkChannelAccess } from '@/middleware/tier-access'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ channelId: string; messageId: string }> }) {
    const { channelId, messageId } = await params

  try {
    // Check channel access
    const accessCheck = await checkChannelAccess(request, channelId)
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)

    // Get the message to check ownership
    const { data: message, error: fetchError } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('id', messageId)
      .eq('channel_id', channelId)
      .single()

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check if user can delete (creators can delete any, users only their own)
    if (!session!.user.isCreator && message.user_id !== session!.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      )
    }

    // Soft delete the message
    const { error } = await supabase
      .from('channel_messages')
      .update({ 
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in channel message DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}