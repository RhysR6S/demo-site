// Path: src/app/community/dms/page.tsx
"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DMList } from '@/components/community/dm-list'
import { DMView } from '@/components/community/dm-view'
import { useMobileContext } from '@/providers/mobile-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Menu } from 'lucide-react'
import type { DMConversation } from '@/types/community'

function DMsContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  const [conversations, setConversations] = useState<DMConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMobileList, setShowMobileList] = useState(false)

  const isCreator = session?.user?.isCreator || false

  // Load conversations on mount
  useEffect(() => {
    if (session?.user) {
      loadConversations()
    }
  }, [session])

  // Handle conversation parameter from URL
  useEffect(() => {
    const conversationId = searchParams.get('id')
    if (conversationId && conversations.find(c => c.id === conversationId)) {
      setSelectedConversationId(conversationId)
    } else if (!isCreator && conversations.length === 1) {
      // For members, auto-select their single conversation
      setSelectedConversationId(conversations[0].id)
    }
  }, [searchParams, conversations, isCreator])

  async function loadConversations() {
    try {
      const response = await fetch('/api/dm/conversations')
      if (response.ok) {
        const data = await response.json()
        if (isCreator) {
          // Creator sees all conversations
          const conversationsWithUnread = (data.conversations || []).map((conv: DMConversation) => ({
            ...conv,
            has_unread: conv.has_unread || false
          }))
          setConversations(conversationsWithUnread)
        } else {
          // For members, ensure conversation exists
          if (!data.conversation) {
            // Create conversation if it doesn't exist
            const createResponse = await fetch('/api/dm/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            })
            
            if (createResponse.ok) {
              const newConv = await createResponse.json()
              setConversations([newConv.conversation])
              setSelectedConversationId(newConv.conversation.id)
            } else {
              setConversations([])
            }
          } else {
            // Use existing conversation
            setConversations([{
              ...data.conversation,
              has_unread: data.conversation.has_unread || false
            }])
            setSelectedConversationId(data.conversation.id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle conversation selection
  function handleSelectConversation(conversationId: string) {
    setSelectedConversationId(conversationId)
    router.push(`/community/dms?id=${conversationId}`)
    if (isSmallScreen) {
      setShowMobileList(false)
    }
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    )
  }

  // Show loading state for members while conversation is being created
  if (!isCreator && conversations.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Setting up your conversation with the creator...</p>
          <button 
            onClick={loadConversations}
            className="px-4 py-2 bg-sky-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Mobile layout
  if (isSmallScreen) {
    return (
      <div className="h-full flex flex-col">
        {/* Mobile header for creator with conversation list toggle */}
        {isCreator && selectedConversationId && (
          <div className="border-b border-white/10 bg-black/95 backdrop-blur-xl">
            <div className="px-4 py-3 safe-area-inset-x">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowMobileList(true)}
                  className="flex items-center gap-2 p-2 -m-2 text-gray-400 hover:text-white transition-colors rounded-lg active:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm">Conversations</span>
                </button>
                <span className="text-sm text-gray-400">
                  {conversations.filter(c => c.has_unread).length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-sky-600 text-white text-xs rounded-full">
                      {conversations.filter(c => c.has_unread).length}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile conversation list overlay for creators */}
        <AnimatePresence>
          {isCreator && showMobileList && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setShowMobileList(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-r border-white/10 z-50 safe-area-inset-left"
              >
                <DMList
                  conversations={conversations}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                  isCreator={isCreator}
                  onConversationUpdate={loadConversations}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {selectedConversationId && selectedConversation ? (
            <DMView
              key={selectedConversationId}
              conversationId={selectedConversationId}
              conversation={selectedConversation}
              isCreator={isCreator}
              currentUser={{
                id: session?.user?.id || '',
                name: session?.user?.name || 'User',
                tier: session?.user?.membershipTier || 'bronze'
              }}
            />
          ) : isCreator ? (
            // For creators on mobile, show conversation list by default
            <div className="h-full">
              <DMList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
                isCreator={isCreator}
                onConversationUpdate={loadConversations}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-400">Loading your conversation...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Desktop layout (unchanged)
  return (
    <div className="h-full flex">
      {/* Sidebar - Only show for creators - darker than main sidebar */}
      {isCreator && (
        <div className="w-80 border-r border-white/10 bg-[#0a0e1b]">
          <DMList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            isCreator={isCreator}
            onConversationUpdate={loadConversations}
          />
        </div>
      )}

      {/* Main content - darkest */}
      <div className="flex-1 bg-black">
        {selectedConversationId && selectedConversation ? (
          <DMView
            key={selectedConversationId}
            conversationId={selectedConversationId}
            conversation={selectedConversation}
            isCreator={isCreator}
            currentUser={{
              id: session?.user?.id || '',
              name: session?.user?.name || 'User',
              tier: session?.user?.membershipTier || 'bronze'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400">
                {isCreator 
                  ? "Select a conversation to start messaging"
                  : "Loading your conversation..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DMsPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      }
    >
      <DMsContent />
    </Suspense>
  )
}