// Path: src/components/community/channel-view.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { PatreonTierService } from '@/lib/patreon-tiers'

interface Channel {
  id: string
  name: string
  emoji: string
  description: string | null
  min_tier: string
  allow_member_posts: boolean
}

interface ChannelMessage {
  id: string
  user_id: string
  user_name: string
  user_tier: string
  content: string
  is_pinned: boolean
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

interface CreatorProfile {
  display_name: string
  profile_picture_url: string | null
  bio: string | null
}

interface ChannelViewProps {
  channelId: string
  channel?: Channel
  isCreator: boolean
  currentUser: {
    id: string
    name: string
    tier: string
  }
}

// Cache for messages and profiles
const messageCache = new Map<string, ChannelMessage[]>()
const profileCache = new Map<string, CreatorProfile>()

export function ChannelView({ 
  channelId, 
  channel,
  isCreator,
  currentUser
}: ChannelViewProps) {
  const [messages, setMessages] = useState<ChannelMessage[]>(() => 
    messageCache.get(channelId) || []
  )
  const [newMessage, setNewMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(!messageCache.has(channelId))
  const [sending, setSending] = useState(false)
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(() => 
    profileCache.get('creator') || null
  )
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(messages.length)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load creator profile
  useEffect(() => {
    if (!creatorProfile) {
      loadCreatorProfile()
    }
  }, [creatorProfile])

  // Initial load and polling
  useEffect(() => {
    // Load messages immediately
    loadMessages(true)
    
    // Set up polling
    pollIntervalRef.current = setInterval(() => {
      loadMessages(false)
    }, 3000) // Reduced from 5s to 3s
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [channelId])

  // Auto-scroll only for new messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom()
    }
    lastMessageCountRef.current = messages.length
  }, [messages])

