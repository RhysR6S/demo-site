// src/app/api/channels/[channelId]/messages/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getCreatorProfile } from '@/lib/creator-profile'

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    
    // Get channel messages
    const { data: messages, error } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Error in messages GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = await params
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Ensure user exists in database (for demo mode compatibility)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (!existingUser) {
      // Create user if they don't exist
      await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email || 'demo@example.com',
          name: session.user.name || 'Demo User',
          membership_tier: session.user.membershipTier || 'bronze',
          is_creator: session.user.isCreator || false
        })
    }

    // Get channel to check permissions
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Check if user can post
    const isCreator = session.user.isCreator
    if (!isCreator && !channel.allow_member_posts) {
      return NextResponse.json({ error: 'Only the creator can post in this channel' }, { status: 403 })
    }

    // Check if user has access to this channel
    const userTier = session.user.membershipTier || 'bronze'
    const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4, creator: 5 }
    
    if (!isCreator && tierOrder[userTier as keyof typeof tierOrder] < tierOrder[channel.min_tier as keyof typeof tierOrder]) {
      return NextResponse.json({ error: 'Insufficient tier for this channel' }, { status: 403 })
    }

    // Get display name - use creator profile if user is creator
    let displayName = session.user.name
    if (isCreator) {
      const creatorProfile = await getCreatorProfile(session.user.id)
      displayName = creatorProfile.display_name
    }

    // Create the message with the correct display name
    const { data: message, error: messageError } = await supabase
      .from('channel_messages')
      .insert({
        channel_id: channelId,
        user_id: session.user.id,
        user_name: displayName, // Use the correct display name
        user_tier: session.user.membershipTier || 'bronze',
        content: content.trim()
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update channel read status
    await supabase
      .from('channel_read_status')
      .upsert({
        user_id: session.user.id,
        channel_id: channelId,
        last_read_at: new Date().toISOString()
      })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error in message POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}