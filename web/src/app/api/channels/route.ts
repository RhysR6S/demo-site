// Path: src/app/api/channels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'
import { PatreonTierService } from '@/lib/patreon-tiers'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userTier = session.user.membershipTier || 'bronze'
    const isCreator = session.user.isCreator

    // Fetch available tiers from Patreon if creator has access token
    let availableTiers: any[] = []
    if (isCreator) {
      // Get the JWT token which contains the access token
      const token = await getToken({ req: request })
      if (token?.accessToken) {
        availableTiers = await PatreonTierService.fetchTiers(token.accessToken as string)
      }
    }

    // Use admin client to bypass RLS for reading
    const supabase = getSupabaseAdmin()

    // Fetch all channels
    const { data: allChannels, error } = await supabase
      .from('channels')
      .select('*')
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching channels:', error)
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }

    // Filter channels based on user's tier access
    let channels = allChannels || []
    
    if (!isCreator) {
      // Use PatreonTierService to check access
      channels = channels.filter(channel => 
        PatreonTierService.hasAccessToTier(userTier, channel.min_tier, availableTiers)
      )
    }

    // Get unread counts for accessible channels
    const channelIds = channels.map(c => c.id)
    
    if (channelIds.length > 0) {
      const { data: readStatus } = await supabase
        .from('channel_read_status')
        .select('channel_id, last_read_at')
        .eq('user_id', session.user.id)
        .in('channel_id', channelIds)

      // Get latest message timestamp for each channel
      const { data: latestMessages } = await supabase
        .from('channel_messages')
        .select('channel_id, created_at')
        .in('channel_id', channelIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Create a map of channel read status
      const readStatusMap = new Map(
        (readStatus || []).map(rs => [rs.channel_id, rs.last_read_at])
      )

      // Group latest messages by channel
      const latestMessageMap = new Map<string, string>()
      latestMessages?.forEach(msg => {
        if (!latestMessageMap.has(msg.channel_id) || 
            msg.created_at > latestMessageMap.get(msg.channel_id)!) {
          latestMessageMap.set(msg.channel_id, msg.created_at)
        }
      })

      // Add unread status to channels
      channels = channels.map(channel => ({
        ...channel,
        has_unread: latestMessageMap.has(channel.id) && 
          (!readStatusMap.has(channel.id) || 
           latestMessageMap.get(channel.id)! > readStatusMap.get(channel.id)!),
        latest_message_at: latestMessageMap.get(channel.id) || null
      }))
    }

    return NextResponse.json({ 
      channels,
      availableTiers: isCreator ? availableTiers : undefined
    })
  } catch (error) {
    console.error('Error in channels GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Only creators can create channels' }, { status: 403 })
    }

    const body = await request.json()
    const { name, emoji, description, min_tier, allow_member_posts, position } = body

    if (!name || !min_tier) {
      return NextResponse.json({ error: 'Name and minimum tier are required' }, { status: 400 })
    }

    // Validate tier exists if we have Patreon data
    const token = await getToken({ req: request })
    if (token?.accessToken) {
      const availableTiers = await PatreonTierService.fetchTiers(token.accessToken as string)
      if (availableTiers.length > 0) {
        const tierExists = availableTiers.some(t => 
          t.title.toLowerCase() === min_tier.toLowerCase() ||
          t.id === min_tier
        )
        if (!tierExists) {
          return NextResponse.json({ 
            error: 'Invalid tier selected',
            availableTiers: availableTiers.map(t => t.title)
          }, { status: 400 })
        }
      }
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin()

    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        name,
        emoji: emoji || '💬',
        description,
        min_tier: min_tier.toLowerCase(), // Store lowercase for consistency
        allow_member_posts: allow_member_posts ?? true,
        position: position ?? 999,
        created_by: session.user.id,
        is_default: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating channel:', error)
      return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
    }

    return NextResponse.json({ channel })
  } catch (error) {
    console.error('Error in channels POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Only creators can update channels' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, emoji, description, min_tier, allow_member_posts, position } = body

    if (!id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin()

    // Check if channel exists and is not the default channel
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('is_default')
      .eq('id', id)
      .single()

    if (existingChannel?.is_default) {
      return NextResponse.json({ error: 'Cannot modify default channel' }, { status: 403 })
    }

    // Validate tier if updating min_tier
    if (min_tier) {
      const token = await getToken({ req: request })
      if (token?.accessToken) {
        const availableTiers = await PatreonTierService.fetchTiers(token.accessToken as string)
        if (availableTiers.length > 0) {
          const tierExists = availableTiers.some(t => 
            t.title.toLowerCase() === min_tier.toLowerCase() ||
            t.id === min_tier
          )
          if (!tierExists) {
            return NextResponse.json({ 
              error: 'Invalid tier selected',
              availableTiers: availableTiers.map(t => t.title)
            }, { status: 400 })
          }
        }
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (emoji !== undefined) updateData.emoji = emoji
    if (description !== undefined) updateData.description = description
    if (min_tier !== undefined) updateData.min_tier = min_tier.toLowerCase()
    if (allow_member_posts !== undefined) updateData.allow_member_posts = allow_member_posts
    if (position !== undefined) updateData.position = position

    const { data: channel, error } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating channel:', error)
      return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
    }

    return NextResponse.json({ channel })
  } catch (error) {
    console.error('Error in channels PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Only creators can delete channels' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin()

    // Check if channel exists and is not the default channel
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('is_default')
      .eq('id', id)
      .single()

    if (existingChannel?.is_default) {
      return NextResponse.json({ error: 'Cannot delete default channel' }, { status: 403 })
    }

    // Soft delete the channel
    const { error } = await supabase
      .from('channels')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting channel:', error)
      return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in channels DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
