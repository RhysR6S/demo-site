// src/components/loading-bar.tsx
"use client"

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function LoadingBar() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Start loading when route changes
    setIsLoading(true)

    // Hide loading bar after a short delay to allow page to render
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

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
