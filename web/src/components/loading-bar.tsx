// src/components/loading-bar.tsx
"use client"

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function LoadingBar() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track previous values to detect when navigation starts
  const prevPathname = useRef(pathname)
  const prevSearchParams = useRef(searchParams?.toString())

  useEffect(() => {
    // Detect if navigation is happening
    const currentPath = pathname
    const currentSearch = searchParams?.toString()

    const isNavigating =
      prevPathname.current !== currentPath ||
      prevSearchParams.current !== currentSearch

    if (isNavigating) {
      // Show loading bar immediately when navigation detected
      setIsLoading(true)

      // Update refs for next comparison
      prevPathname.current = currentPath
      prevSearchParams.current = currentSearch

      // Hide loading bar after page has had time to render
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  // Also listen for link clicks to show loading bar immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      // Check if it's an internal navigation link
      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href)
        const isInternal = url.origin === window.location.origin
        const isDifferentPage =
          url.pathname !== window.location.pathname ||
          url.search !== window.location.search

        if (isInternal && isDifferentPage) {
          setIsLoading(true)
        }
      }
    }

    // Listen for all clicks
    document.addEventListener('click', handleClick, { capture: true })

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [])

  if (!isLoading) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden"
      role="progressbar"
      aria-label="Page loading"
    >
      {/* Animated striped background */}
      <div
        className="absolute inset-0 animate-loading-slide"
        style={{
          background: 'repeating-linear-gradient(90deg, #3b82f6 0px, #3b82f6 20px, #60a5fa 20px, #60a5fa 40px)',
          backgroundSize: '40px 100%',
          animation: 'loadingSlide 1s linear infinite'
        }}
      />

      {/* Pulse overlay for extra visual feedback */}
      <div
        className="absolute inset-0 bg-blue-400/30 animate-pulse"
        style={{ animationDuration: '1.5s' }}
      />

      <style jsx>{`
        @keyframes loadingSlide {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 40px 0;
          }
        }
      `}</style>
    </div>
  )
}
