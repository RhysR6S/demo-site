// src/app/community/channels/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChannelList } from '@/components/community/channel-list'
import { ChannelView } from '@/components/community/channel-view'
import { useMobileContext } from '@/providers/mobile-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Hash } from 'lucide-react'

interface Channel {
  id: string
  name: string
  emoji: string
  description: string | null
  min_tier: string
  allow_member_posts: boolean
  has_unread: boolean
  latest_message_at: string | null
}

export default function ChannelsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMobileChannelList, setShowMobileChannelList] = useState(false)

  const isCreator = session?.user?.isCreator || false

  // Load channels on mount
  useEffect(() => {
    if (session?.user) {
      loadChannels()
    }
  }, [session])

  // Handle channel parameter from URL
  useEffect(() => {
    const channelId = searchParams.get('id')
    if (channelId && channels.find(c => c.id === channelId)) {
      setSelectedChannelId(channelId)
    } else if (!selectedChannelId && channels.length > 0) {
      // Select first channel if none selected
      handleChannelSelect(channels[0].id)
    }
  }, [searchParams, channels])

  async function loadChannels() {
    try {
      const response = await fetch('/api/channels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error('Failed to load channels:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleChannelSelect(channelId: string) {
    setSelectedChannelId(channelId)
    // Update URL without navigation
    const newUrl = `/community/channels?id=${channelId}`
    window.history.replaceState({}, '', newUrl)
    if (isSmallScreen) {
      setShowMobileChannelList(false)
    }
  }

  function handleChannelsUpdate() {
    loadChannels()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-3 border-sky-600/20 rounded-full animate-spin border-t-sky-500"></div>
      </div>
    )
  }

  // Mobile layout
  if (isSmallScreen) {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile header with channel selector */}
        {selectedChannelId && !showMobileChannelList && (
          <div className="border-b border-white/10 bg-black/95 backdrop-blur-xl">
            <div className="px-4 py-3 safe-area-inset-x">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowMobileChannelList(true)}
                  className="flex items-center gap-2 p-2 -m-2 text-gray-400 hover:text-white transition-colors rounded-lg active:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm">Channels</span>
                </button>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-white">
                    {channels.find(c => c.id === selectedChannelId)?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {!showMobileChannelList && selectedChannelId ? (
            <ChannelView
              channelId={selectedChannelId}
              channel={channels.find(c => c.id === selectedChannelId)}
              isCreator={isCreator}
              currentUser={{
                id: session?.user?.id || '',
                name: isCreator && session?.user?.creatorProfile?.displayName 
                  ? session.user.creatorProfile.displayName 
                  : session?.user?.name || 'Anonymous',
                tier: session?.user?.membershipTier || 'bronze'
              }}
            />
          ) : (
            // Show channel list on mobile
            <div className="h-full bg-slate-900/30">
              <ChannelList
                channels={channels}
                selectedChannelId={selectedChannelId}
                onSelectChannel={handleChannelSelect}
                onChannelsUpdate={handleChannelsUpdate}
                isCreator={isCreator}
              />
            </div>
          )}
        </div>

        {/* Mobile channel list overlay */}
        <AnimatePresence>
          {showMobileChannelList && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setShowMobileChannelList(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-full max-w-sm bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-50 safe-area-inset-left"
              >
                <div className="flex flex-col h-full">
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Channels</h2>
                      <button
                        onClick={() => setShowMobileChannelList(false)}
                        className="p-2 -m-2 text-gray-400 hover:text-white transition-colors rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <ChannelList
                      channels={channels}
                      selectedChannelId={selectedChannelId}
                      onSelectChannel={handleChannelSelect}
                      onChannelsUpdate={handleChannelsUpdate}
                      isCreator={isCreator}
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex h-full">
      {/* Channel List Sidebar - darker than main sidebar */}
      <div className="w-80 bg-slate-950 border-r border-white/5 flex flex-col h-full">
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleChannelSelect}
          onChannelsUpdate={handleChannelsUpdate}
          isCreator={isCreator}
        />
      </div>

      {/* Channel View - darkest */}
      <div className="flex-1 flex flex-col h-full bg-black">
        {selectedChannelId ? (
          <ChannelView
            channelId={selectedChannelId}
            channel={channels.find(c => c.id === selectedChannelId)}
            isCreator={isCreator}
            currentUser={{
              id: session?.user?.id || '',
              name: isCreator && session?.user?.creatorProfile?.displayName 
                ? session.user.creatorProfile.displayName 
                : session?.user?.name || 'Anonymous',
              tier: session?.user?.membershipTier || 'bronze'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto mb-6 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">Select a Channel</h3>
              <p className="text-gray-400">Choose a channel from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}