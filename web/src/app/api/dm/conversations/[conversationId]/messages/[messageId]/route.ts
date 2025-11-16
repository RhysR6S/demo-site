// Path: src/app/api/dm/conversations/[conversationId]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { supabase } from '@/lib/supabase'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string; messageId: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    const { conversationId, messageId } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, verify the conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('dm_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check access
    if (!session.user.isCreator && conversation.member_id !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the message to check ownership
    const { data: message, error: fetchError } = await supabase
      .from('dm_messages')
      .select('*')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single()

    if (fetchError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if user can delete (only sender can delete their own messages)
    if (message.sender_id !== session.user.id) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 })
    }

    // Soft delete the message
    const { error } = await supabase
      .from('dm_messages')
      .update({ 
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (error) {
      console.error('Error deleting message:', error)
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DM message DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}