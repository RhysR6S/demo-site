// Path: src/app/api/dm/conversations/[conversationId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    const { conversationId } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the conversation
    const { data: conversation, error } = await supabase
      .from('dm_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check access: creators can see all, members only their own
    if (!session.user.isCreator && conversation.member_id !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Remove email from response for security
    conversation.member_email = undefined

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in conversation GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    const { conversationId } = await params
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Only creators can delete conversations' }, { status: 403 })
    }

    // Delete all messages in the conversation first
    await supabase
      .from('dm_messages')
      .delete()
      .eq('conversation_id', conversationId)

    // Then delete the conversation
    const { error } = await supabase
      .from('dm_conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      console.error('Error deleting conversation:', error)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in conversation DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}