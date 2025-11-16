// src/app/api/dm/conversations/[conversationId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params
  const supabase = getSupabaseAdmin()
  const isCreator = session.user.isCreator

  // Check conversation access
  const { data: conversation, error: convError } = await supabase
    .from('dm_conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Verify access
  if (!isCreator && conversation.member_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch messages
  const { data: messages, error } = await supabase
    .from('dm_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  return NextResponse.json({ messages: messages || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params
  const { content } = await request.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const isCreator = session.user.isCreator

  // Check conversation access
  const { data: conversation, error: convError } = await supabase
    .from('dm_conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Verify access
  if (!isCreator && conversation.member_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get sender name
  let senderName = session.user.name || 'User'
  
  if (isCreator) {
    // Get creator profile for display name
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('display_name')
      .single()
    
    if (profile?.display_name) {
      senderName = profile.display_name
    }
  }

  // Create message
  const { data: message, error } = await supabase
    .from('dm_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      sender_name: senderName,
      sender_role: isCreator ? 'creator' : 'member',
      content: content.trim()
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  // Update conversation last_message_at
  await supabase
    .from('dm_conversations')
    .update({
      last_message_at: message.created_at
    })
    .eq('id', conversationId)

  // Update read status for the sender
  if (isCreator) {
    await supabase
      .from('dm_conversations')
      .update({
        creator_last_read_at: new Date().toISOString()
      })
      .eq('id', conversationId)
  } else {
    await supabase
      .from('dm_conversations')
      .update({
        member_last_read_at: new Date().toISOString()
      })
      .eq('id', conversationId)
  }

  return NextResponse.json({ message })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params
  const { messageId } = await request.json()

  if (!messageId) {
    return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Verify message ownership
  const { data: message, error: msgError } = await supabase
    .from('dm_messages')
    .select('*')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .single()

  if (msgError || !message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  if (message.sender_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Soft delete the message
  const { error } = await supabase
    .from('dm_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}