// src/components/community/channel-list.tsx
"use client"

import { useState } from 'react'
import { PatreonTierService, type TierConfig } from '@/lib/patreon-tiers'

interface Channel {
  id: string
  name: string
  emoji: string
  description: string | null
  min_tier: string
  allow_member_posts: boolean
  has_unread: boolean
  is_default?: boolean
}

interface ChannelListProps {
  channels: Channel[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onChannelsUpdate: () => void
  isCreator: boolean
  availableTiers?: Array<{ id: string; title: string; amount_cents: number }>
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  onChannelsUpdate,
  isCreator,
  availableTiers = []
}: ChannelListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)

  // Get tier configuration dynamically
  const getTierStyle = (tierName: string) => {
    const config = PatreonTierService.getTierConfig(tierName)
    return config.color
  }

  const getTierGradient = (tierName: string) => {
    const gradients = {
      bronze: 'from-orange-600 to-orange-700',
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-yellow-500 to-yellow-600',
      platinum: 'from-purple-400 to-purple-500'
    }
    return gradients[tierName.toLowerCase() as keyof typeof gradients] || gradients.bronze
  }

  return (
    <>
      <div className="p-6 space-y-3">
        {/* Create Channel Button (Creator Only) */}
        {isCreator && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full mb-6 py-3.5 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 hover:scale-[1.02] group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">Create Channel</span>
          </button>
        )}

        {/* Channel List */}
        <div className="space-y-2">
          {channels.map((channel) => (
            <div key={channel.id} className="relative group">
              <div
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer ${
                  selectedChannelId === channel.id
                    ? 'bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-600/30 shadow-lg shadow-red-600/10'
                    : 'bg-zinc-800/30 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Emoji with glow effect */}
                  <div className={`text-2xl mt-0.5 transition-all duration-300 ${
                    selectedChannelId === channel.id ? 'scale-110 drop-shadow-lg' : ''
                  }`}>
                    {channel.emoji}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate transition-colors ${
                        selectedChannelId === channel.id ? 'text-white' : 'text-gray-200'
                      }`}>
                        {channel.name}
                      </span>
                      {channel.has_unread && (
                        <span className="relative">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0 animate-pulse"></span>
                          <span className="absolute inset-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                        </span>
                      )}
                    </div>
                    
                    {channel.description && (
                      <p className={`text-sm mt-1 line-clamp-2 transition-colors ${
                        selectedChannelId === channel.id ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {channel.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2">
                      {/* Tier Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getTierGradient(channel.min_tier)} bg-opacity-10 backdrop-blur-sm`}>
                        <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                        {channel.min_tier.charAt(0).toUpperCase() + channel.min_tier.slice(1)}+
                      </div>
                      
                      {!channel.allow_member_posts && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 rounded-full text-xs text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Read-only
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit/Delete buttons for creators - positioned absolutely outside the clickable area */}
              {isCreator && !channel.is_default && (
                <div className={`absolute top-3 right-3 flex gap-1 transition-opacity ${
                  selectedChannelId === channel.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingChannel(channel)
                      setShowCreateModal(true)
                    }}
                    className="p-1.5 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg transition-all hover:scale-110"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteChannel(channel.id)
                    }}
                    className="p-1.5 bg-zinc-700/50 hover:bg-red-600/20 rounded-lg transition-all hover:scale-110"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {channels.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <p className="text-gray-400">No channels available</p>
            {isCreator && (
              <p className="text-sm text-gray-500 mt-2">Create your first channel to get started</p>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Channel Modal */}
      {showCreateModal && (
        <ChannelModal
          channel={editingChannel}
          availableTiers={availableTiers}
          onClose={() => {
            setShowCreateModal(false)
            setEditingChannel(null)
          }}
          onSave={() => {
            setShowCreateModal(false)
            setEditingChannel(null)
            onChannelsUpdate()
          }}
        />
      )}
    </>
  )

  async function handleDeleteChannel(channelId: string) {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/channels/${channelId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onChannelsUpdate()
      } else {
        alert('Failed to delete channel')
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
      alert('Failed to delete channel')
    }
  }
}

// Enhanced Channel Modal Component
function ChannelModal({ 
  channel, 
  availableTiers,
  onClose, 
  onSave 
}: { 
  channel: Channel | null
  availableTiers: Array<{ id: string; title: string; amount_cents: number }>
  onClose: () => void
  onSave: () => void 
}) {
  const [formData, setFormData] = useState({
    name: channel?.name || '',
    emoji: channel?.emoji || '💬',
    description: channel?.description || '',
    min_tier: channel?.min_tier || 'bronze',
    allow_member_posts: channel?.allow_member_posts ?? true
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const response = await fetch(
        channel ? `/api/channels/${channel.id}` : '/api/channels',
        {
          method: channel ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      )

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save channel')
      }
    } catch (error) {
      console.error('Error saving channel:', error)
      alert('Failed to save channel')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
          {channel ? 'Edit Channel' : 'Create New Channel'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Emoji Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Channel Emoji</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="w-24 px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-center text-2xl focus:border-red-600/50 focus:ring-2 focus:ring-red-600/20 transition-all"
                maxLength={2}
              />
            </div>

            {/* Channel Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Channel Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-red-600/50 focus:ring-2 focus:ring-red-600/20 transition-all"
                placeholder="general-chat"
                required
                disabled={channel?.is_default}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-red-600/50 focus:ring-2 focus:ring-red-600/20 transition-all resize-none"
                placeholder="What's this channel about?"
                rows={3}
              />
            </div>

            {/* Minimum Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Tier Required</label>
              <select
                value={formData.min_tier}
                onChange={(e) => setFormData({ ...formData, min_tier: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white focus:border-red-600/50 focus:ring-2 focus:ring-red-600/20 transition-all"
                disabled={channel?.is_default}
              >
                {availableTiers.length > 0 ? (
                  availableTiers.map(tier => (
                    <option key={tier.id} value={tier.title.toLowerCase()}>
                      {tier.title} (${(tier.amount_cents / 100).toFixed(2)}/mo)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </>
                )}
              </select>
            </div>

            {/* Member Posts Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl">
              <label className="text-sm font-medium text-gray-300">Allow member posts</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, allow_member_posts: !formData.allow_member_posts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.allow_member_posts ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-zinc-700'
                }`}
                disabled={channel?.is_default}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.allow_member_posts ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 text-gray-300 hover:text-white rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-200 shadow-lg shadow-red-600/20 hover:shadow-red-600/30"
            >
              {channel ? 'Save Changes' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}