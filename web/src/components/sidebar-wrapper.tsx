// src/components/sidebar-wrapper.tsx
"use client"

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { AppLayout } from './app-layout'

// Pages that should not have the sidebar
const publicPages = ['/login', '/auth', '/api']
// Pages that already have their own sidebar (admin pages)
const pagesWithOwnSidebar = ['/admin']

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const pathname = usePathname()
  
  // Check if current page should have sidebar
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))
  const hasOwnSidebar = pagesWithOwnSidebar.some(page => pathname.startsWith(page))
  
  // Show children directly for public pages, pages with own sidebar, or when not authenticated
  if (isPublicPage || hasOwnSidebar || status === 'unauthenticated') {
    return <>{children}</>
  }
  
  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-white/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    )
  }
  
  // Wrap authenticated pages with sidebar
  return <AppLayout>{children}</AppLayout>
}