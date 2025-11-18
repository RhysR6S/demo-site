// Path: src/components/community/dm-view.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { PatreonTierService } from '@/lib/patreon-tiers'

interface DMConversation {
  id: string
  member_id: string
  member_name: string
  member_email: string
  member_tier: string
  last_message_at: string | null
  is_pinned: boolean
}

interface DMMessage {
  id: string
  sender_id: string
  sender_name: string
  sender_role: 'member' | 'creator'
  content: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

interface CreatorProfile {
  display_name: string
  profile_picture_url: string | null
  bio: string | null
}

interface DMViewProps {
  conversationId: string
  conversation?: DMConversation
  isCreator: boolean
  currentUser: {
    id: string
    name: string
    tier: string
  }
}

// Cache for messages and profiles
const messageCache = new Map<string, DMMessage[]>()
const profileCache = new Map<string, CreatorProfile>()

export function DMView({ 
  conversationId, 
  conversation,
  isCreator,
  currentUser
}: DMViewProps) {
  const [messages, setMessages] = useState<DMMessage[]>(() => 
    messageCache.get(conversationId) || []
  )
  const [newMessage, setNewMessage] = useState('')
  const [initialLoading, setInitialLoading] = useState(!messageCache.has(conversationId))
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

  // Get tier styling dynamically
  const getTierGradient = (tierName: string) => {
    const gradients = {
      bronze: 'from-orange-600 to-orange-700',
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-yellow-500 to-yellow-600',
      platinum: 'from-purple-400 to-purple-500'
    }
    return gradients[tierName.toLowerCase() as keyof typeof gradients] || gradients.bronze
  }

  // Polling for new messages
  const pollForMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/dm/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        messageCache.set(conversationId, data.messages || [])
      }
    } catch (error) {
      console.error('Failed to poll messages:', error)
    }
  }, [conversationId])

  // Start polling when component mounts
  useEffect(() => {
    // Initial load
    loadMessages()
    
    // Set up polling
    pollIntervalRef.current = setInterval(pollForMessages, 3000)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [conversationId, pollForMessages])

  // Load messages
  async function loadMessages() {
    try {
      const response = await fetch(`/api/dm/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        messageCache.set(conversationId, data.messages || [])
        
        // Mark as read if member
        if (!isCreator) {
          markAsRead()
        }

        await markAsRead()
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  // Load creator profile
  useEffect(() => {
    if (!profileCache.has('creator')) {
      fetch('/api/creator/profile')
        .then(res => res.json())
        .then(data => {
          if (data.profile) {
            setCreatorProfile(data.profile)
            profileCache.set('creator', data.profile)
          }
        })
        .catch(console.error)
    }
  }, [])

  // Mark conversation as read
  async function markAsRead() {
    try {
      await fetch(`/api/dm/conversations/${conversationId}/read`, {
        method: 'POST'
      })
      window.dispatchEvent(new Event('refresh-badges'))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length !== lastMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      lastMessageCountRef.current = messages.length
    }
  }, [messages])

  // Send message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const tempId = `temp-${Date.now()}`
    const tempMessage: DMMessage = {
      id: tempId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: isCreator ? 'creator' : 'member',
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null
    }

    // Optimistic update
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    setSending(true)

    try {
      const response = await fetch(`/api/dm/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tempMessage.content })
      })

      if (response.ok) {
        const data = await response.json()
        // Replace temp message with real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? data.message : msg
        ))
        // Update cache
        messageCache.set(conversationId, messages)
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setNewMessage(tempMessage.content)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(tempMessage.content)
    } finally {
      setSending(false)
    }
  }

  // Delete message
  async function handleDeleteMessage(messageId: string) {
    setDeletingMessageId(messageId)
    
    try {
      const response = await fetch(`/api/dm/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Update message to show as deleted
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, deleted_at: new Date().toISOString() } : msg
        ))
        // Update cache
        messageCache.set(conversationId, messages)
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
    } finally {
      setDeletingMessageId(null)
      setShowDeleteConfirm(null)
    }
  }

  // Pin/unpin conversation
  async function handlePinConversation(isPinned: boolean) {
    try {
      const response = await fetch('/api/dm/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, isPinned })
      })

      if (response.ok) {
        // Refresh parent component
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to pin/unpin conversation:', error)
    }
  }

  // Check if message should stack
  function shouldStackMessage(index: number): boolean {
    if (index === 0) return false
    const currentMsg = messages[index]
    const prevMsg = messages[index - 1]
    
    // Stack if same sender and within 5 minutes
    if (currentMsg.sender_id === prevMsg.sender_id) {
      const currentTime = new Date(currentMsg.created_at).getTime()
      const prevTime = new Date(prevMsg.created_at).getTime()
      return (currentTime - prevTime) < 5 * 60 * 1000
    }
    
    return false
  }

  // Check if user can delete message
  function canDeleteMessage(message: DMMessage): boolean {
    if (message.deleted_at) return false
    return message.sender_id === currentUser.id
  }

  // Get display name for creator
  const creatorDisplayName = creatorProfile?.display_name || 'Creator'

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with Glassmorphism Effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/10 to-purple-600/10 backdrop-blur-2xl" />
        <div className="relative border-b border-white/5">
          <div className="p-6">
            <div className="flex items-center justify-between">
              {/* Member Info with Enhanced Styling */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute -inset-1 bg-gradient-to-r ${
                    isCreator ? getTierGradient(conversation?.member_tier || 'bronze') : 'from-sky-600 to-purple-600'
                  } rounded-full opacity-75 blur`}></div>
                  <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${
                    isCreator ? getTierGradient(conversation?.member_tier || 'bronze') : 'from-sky-500 to-purple-600'
                  } flex items-center justify-center shadow-xl`}>
                    <span className="text-white font-bold text-xl">
                      {isCreator ? (conversation?.member_name?.[0]?.toUpperCase() || '?') : (creatorDisplayName[0]?.toUpperCase() || 'C')}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isCreator ? conversation?.member_name : creatorDisplayName}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {isCreator ? 'Member conversation' : 'Direct message'}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              {isCreator && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePinConversation(!conversation?.is_pinned)}
                    className={`p-3 rounded-xl transition-all backdrop-blur-sm ${
                      conversation?.is_pinned 
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={conversation?.is_pinned ? 'Unpin conversation' : 'Pin conversation'}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                  </button>
                  <button className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              )}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-white mb-2">No messages yet</p>
              <p className="text-gray-400">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwnMessage = 
                (isCreator && message.sender_role === 'creator') ||
                (!isCreator && message.sender_role === 'member')
              const shouldStack = shouldStackMessage(index)
              const senderName = message.sender_role === 'creator' ? creatorDisplayName : message.sender_name
              const senderTier = message.sender_role === 'member' ? (conversation?.member_tier || currentUser.tier) : null
              const canDelete = canDeleteMessage(message)

              return (
                <div 
                  key={message.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${shouldStack ? '' : 'mt-4'}`}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className={`flex gap-3 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    {/* Profile Picture */}
                    {!shouldStack && (
                      <div className="flex-shrink-0 mt-auto">
                        <div className="relative group">
                          <div className={`absolute -inset-0.5 bg-gradient-to-r ${
                            message.sender_role === 'creator' 
                              ? 'from-sky-600 to-purple-600' 
                              : getTierGradient(senderTier || 'bronze')
                          } rounded-full opacity-0 group-hover:opacity-75 blur transition duration-200`}></div>
                          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br p-0.5">
                            {message.sender_role === 'creator' && creatorProfile?.profile_picture_url ? (
                              <img
                                src={creatorProfile.profile_picture_url}
                                alt={senderName}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full rounded-full bg-gradient-to-br ${
                              message.sender_role === 'creator' 
                                ? 'from-sky-500 to-purple-600' 
                                : getTierGradient(senderTier || 'bronze')
                            } flex items-center justify-center text-white font-semibold text-sm ${
                              message.sender_role === 'creator' && creatorProfile?.profile_picture_url ? 'hidden' : ''
                            }`}>
                              {senderName[0]?.toUpperCase() || '?'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${shouldStack ? (isOwnMessage ? 'mr-[52px]' : 'ml-[52px]') : ''} relative`}>
                      {/* Name and Timestamp */}
                      {!shouldStack && (
                        <div className={`flex items-center gap-2 mb-1 px-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <span className="text-sm font-semibold text-gray-200">{senderName}</span>
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
                                className={`absolute top-1/2 -translate-y-1/2 ${isOwnMessage ? '-left-8' : '-right-8'} p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all opacity-0 group-hover/message:opacity-100`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                            
                            {/* Delete Confirmation */}
                            {showDeleteConfirm === message.id && (
                              <div className={`absolute top-full mt-2 ${isOwnMessage ? 'right-0' : 'left-0'} bg-slate-900 border border-white/10 rounded-lg p-3 shadow-xl z-10`}>
                                <p className="text-sm text-white mb-2">Delete this message?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDeleteMessage(message.id)}
                                    disabled={deletingMessageId === message.id}
                                    className="px-3 py-1 bg-sky-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded transition-colors"
                                  >
                                    {deletingMessageId === message.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
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

      {/* Message Input with Glassmorphism */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/5 to-purple-600/5 backdrop-blur-xl" />
        <div className="relative border-t border-white/5">
          <div className="p-4">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-600/50 focus:bg-white/10 transition-all"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-6 py-3 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 disabled:from-red-900 disabled:to-red-900 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 disabled:shadow-none flex items-center justify-center min-w-[100px]"
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
          </div>
        </div>
      </div>
    </div>
  )
}