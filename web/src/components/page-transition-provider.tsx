// src/components/page-transition-provider.tsx
"use client"

import { useEffect, useState, createContext, useContext, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Router from 'next/router'
import NProgress from 'nprogress'

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3,
})

interface TransitionContextType {
  showTransition: (message?: string) => void
  hideTransition: () => void
}

const TransitionContext = createContext<TransitionContextType>({
  showTransition: () => {},
  hideTransition: () => {},
})

export const useTransition = () => useContext(TransitionContext)

// Separate component for the part that uses useSearchParams
function PageTransitionContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionMessage, setTransitionMessage] = useState<string>('')

  // Handle route changes
  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== Router.asPath) {
        NProgress.start()
      }
    }

    const handleComplete = () => {
      NProgress.done()
      setIsTransitioning(false)
      setTransitionMessage('')
    }

    Router.events.on('routeChangeStart', handleStart)
    Router.events.on('routeChangeComplete', handleComplete)
    Router.events.on('routeChangeError', handleComplete)

    return () => {
      Router.events.off('routeChangeStart', handleStart)
      Router.events.off('routeChangeComplete', handleComplete)
      Router.events.off('routeChangeError', handleComplete)
    }
  }, [])

  // Clean up on pathname change
  useEffect(() => {
    NProgress.done()
    setIsTransitioning(false)
    setTransitionMessage('')
  }, [pathname, searchParams])

  const showTransition = (message?: string) => {
    setIsTransitioning(true)
    setTransitionMessage(message || '')
  }

  const hideTransition = () => {
    setIsTransitioning(false)
    setTransitionMessage('')
  }

  return (
    <TransitionContext.Provider value={{ showTransition, hideTransition }}>
      {children}
      
      {/* Global Loading Bar Styles */}
      <style jsx global>{`
        /* NProgress Custom Styles */
        #nprogress {
          pointer-events: none;
        }

        #nprogress .bar {
          background: linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #dc2626 100%);
          position: fixed;
          z-index: 9999;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          box-shadow: 0 0 10px #dc2626, 0 0 5px #dc2626;
        }

        /* Fancy blur effect behind the bar */
        #nprogress .bar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 3px;
          background: inherit;
          filter: blur(10px);
          opacity: 0.5;
        }

        /* Remove the spinner */
        #nprogress .spinner {
          display: none;
        }

        /* Peg (the growing head of the bar) */
        #nprogress .peg {
          display: block;
          position: absolute;
          right: 0px;
          width: 100px;
          height: 100%;
          box-shadow: 0 0 10px #dc2626, 0 0 5px #dc2626;
          opacity: 1.0;
          transform: rotate(3deg) translate(0px, -4px);
        }
      `}</style>

      {/* Transition Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="text-center space-y-4">
            {/* Animated Logo */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-sky-600 to-sky-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-600/25 animate-pulse">
                <span className="text-white font-bold text-3xl">K</span>
              </div>
              
              {/* Spinning ring */}
              <div className="absolute inset-0 -m-2">
                <div className="w-24 h-24 border-2 border-sky-600/20 rounded-full animate-spin" />
              </div>
            </div>
            
            {/* Message */}
            {transitionMessage && (
              <div className="space-y-2">
                <p className="text-white text-lg font-medium">{transitionMessage}</p>
                <p className="text-gray-400 text-sm">Please wait...</p>
              </div>
            )}
            
            {/* Loading dots */}
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </TransitionContext.Provider>
  )
}

// Main component with Suspense wrapper
export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black">
        {children}
      </div>
    }>
      <PageTransitionContent>{children}</PageTransitionContent>
    </Suspense>
  )
}