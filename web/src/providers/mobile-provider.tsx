// src/providers/mobile-provider.tsx
"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { useMobile } from '@/hooks/use-mobile'

interface MobileContextType {
  isMobile: boolean
  isTablet: boolean
  isSmallScreen: boolean
}

const MobileContext = createContext<MobileContextType | undefined>(undefined)

export function MobileProvider({ children }: { children: ReactNode }) {
  const mobileState = useMobile()

  return (
    <MobileContext.Provider value={mobileState}>
      {children}
    </MobileContext.Provider>
  )
}

export function useMobileContext() {
  const context = useContext(MobileContext)
  if (!context) {
    throw new Error('useMobileContext must be used within MobileProvider')
  }
  return context
}