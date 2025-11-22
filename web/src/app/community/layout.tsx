// Path: src/app/community/layout.tsx
"use client"

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/main-layout'
import { useMobileContext } from '@/providers/mobile-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { Hash, MessageCircle, Menu, X, ArrowLeft } from 'lucide-react'

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check authentication
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user?.isActivePatron && !session?.user?.isCreator) {
      router.push('/')
    }
  }, [session, status, router])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (status === 'loading') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-12 h-12 border-3 border-sky-600/20 rounded-full animate-spin border-t-sky-500"></div>
        </div>
      </MainLayout>
    )
  }

  if (!session?.user) {
    return null
  }

  const isCreator = session.user.isCreator || false

  // Mobile layout
  if (isSmallScreen) {
    return (
      <MainLayout>
        <div className="flex flex-col h-full bg-black">
          {/* Mobile Header */}
          <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10">
            <div className="px-4 py-3 safe-area-inset-x">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="p-2 -m-2 text-gray-400 hover:text-white transition-colors rounded-lg active:bg-white/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <h1 className="text-lg font-semibold text-white">Community</h1>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg active:bg-white/10"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 w-64 bg-slate-900 border-l border-white/10 z-40 safe-area-inset-right"
                >
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Navigation</h2>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="p-2 -m-2 text-gray-400 hover:text-white transition-colors rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <Link
                          href="/community/channels"
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                            pathname === '/community/channels'
                              ? 'bg-gradient-to-r from-sky-600/20 to-purple-600/20 text-white border border-cyan-500/20'
                              : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                          }`}
                        >
                          <Hash className="w-5 h-5" />
                          <span>Channels</span>
                        </Link>
                        
                        <Link
                          href="/community/dms"
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                            pathname === '/community/dms'
                              ? 'bg-gradient-to-r from-sky-600/20 to-purple-600/20 text-white border border-cyan-500/20'
                              : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                          }`}
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span>{isCreator ? 'Messages' : 'DM Creator'}</span>
                        </Link>
                      </div>
                    </div>
                    
                    {/* User info */}
                    <div className="flex-1 flex items-end p-4">
                      <div className="w-full">
                        <div className="text-xs text-gray-500 mb-3">
                          <p>Logged in as:</p>
                          <p className="text-gray-400 font-medium">
                            {isCreator && session.user.creatorProfile?.displayName 
                              ? session.user.creatorProfile.displayName 
                              : session.user.name}
                          </p>
                          <p className="text-gray-500">{isCreator ? 'Creator' : session.user.membershipTier || 'Member'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </MainLayout>
    )
  }

  // Desktop layout (unchanged)
  return (
    <MainLayout>
      <div className="flex h-full"> {/* Full height without navbar */}
        {/* Tab Navigation Sidebar */}
        <div className="w-64 bg-red-500 backdrop-blur-sm border-r border-white/5 flex flex-col h-full">
          {/* Header with back button */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Community</h2>
              <Link
                href="/"
                className="p-2 text-gray-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-all"
                title="Back to Home"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
            </div>
            
            <div className="space-y-2">
              <Link
                href="/community/channels"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  pathname === '/community/channels'
                    ? 'bg-gradient-to-r from-sky-600/20 to-purple-600/20 text-white border border-cyan-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span>Channels</span>
              </Link>
              
              <Link
                href="/community/dms"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  pathname === '/community/dms'
                    ? 'bg-gradient-to-r from-sky-600/20 to-purple-600/20 text-white border border-cyan-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{isCreator ? 'Messages' : 'DM Creator'}</span>
              </Link>
            </div>
          </div>
          
          {/* User info at bottom */}
          <div className="flex-1 flex items-end p-4">
            <div className="w-full">
              <div className="text-xs text-gray-500 mb-3">
                <p>Logged in as:</p>
                <p className="text-gray-400 font-medium">
                  {isCreator && session.user.creatorProfile?.displayName 
                    ? session.user.creatorProfile.displayName 
                    : session.user.name}
                </p>
                <p className="text-gray-500">{isCreator ? 'Creator' : session.user.membershipTier || 'Member'}</p>
              </div>
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800/80 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Gallery</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Area - Full height */}
        <div className="flex-1 h-full overflow-hidden bg-black">
          {children}
        </div>
      </div>
    </MainLayout>
  )
}