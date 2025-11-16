// src/components/providers.tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

// Pages that should not have the sidebar
const publicPages = ['/login', '/auth']

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if current page should have sidebar
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))
  
  return (
    <SessionProvider>
      {isPublicPage ? (
        children
      ) : (
        <AppLayout>{children}</AppLayout>
      )}
    </SessionProvider>
  )
}