  const loadCreatorProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/creator/profile')
      if (response.ok) {
        const data = await response.json()
        setCreatorProfile(data.profile)
        profileCache.set('creator', data.profile)
      }
    } catch (error) {
      console.error('Failed to load creator profile:', error)
    }
  }, [])

  const loadMessages = useCallback(async (isInitial: boolean) => {
    try {
      const response = await fetch(`/api/channels/${channelId}/messages`)
      if (response.ok) {
        const data = await response.json()
        const newMessages = data.messages || []
        
        // Update cache
        messageCache.set(channelId, newMessages)
        
        // Only update state if messages have changed
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newMessages)) {
            return newMessages
          }
          return prev
        })
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      if (isInitial) {
        setInitialLoading(false)
      }
    }
  }, [channelId])

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    // Check permissions
    if (!isCreator && !channel?.allow_member_posts) {
      alert('Only the creator can post in this channel')
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: ChannelMessage = {
      id: tempId,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_tier: currentUser.tier,
      content: newMessage.trim(),
      is_pinned: false,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null
    }

    // Optimistic update
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setSending(true)

    try {
      const response = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimisticMessage.content })
      })

      if (response.ok) {
        const data = await response.json()
        // Replace temp message with real one
        setMessages(prev => {
          const updated = prev.map(msg =>
            msg.id === tempId ? data.message : msg
          )
          // Update cache with new messages
          messageCache.set(channelId, updated)
          return updated
        })
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setNewMessage(optimisticMessage.content) // Restore message
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(optimisticMessage.content) // Restore message
    } finally {
      setSending(false)
    }
  }, [newMessage, sending, currentUser, isCreator, channel, channelId, messages])

  const deleteMessage = useCallback(async (messageId: string) => {
    setDeletingMessageId(messageId)
    
    // Optimistic update
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, deleted_at: new Date().toISOString() } : msg
    ))

    try {
      const response = await fetch(`/api/channels/${channelId}/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // Revert on error
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, deleted_at: null } : msg
        ))
        alert('Failed to delete message')
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      // Revert on error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, deleted_at: null } : msg
      ))
      alert('Failed to delete message')
    } finally {
      setDeletingMessageId(null)
      setShowDeleteConfirm(null)
      setHoveredMessageId(null)
    }
  }, [channelId])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function getTierBadgeColor(tier: string) {
    const config = PatreonTierService.getTierConfig(tier)
    return config.bgColor + ' ' + config.color
  }

  function getTierGradient(tier: string) {
    const gradients = {
      bronze: 'from-amber-600 to-amber-700',
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-yellow-400 to-yellow-500',
      platinum: 'from-purple-400 to-purple-500'
    }
    return gradients[tier.toLowerCase() as keyof typeof gradients] || gradients.bronze
  }

  // Check if messages should be stacked (same sender as previous)
  function shouldStackMessage(index: number): boolean {
    if (index === 0) return false
    return messages[index].user_id === messages[index - 1].user_id && !messages[index - 1].deleted_at
  }

  // Check if user is creator based on their ID
  function isUserCreator(userId: string): boolean {
    // You might need to adjust this logic based on how you identify creators
    return isCreator && userId === currentUser.id
  }

  // Check if user can delete this message
  function canDeleteMessage(message: ChannelMessage): boolean {
    if (message.deleted_at) return false
    // Creator can delete any message
    if (isCreator) return true
    // Users can only delete their own messages
    return message.user_id === currentUser.id
  }

  // Get creator display name
  const creatorDisplayName = creatorProfile?.display_name || 'Creator'

  // Can user post in this channel?
  const canPost = isCreator || channel?.allow_member_posts

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Enhanced Header with Glass Effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 via-purple-600/20 to-pink-600/20 blur-xl"></div>
        <div className="relative backdrop-blur-xl bg-black/40 border-b border-white/10">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Enhanced Channel Icon */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-600 to-purple-600 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 p-0.5">
                    <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                      <span className="text-3xl filter drop-shadow-md">{channel?.emoji || '💬'}</span>
                    </div>
                  </div>
                  {/* Activity Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                </div>
                
                {/* Channel Info */}
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center gap-2">
                    {channel?.name || 'Channel'}
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getTierBadgeColor(channel?.min_tier || 'bronze')} backdrop-blur-sm`}>
                      {channel?.min_tier || 'bronze'}+
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {messages.length} messages • {channel?.description || 'Channel conversation'}
                  </p>
                </div>
              </div>
              
              {/* Channel Settings & Status */}
              <div className="flex items-center gap-3">
                {!channel?.allow_member_posts && !isCreator && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-300 font-medium">Creator Only</span>
                  </div>
                )}
                <button className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area with Enhanced Styling */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1 bg-gradient-to-b from-black via-zinc-900/50 to-black scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 transition-colors"
      >
        {initialLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-white/10 rounded-full animate-spin border-t-sky-500"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-spin border-t-purple-600 animation-delay-150"></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-sky-600/20 to-purple-600/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5V3a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-white mb-2">No messages yet</p>
              <p className="text-gray-400">
                {canPost ? 'Be the first to post!' : 'Waiting for creator to post...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Enhanced Pinned Messages */}
            {messages.filter(m => m.is_pinned && !m.deleted_at).length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 backdrop-blur-sm rounded-full border border-yellow-500/20">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                    <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Pinned Messages</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                </div>
                
                <div className="space-y-3">
                  {messages.filter(m => m.is_pinned && !m.deleted_at).map(message => {
                    const isCreatorMessage = isUserCreator(message.user_id)
                    const displayName = isCreatorMessage && creatorProfile?.display_name ? creatorProfile.display_name : message.user_name
                    const canDelete = canDeleteMessage(message)

                    return (
                      <div 
                        key={message.id} 
                        className="relative group p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/20"
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => {
                          if (showDeleteConfirm !== message.id) {
                            setHoveredMessageId(null)
                          }
                        }}
                      >
                        {/* Delete Confirmation for Pinned */}
                        {showDeleteConfirm === message.id && (
                          <div className="absolute top-0 right-0 z-10 mt-14">
                            <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 space-y-3 backdrop-blur-xl">
                              <p className="text-sm text-gray-300 font-medium">Delete this pinned message?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => deleteMessage(message.id)}
                                  disabled={deletingMessageId === message.id}
                                  className="px-4 py-2 text-sm bg-sky-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                                >
                                  {deletingMessageId === message.id ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-200">{displayName}</span>
                              {isCreatorMessage && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-cyan-400 font-medium">
                                  Creator
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-100">{message.content}</p>
                          </div>
                          {/* Delete Button for Pinned */}
                          {canDelete && hoveredMessageId === message.id && !showDeleteConfirm && (
                            <button
                              onClick={() => setShowDeleteConfirm(message.id)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                              title="Delete message"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Regular Messages */}
            {messages.map((message, index) => {
              if (message.is_pinned && !message.deleted_at) return null // Already shown above

              const isOwnMessage = message.user_id === currentUser.id
              const shouldStack = shouldStackMessage(index)
              const isCreatorMessage = isUserCreator(message.user_id)
              const displayName = isCreatorMessage && creatorProfile?.display_name ? creatorProfile.display_name : message.user_name
              const canDelete = canDeleteMessage(message)

              return (
                <div 
                  key={message.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${shouldStack ? '' : 'mt-6'} relative group`}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => {
                    if (showDeleteConfirm !== message.id) {
                      setHoveredMessageId(null)
                    }
                  }}
                >
                  {/* Delete Confirmation Popup */}
                  {showDeleteConfirm === message.id && (
                    <div className="absolute top-0 right-0 z-10 mt-10">
                      <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 space-y-3 backdrop-blur-xl">
                        <p className="text-sm text-gray-300 font-medium">Delete this message?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteMessage(message.id)}
                            disabled={deletingMessageId === message.id}
                            className="px-4 py-2 text-sm bg-sky-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                          >
                            {deletingMessageId === message.id ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`flex gap-3 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    {/* Profile Picture */}
                    {!shouldStack && (
                      <div className="flex-shrink-0 mt-auto">
                        <div className="relative group">
                          <div className={`absolute -inset-0.5 bg-gradient-to-r ${
                            isCreatorMessage
                              ? 'from-sky-600 to-purple-600' 
                              : getTierGradient(message.user_tier || 'bronze')
                          } rounded-full opacity-0 group-hover:opacity-75 blur transition duration-200`}></div>
                          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br p-0.5">
                            {isCreatorMessage && creatorProfile?.profile_picture_url ? (
                              <img
                                src={creatorProfile.profile_picture_url}
                                alt={displayName}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full rounded-full bg-gradient-to-br ${
                              isCreatorMessage
                                ? 'from-sky-500 to-purple-600' 
                                : getTierGradient(message.user_tier || 'bronze')
                            } flex items-center justify-center text-white font-semibold text-sm ${
                              isCreatorMessage && creatorProfile?.profile_picture_url ? 'hidden' : ''
                            }`}>
                              {displayName[0]?.toUpperCase() || '?'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${shouldStack ? (isOwnMessage ? 'mr-[52px]' : 'ml-[52px]') : ''} relative`}>
                      {/* Name, Tier Badge, and Timestamp */}
                      {!shouldStack && (
                        <div className={`flex items-center gap-2 mb-1 px-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <span className="text-sm font-semibold text-gray-200">{displayName}</span>
                          {!isCreatorMessage && (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getTierBadgeColor(message.user_tier)} backdrop-blur-sm`}>
                              {message.user_tier}
                            </span>
                          )}
                          {isCreatorMessage && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-sky-600/20 to-purple-600/20 text-cyan-400 font-medium backdrop-blur-sm border border-cyan-500/20">
                              Creator
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      {/* Message Bubble with Delete Button */}
                      <div className="relative group/message">
                        {message.deleted_at ? (
                          <div className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                            <p className="text-sm text-gray-500 italic">This message was deleted</p>
                          </div>
                        ) : (
                          <>
                            <div className={`relative px-5 py-3 rounded-2xl transition-all ${
                              isOwnMessage 
                                ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-lg shadow-sky-600/20' 
                                : isCreatorMessage
                                ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-gray-100 backdrop-blur-sm border border-cyan-500/20'
                                : 'bg-white/10 backdrop-blur-sm text-gray-100 border border-white/10'
                            } ${message.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                              <p className="text-sm leading-relaxed break-words">{message.content}</p>
                              {message.edited_at && (
                                <p className="text-xs mt-1 opacity-60">(edited)</p>
                              )}
                            </div>
                            
                            {/* Delete Button */}
                            {canDelete && hoveredMessageId === message.id && !showDeleteConfirm && !message.id.startsWith('temp-') && (
                              <button
                                onClick={() => setShowDeleteConfirm(message.id)}
                                className={`absolute top-1/2 -translate-y-1/2 ${isOwnMessage ? '-left-10' : '-right-10'} p-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-all opacity-0 group-hover/message:opacity-100 backdrop-blur-sm`}
                                title="Delete message"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Enhanced Message Input */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/10 via-purple-600/10 to-pink-600/10 blur-xl"></div>
        <div className="relative backdrop-blur-xl bg-black/40 border-t border-white/10">
          <div className="p-4">
            {canPost ? (
              <form onSubmit={sendMessage} className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-6 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent transition-all"
                    disabled={sending}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-8 py-4 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-2xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 hover:shadow-xl hover:shadow-sky-600/30 transform hover:scale-105 active:scale-95"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/20 rounded-full animate-spin border-t-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-4 px-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-gray-300 font-medium">
                    Only the creator can post in this channel
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}