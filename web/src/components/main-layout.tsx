// Path: src/components/main-layout.tsx
"use client"

import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-screen bg-black flex">
      {/* Main Content - Full height without navbar */}
      <main className="flex-1 h-full">
        {children}
      </main>
    </div>
  )
}
