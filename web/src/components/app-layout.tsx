// src/components/app-layout.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useMobileContext } from '@/providers/mobile-provider'
import { NotificationWidget } from './notification-widget'
import { motion, AnimatePresence } from 'framer-motion'

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const GalleryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const CommunityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const CommissionsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { isMobile, isTablet } = useMobileContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [badges, setBadges] = useState({
    unseenContent: 0,
    unreadMessages: 0
  })

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile || isTablet) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile, isTablet])

  // Fetch badges
  useEffect(() => {
    async function fetchBadges() {
      try {
        // Fetch unseen content count
        const unseenRes = await fetch('/api/gallery/unseen-count')
        if (unseenRes.ok) {
          const { count } = await unseenRes.json()
          setBadges(prev => ({ ...prev, unseenContent: count }))
        }

        // Fetch unread messages count
        const unreadRes = await fetch('/api/community/unread-count')
        if (unreadRes.ok) {
          const { count } = await unreadRes.json()
          setBadges(prev => ({ ...prev, unreadMessages: count }))
        }
      } catch (error) {
        console.error('Failed to fetch badges:', error)
      }
    }

    if (session) {
      fetchBadges()
      // Refresh badges every 30 seconds
      const interval = setInterval(fetchBadges, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Build navigation items - include Admin for creators
  const navItems = [
    { 
      href: '/', 
      icon: DashboardIcon, 
      label: 'Dashboard',
      isActive: pathname === '/'
    },
    { 
      href: '/gallery', 
      icon: GalleryIcon, 
      label: 'Gallery',
      isActive: pathname.startsWith('/gallery') || pathname.startsWith('/sets'),
      badge: badges.unseenContent
    },
    { 
      href: '/community', 
      icon: CommunityIcon, 
      label: 'Community',
      isActive: pathname.startsWith('/community'),
      badge: badges.unreadMessages
    },
    { 
      href: '/commissions', 
      icon: CommissionsIcon, 
      label: 'Commissions',
      isActive: pathname.startsWith('/commissions')
    }
  ]

  // Add Admin item for creators
  if (session?.user?.isCreator) {
    navItems.push({
      href: '/admin',
      icon: AdminIcon,
      label: 'Admin',
      isActive: pathname.startsWith('/admin'),
      badge: undefined
    })
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-white/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    )
  }

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header - Higher z-index */}
      {(isMobile || isTablet) && (
        <div className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 z-[60] safe-area-inset-top">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <MenuIcon />
            </button>
            
            <div className="text-lg font-semibold text-white">
              PhotoVault
            </div>

            <div className="w-10" /> {/* Spacer for balance */}
          </div>
        </div>
      )}

      {/* Desktop Sidebar - Fixed z-index */}
      {!(isMobile || isTablet) && (
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-white/10 flex flex-col z-50">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              PhotoVault
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  item.isActive 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon />
                <span className="font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                {session.user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.user.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sidebar - Higher z-index to cover everything */}
      <AnimatePresence>
        {(isMobile || isTablet) && sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "tween" }}
              className="fixed left-0 top-0 bottom-0 w-80 max-w-[80vw] bg-zinc-900 shadow-xl z-[80] safe-area-inset-left flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                  PhotoVault
                </h1>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      item.isActive 
                        ? 'bg-red-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              {/* User section */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {session.user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <LogoutIcon />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content - Adjusted for desktop sidebar */}
      <div className={`${!(isMobile || isTablet) ? 'ml-64' : ''} ${(isMobile || isTablet) ? 'pt-16' : ''} relative`}>
        <div className={`${(isMobile || isTablet) ? 'px-4' : ''}`}>
          {children}
        </div>
      </div>

      {/* Notification Widget - Only for creators */}
      {session.user.isCreator && <NotificationWidget />}
    </div>
  )
}