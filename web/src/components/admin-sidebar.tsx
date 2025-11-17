// src/components/admin-sidebar.tsx
"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMobileContext } from '@/providers/mobile-provider'

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

interface CommissionCounts {
  pending: number
  in_progress: number
}

const sidebarItems = [
  { 
    href: '/admin', 
    label: 'Dashboard', 
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    href: '/admin/content', 
    label: 'Content Manager',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  { 
    href: '/admin/upload', 
    label: 'Upload Studio',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )
  },
  { 
    href: '/admin/analytics', 
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    href: '/admin/commissions', 
    label: 'Commissions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  { 
    href: '/admin/characters', 
    label: 'Characters',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  { 
    href: '/admin/profile', 
    label: 'Creator Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  { 
    href: '/admin/security', 
    label: 'Security',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
  { 
    href: '/admin/rate-limits', 
    label: 'Rate Limits',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { isMobile, isTablet } = useMobileContext()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commissionCounts, setCommissionCounts] = useState<CommissionCounts>({
    pending: 0,
    in_progress: 0
  })

  useEffect(() => {
    // Fetch commission counts
    fetchCommissionCounts()
    
    // Set up interval to refresh counts every 30 seconds
    const interval = setInterval(fetchCommissionCounts, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile || isTablet) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile, isTablet])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if ((isMobile || isTablet) && sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen, isMobile, isTablet])

  const fetchCommissionCounts = async () => {
    try {
      const response = await fetch('/api/admin/commissions')
      if (response.ok) {
        const data = await response.json()
        const commissions = data.commissions || []
        
        // Count commissions by status
        const counts = commissions.reduce((acc: CommissionCounts, commission: any) => {
          if (commission.status === 'pending') {
            acc.pending++
          } else if (commission.status === 'in_progress') {
            acc.in_progress++
          }
          return acc
        }, { pending: 0, in_progress: 0 })
        
        setCommissionCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching commission counts:', error)
    }
  }

  const effectiveCollapsed = (isMobile || isTablet) ? false : sidebarCollapsed

  return (
    <>
      {/* Mobile menu button */}
      {(isMobile || isTablet) && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-purple-900/90 backdrop-blur-sm rounded-lg border border-purple-500/20 lg:hidden"
        >
          {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      )}

      {/* Backdrop for mobile */}
      {(isMobile || isTablet) && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        ${(isMobile || isTablet) ? 'fixed' : 'relative'} inset-y-0 left-0 z-40
        flex flex-col h-full transition-all duration-300 
        ${effectiveCollapsed ? 'w-20' : 'w-72'} 
        bg-zinc-950/50 backdrop-blur-xl border-r border-white/5
        ${(isMobile || isTablet) && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        lg:translate-x-0
      `}>
        {/* Logo/Brand */}
        <div className={`${(isMobile || isTablet) ? 'h-20 pt-8' : 'h-20'} flex items-center justify-between px-6 border-b border-white/5`}>
          {!effectiveCollapsed ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-red-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">PhotoVault</h3>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            </motion.div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-red-600 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">P</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : item.href !== '/admin' && pathname.startsWith(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-purple-600/20 text-purple-400 shadow-lg shadow-purple-600/20' 
                      : 'text-gray-400 hover:text-white hover:bg-zinc-900/50'
                    }
                    ${effectiveCollapsed ? 'justify-center' : ''}
                  `}
                  title={effectiveCollapsed ? item.label : undefined}
                >
                  <span className={`${isActive ? 'text-purple-400' : ''}`}>{item.icon}</span>
                  {!effectiveCollapsed && (
                    <span className="flex-1 font-medium">{item.label}</span>
                  )}
                  {/* Show badges for commission statuses */}
                  {!effectiveCollapsed && item.href === '/admin/commissions' && (
                    <div className="flex items-center gap-1">
                      {commissionCounts.pending > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-600/20 text-yellow-400 rounded-full" title="Pending">
                          {commissionCounts.pending}
                        </span>
                      )}
                      {commissionCounts.in_progress > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-green-600/20 text-green-400 rounded-full" title="In Progress">
                          {commissionCounts.in_progress}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Show badge indicators in collapsed mode */}
                  {effectiveCollapsed && item.href === '/admin/commissions' && (commissionCounts.pending > 0 || commissionCounts.in_progress > 0) && (
                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                      {commissionCounts.pending > 0 && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full" title={`${commissionCounts.pending} pending`} />
                      )}
                      {commissionCounts.in_progress > 0 && (
                        <div className="w-2 h-2 bg-green-400 rounded-full" title={`${commissionCounts.in_progress} in progress`} />
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-white/5">
          {!effectiveCollapsed && (
            <Link 
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-zinc-900/50 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              <span className="font-medium">Back to Site</span>
            </Link>
          )}
          {/* Hide collapse button on mobile */}
          {!(isMobile || isTablet) && (
            <div className="flex items-center justify-center mt-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-zinc-900/50 rounded-lg transition-colors"
              >
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}