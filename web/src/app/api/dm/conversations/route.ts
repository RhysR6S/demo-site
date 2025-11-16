// Path: src/app/api/dm/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET existing conversations
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  if (session.user.isCreator) {
    // Creator sees all conversations
    const { data: conversations, error } = await supabase
      .from('dm_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Check for unread messages
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const { count } = await supabase
          .from('dm_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_role', 'member')
          .gt('created_at', conv.creator_last_read_at || conv.created_at)

        return {
          ...conv,
          has_unread: (count || 0) > 0
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithUnread })
  } else {
    // Member sees only their conversation
    const { data: conversation, error } = await supabase
      .from('dm_conversations')
      .select('*')
      .eq('member_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  }
}

// POST to create new conversation (members only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.isCreator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  
  // Check if conversation already exists
  const { data: existing, error: existingError } = await supabase
    .from('dm_conversations')
    .select('*')
    .eq('member_id', session.user.id)
    .single()
    
  // If conversation exists, return it
  if (existing && !existingError) {
    return NextResponse.json({ conversation: existing })
  }
  
  // If error is not "no rows", there's a real problem
  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing conversation:', existingError)
    return NextResponse.json({ error: 'Failed to check existing conversation' }, { status: 500 })
  }
  
  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('dm_conversations')
    .insert({
      member_id: session.user.id,
      member_name: session.user.name || session.user.email?.split('@')[0] || 'Member',
      member_email: session.user.email || '',
      member_tier: session.user.membershipTier || 'bronze',
      is_pinned: false
    })
    .select()
    .single()
    
  if (error) {
    console.error('Failed to create conversation:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
  
  return NextResponse.json({ conversation })
}

// PATCH to update conversation (pin/unpin)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isCreator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId, isPinned } = await request.json()

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('dm_conversations')
    .update({ is_pinned: isPinned })
    .eq('id', conversationId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}