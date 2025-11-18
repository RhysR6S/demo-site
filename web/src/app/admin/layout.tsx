// src/app/admin/layout.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import AdminSidebar from '@/components/admin-sidebar'
import { useMobileContext } from '@/providers/mobile-provider'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile, isTablet } = useMobileContext()
  const [showSearch, setShowSearch] = useState(false)

  // Auth protection
  useEffect(() => {
    if (status !== "loading" && (!session || !session.user?.isCreator)) {
      router.push("/")
      router.refresh()
    }
  }, [session, session?.user?.isCreator, status, router])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!session?.user?.isCreator && status !== "loading") {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    return null
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-20 h-20 border-4 border-purple-600/20 rounded-full animate-spin border-t-purple-600" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-sky-600/20 rounded-full animate-spin border-t-sky-500 animate-delay-150" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Background Effects - Hidden on mobile */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hide-mobile">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-3/4 w-[400px] h-[400px] bg-sky-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full ${(isMobile || isTablet) ? 'w-full' : ''}`}>
        {/* Top Header */}
        <header className={`sticky top-0 z-30 h-20 flex items-center ${(isMobile || isTablet) ? 'px-4 pl-16' : 'px-8'} border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl`}>
          <div className="flex items-center justify-between w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link href="/admin" className="text-gray-500 hover:text-gray-300 transition-colors">
                Admin
              </Link>
              {pathname !== '/admin' && (
                <>
                  <span className="text-gray-600">/</span>
                  <span className="text-white capitalize">
                    {pathname.split('/').pop()?.replace('-', ' ')}
                  </span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Search - Hidden on mobile */}
              {!(isMobile || isTablet) && (
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-slate-900 rounded-xl transition-all duration-200 text-gray-400 hover:text-white border border-white/5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm">Search</span>
                  <kbd className="text-xs bg-zinc-800 px-2 py-0.5 rounded">⌘K</kbd>
                </button>
              )}

              {/* Quick add */}
              <Link 
                href="/admin/upload" 
                className="p-2.5 hover:bg-slate-900/50 rounded-xl transition-all duration-200 text-gray-400 hover:text-white"
                title="Quick Upload"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </Link>

              {/* Profile dropdown - Hide on mobile */}
              {!(isMobile || isTablet) && (
                <div className="relative">
                  <button className="flex items-center gap-2 p-2 hover:bg-slate-900/50 rounded-xl transition-all duration-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {session?.user?.creatorProfile?.displayName?.charAt(0)?.toUpperCase() || 
                         session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto ${(isMobile || isTablet) ? '' : ''}`}>
          <div className={`min-h-full ${(isMobile || isTablet) ? 'p-4' : 'p-8'}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`w-full ${(isMobile || isTablet) ? 'mx-4' : 'max-w-2xl'} bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search content, users, or settings..."
                    className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
                    autoFocus
                  />
                  <kbd className="text-xs bg-zinc-800 px-2 py-1 rounded text-gray-400">ESC</kbd>
                </div>
              </div>
              
              <div className="border-t border-white/10 px-6 py-4">
                <p className="text-sm text-gray-400">
                  Quick tip: Use <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs">@</kbd> for users, 
                  <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs mx-1">#</kbd> for content, 
                  or <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs mx-1">:</kbd> for settings
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}