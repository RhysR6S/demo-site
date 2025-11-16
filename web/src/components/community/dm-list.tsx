// Path: src/components/community/dm-list.tsx
"use client"

import { useState, useEffect } from 'react'
import { PatreonTierService } from '@/lib/patreon-tiers'
import type { DMConversation } from '@/types/community'

interface SearchedMember {
  id: string
  name: string
  email: string
  tier: string
  monthlyAmount: number
  lifetimeSupport: number
  status: string
}

interface DMListProps {
  conversations: DMConversation[]
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onConversationUpdate: () => void
  isCreator: boolean
}

export function DMList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onConversationUpdate,
  isCreator
}: DMListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedMember[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

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

  const getTierBadgeColor = (tierName: string) => {
    const colors = {
      bronze: 'bg-orange-900/50 text-orange-400 border-orange-500/30',
      silver: 'bg-gray-800/50 text-gray-300 border-gray-500/30',
      gold: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/30',
      platinum: 'bg-purple-900/50 text-purple-400 border-purple-500/30'
    }
    return colors[tierName.toLowerCase() as keyof typeof colors] || colors.bronze
  }

  // Search for members (Creator only)
  async function searchMembers() {
    if (!searchQuery.trim() || !isCreator) return

    setIsSearching(true)
    setSearchError('')

    try {
      const response = await fetch(`/api/dm/members/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.members || [])
      } else {
        setSearchError('Failed to search members')
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchError('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  // Start conversation with a member
  async function startConversationWithMember(member: SearchedMember) {
    try {
      const response = await fetch('/api/dm/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id })
      })

      if (response.ok) {
        const data = await response.json()
        onConversationUpdate()
        onSelectConversation(data.conversation.id)
        setSearchQuery('')
        setSearchResults([])
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  // Handle search submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    searchMembers()
  }

  // Pin/unpin conversation
  async function handlePinConversation(conversationId: string, isPinned: boolean) {
    try {
      const response = await fetch('/api/dm/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, isPinned })
      })

      if (response.ok) {
        onConversationUpdate()
      }
    } catch (error) {
      console.error('Failed to pin/unpin conversation:', error)
    }
  }

  // Sort conversations - pinned first, then by last message
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    
    // Both pinned or both unpinned - sort by last message
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return bTime - aTime
  })

  // Time formatting
  function formatTime(dateString: string | null) {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white mb-4">
          {isCreator ? 'Messages' : 'Direct Message'}
        </h2>

        {/* Search Form (Creator only) */}
        {isCreator && (
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600/50 pr-10"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white/20 rounded-full animate-spin border-t-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </form>
        )}

        {searchError && (
          <p className="mt-2 text-sm text-red-400">{searchError}</p>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="p-4 border-b border-white/5">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Search Results</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((member) => (
              <div
                key={member.id}
                onClick={() => startConversationWithMember(member)}
                className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white group-hover:text-red-400 transition-colors">
                      {member.name}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${getTierBadgeColor(member.tier)}`}>
                      {member.tier}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(member.monthlyAmount / 100).toFixed(0)}/mo
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedConversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No conversations yet</p>
            <p className="text-sm text-gray-600">Search for members to start a conversation</p>
          </div>
        ) : (
          sortedConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full p-4 rounded-xl transition-all transform hover:scale-[1.01] cursor-pointer ${
                selectedConversationId === conversation.id
                  ? 'bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-600/30 shadow-lg shadow-red-600/10'
                  : 'bg-zinc-800/30 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getTierGradient(conversation.member_tier)} flex items-center justify-center shadow-lg`}>
                    <span className={`text-white font-bold text-lg ${
                      conversation.member_name?.[0] ? '' : 'hidden'
                    }`}>
                      {conversation.member_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {/* Unread indicator */}
                  {conversation.has_unread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full ring-2 ring-black animate-pulse"></div>
                  )}
                  {/* Pin indicator */}
                  {conversation.is_pinned && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-semibold ${
                      conversation.has_unread ? 'text-white' : 'text-gray-300'
                    }`}>
                      {conversation.member_name}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  {conversation.latest_message && (
                    <p className={`text-sm truncate ${
                      conversation.has_unread ? 'text-gray-200' : 'text-gray-500'
                    }`}>
                      {conversation.latest_message.content}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTierBadgeColor(conversation.member_tier)}`}>
                      {conversation.member_tier}
                    </span>
                  </div>
                </div>

                {/* Pin button (Creator only) */}
                {isCreator && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePinConversation(conversation.id, !conversation.is_pinned)
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      conversation.is_pinned 
                        ? 'text-yellow-500 hover:bg-yellow-500/10' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}