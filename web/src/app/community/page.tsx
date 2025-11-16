// Path: src/app/community/page.tsx
"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useMobileContext } from '@/providers/mobile-provider'
import { MessageCircle, Hash } from 'lucide-react'

export default function CommunityPage() {
  const { data: session } = useSession()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  const [markingAsRead, setMarkingAsRead] = useState(false)

  async function handleMarkAllRead() {
    setMarkingAsRead(true)
    try {
      const response = await fetch('/api/community/mark-all-read', {
        method: 'POST'
      })
      
      if (response.ok) {
        // Trigger badge refresh
        window.dispatchEvent(new Event('refresh-badges'))
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setMarkingAsRead(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className={`mx-auto ${isSmallScreen ? 'px-4 safe-area-inset-x' : 'max-w-5xl px-4'} ${isSmallScreen ? 'py-6' : 'py-8'}`}>
        {/* Header with Mark All Read button */}
        <div className={`flex items-center justify-between ${isSmallScreen ? 'mb-6' : 'mb-8'}`}>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isSmallScreen ? 'text-2xl' : 'text-4xl'} font-bold text-white`}
          >
            Community Hub
          </motion.h1>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleMarkAllRead}
            disabled={markingAsRead}
            className={`
              ${isSmallScreen ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded-lg font-medium transition-all
              ${markingAsRead 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }
            `}
          >
            {markingAsRead ? 'Marking...' : isSmallScreen ? 'Mark Read' : 'Mark All as Read'}
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-gray-400 ${isSmallScreen ? 'text-base mb-6' : 'text-lg mb-8'}`}
        >
          Connect with fellow members and the creator through channels and direct messages.
        </motion.p>

        {/* Navigation Cards */}
        <div className={`grid ${isSmallScreen ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 gap-6'}`}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/community/channels"
              className={`block ${isSmallScreen ? 'p-5' : 'p-6'} bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 hover:border-white/20 transition-all group ${isSmallScreen ? 'active:scale-[0.98]' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${isSmallScreen ? 'p-2.5' : 'p-3'} bg-red-600/10 rounded-lg group-hover:bg-red-600/20 transition-colors`}>
                    <Hash className={`${isSmallScreen ? 'w-5 h-5' : 'w-6 h-6'} text-red-400`} />
                  </div>
                  <h2 className={`${isSmallScreen ? 'text-xl' : 'text-2xl'} font-semibold text-white group-hover:text-red-400 transition-colors`}>
                    Channels
                  </h2>
                </div>
                <svg className={`${isSmallScreen ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400 group-hover:text-red-400 transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className={`text-gray-400 ${isSmallScreen ? 'text-sm' : ''}`}>
                Join topic-based discussions and connect with the community
              </p>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/community/dms"
              className={`block ${isSmallScreen ? 'p-5' : 'p-6'} bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 hover:border-white/20 transition-all group ${isSmallScreen ? 'active:scale-[0.98]' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${isSmallScreen ? 'p-2.5' : 'p-3'} bg-purple-600/10 rounded-lg group-hover:bg-purple-600/20 transition-colors`}>
                    <MessageCircle className={`${isSmallScreen ? 'w-5 h-5' : 'w-6 h-6'} text-purple-400`} />
                  </div>
                  <h2 className={`${isSmallScreen ? 'text-xl' : 'text-2xl'} font-semibold text-white group-hover:text-purple-400 transition-colors`}>
                    Direct Messages
                  </h2>
                </div>
                <svg className={`${isSmallScreen ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400 group-hover:text-purple-400 transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className={`text-gray-400 ${isSmallScreen ? 'text-sm' : ''}`}>
                {session?.user?.isCreator 
                  ? "Manage conversations with your members"
                  : "Send private messages to the creator"}
              </p>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}