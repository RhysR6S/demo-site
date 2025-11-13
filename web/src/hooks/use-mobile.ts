// src/hooks/use-mobile.ts
"use client"

import { useState, useEffect } from 'react'

export function useMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < breakpoint)
      setIsTablet(width >= breakpoint && width < 1024)
    }

    // Initial check
    checkDevice()

    // Add resize listener
    window.addEventListener('resize', checkDevice)
    
    // Also check on orientation change
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [breakpoint])

  return { isMobile, isTablet, isSmallScreen: isMobile || isTablet }
}
