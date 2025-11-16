// File: src/app/api/creator/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

// Type definitions for Supabase responses
interface ContentLike {
  id: string
  created_at: string
  user_name: string
  set_id: string
  content_sets: {
    id: string
    title: string
    slug: string
  } | {
    id: string
    title: string
    slug: string
  }[]
}

interface ContentComment {
  id: string
  created_at: string
  user_name: string
  comment: string
  set_id: string
  content_sets: {
    id: string
    title: string
    slug: string
  } | {
    id: string
    title: string
    slug: string
  }[]
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Only creators can access notifications
  if (!session?.user?.isCreator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const notifications = []
  
  try {
    // Get time ranges for recent activity
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 1. Fetch recent likes on posts
    const { data: recentLikes, error: likesError } = await supabase
      .from('content_likes')
      .select(`
        id,
        created_at,
        user_name,
        set_id,
        content_sets!inner(id, title, slug)
      `)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50) as { data: ContentLike[] | null, error: any }

    if (likesError) {
      console.error('Error fetching likes:', likesError)
    }

    if (recentLikes && recentLikes.length > 0) {
      // Group likes by content set
      const likesBySet = new Map<string, any[]>()
      
      recentLikes.forEach((like: ContentLike) => {
        const setId = like.set_id
        if (!likesBySet.has(setId)) {
          likesBySet.set(setId, [])
        }
        likesBySet.get(setId)!.push(like)
      })

      // Create notifications for grouped likes
      likesBySet.forEach((likes, setId) => {
        const firstLike = likes[0]
        const additionalCount = likes.length - 1
        
        // Handle both single object and array response from Supabase
        const contentSet = Array.isArray(firstLike.content_sets) 
          ? firstLike.content_sets[0] 
          : firstLike.content_sets
          
        if (contentSet) {
          notifications.push({
            id: `like-${setId}-${firstLike.created_at}`,
            type: 'like',
            title: 'New Likes',
            description: '',
            link: `/sets/${contentSet.slug}`,
            created_at: firstLike.created_at,
            read: false,
            metadata: {
              userNames: [firstLike.user_name],
              postTitle: contentSet.title,
              additionalCount
            }
          })
        }
      })
    }

    // 2. Fetch recent comments
    const { data: recentComments, error: commentsError } = await supabase
      .from('content_comments')
      .select(`
        id,
        created_at,
        user_name,
        comment,
        set_id,
        content_sets!inner(id, title, slug)
      `)
      .eq('is_deleted', false)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20) as { data: ContentComment[] | null, error: any }

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
    }

    if (recentComments) {
      recentComments.forEach((comment: ContentComment) => {
        // Handle both single object and array response from Supabase
        const contentSet = Array.isArray(comment.content_sets) 
          ? comment.content_sets[0] 
          : comment.content_sets
          
        if (contentSet) {
          notifications.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            title: 'New Comment',
            description: '',
            link: `/sets/${contentSet.slug}#comments`,
            created_at: comment.created_at,
            read: false,
            metadata: {
              userName: comment.user_name,
              postTitle: contentSet.title
            }
          })
        }
      })
    }

    // 3. Fetch new members (users who joined recently)
    const { data: newMembers, error: membersError } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .gte('created_at', oneWeekAgo.toISOString())
      .eq('is_creator', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (membersError) {
      console.error('Error fetching new members:', membersError)
    }

    if (newMembers) {
      newMembers.forEach(member => {
        notifications.push({
          id: `member-${member.id}`,
          type: 'new_member',
          title: 'New Member',
          description: '',
          created_at: member.created_at,
          read: false,
          metadata: {
            userName: member.name || member.email?.split('@')[0] || 'Anonymous'
          }
        })
      })
    }

    // 4. Fetch new commissions
    const { data: newCommissions, error: commissionsError } = await supabase
      .from('commissions')
      .select(`
        id,
        created_at,
        status,
        user_name,
        user_email
      `)
      .in('status', ['pending', 'in_progress'])
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (commissionsError) {
      console.error('Error fetching commissions:', commissionsError)
    }

    if (newCommissions) {
      newCommissions.forEach(commission => {
        notifications.push({
          id: `commission-${commission.id}`,
          type: 'commission',
          title: 'New Commission',
          description: '',
          link: '/admin/commissions',
          created_at: commission.created_at,
          read: false,
          metadata: {
            userName: commission.user_name || commission.user_email?.split('@')[0] || 'Anonymous'
          }
        })
      })
    }

    // 5. OPTIMIZED: Fetch unread DMs (replaced N+1 with single query)
    // Old: 10 conversations = 11 queries (1 fetch + 10 checks)
    // New: 10 conversations = 2 queries (1 fetch + 1 unread batch)
    const { data: unreadConversations, error: dmsError } = await supabase
      .from('dm_conversations')
      .select(`
        id,
        member_name,
        created_at,
        last_message_at,
        creator_last_read_at
      `)
      .order('last_message_at', { ascending: false })
      .limit(10)

    if (dmsError) {
      console.error('Error fetching DM conversations:', dmsError)
    }

    if (unreadConversations && unreadConversations.length > 0) {
      // Build conditions for batch query
      const conversationConditions = unreadConversations
        .map(conv => {
          const lastRead = conv.creator_last_read_at || conv.created_at
          return {
            conversation_id: conv.id,
            last_read: lastRead
          }
        })

      // Fetch latest unread message for each conversation in ONE query
      const conversationIds = unreadConversations.map(c => c.id)
      const { data: unreadMessages } = await supabase
        .from('dm_messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .eq('sender_role', 'member')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (unreadMessages) {
        // Group messages by conversation and filter by last_read
        const messagesByConversation = new Map<string, any>()

        for (const msg of unreadMessages) {
          if (!messagesByConversation.has(msg.conversation_id)) {
            const conv = unreadConversations.find(c => c.id === msg.conversation_id)
            const lastRead = conv?.creator_last_read_at || conv?.created_at

            // Only add if message is after last read
            if (lastRead && new Date(msg.created_at) > new Date(lastRead)) {
              messagesByConversation.set(msg.conversation_id, msg)
            }
          }
        }

        // Create notifications from unread messages
        for (const conversation of unreadConversations) {
          const unreadMessage = messagesByConversation.get(conversation.id)
          if (unreadMessage) {
            notifications.push({
              id: `dm-${conversation.id}-${unreadMessage.created_at}`,
              type: 'dm',
              title: 'New Message',
              description: '',
              link: `/community/dms?id=${conversation.id}`,
              created_at: unreadMessage.created_at,
              read: false,
              metadata: {
                userName: conversation.member_name
              }
            })
          }
        }
      }
    }

    // Sort all notifications by created_at
    notifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Get unread count (notifications from last 24 hours)
    const unreadCount = notifications.filter(n => 
      new Date(n.created_at).getTime() > oneDayAgo.getTime()
    ).length

    return NextResponse.json({
      notifications: notifications.slice(0, 50), // Limit to 50 most recent
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ 
      notifications: [], 
      unreadCount: 0 
    })
  }
}