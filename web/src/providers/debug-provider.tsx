// src/providers/debug-provider.tsx
"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Debug features configuration - COMPLETELY DISABLED IN PRODUCTION
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' && 
                     process.env.NEXT_PUBLIC_DEBUG_MODE !== 'false'

interface DebugContextType {
  isDebugMode: boolean
  showDebugPanel: boolean
  isMinimized: boolean
  toggleDebugPanel: () => void
  toggleMinimize: () => void
  overrideAuth: (overrides: AuthOverrides | null) => void
  authOverrides: AuthOverrides | null
}

interface AuthOverrides {
  isCreator?: boolean
  isActivePatron?: boolean
  membershipTier?: string
}

const DebugContext = createContext<DebugContextType | null>(null)

export function useDebug() {
  const context = useContext(DebugContext)
  if (!context) {
    // Return a no-op version in production
    return {
      isDebugMode: false,
      showDebugPanel: false,
      isMinimized: false,
      toggleDebugPanel: () => {},
      toggleMinimize: () => {},
      overrideAuth: () => {},
      authOverrides: null
    }
  }
  return context
}

interface DebugProviderProps {
  children: ReactNode
}

export function DebugProvider({ children }: DebugProviderProps) {
  // In production, just render children without any debug functionality
  if (process.env.NODE_ENV === 'production') {
    return <>{children}</>
  }

  // If debug is disabled even in development, just render children
  if (!DEBUG_ENABLED) {
    return <>{children}</>
  }

  return <DebugProviderInternal>{children}</DebugProviderInternal>
}

// Internal provider only loaded in development
function DebugProviderInternal({ children }: DebugProviderProps) {
  const { data: session, status } = useSession()
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [authOverrides, setAuthOverrides] = useState<AuthOverrides | null>(null)
  
  // Apply auth overrides to session in development
  useEffect(() => {
    if (session && authOverrides && typeof window !== 'undefined') {
      // Store overrides in sessionStorage so they persist across navigation
      window.sessionStorage.setItem('debug-auth-overrides', JSON.stringify(authOverrides))
      
      // Apply overrides to the session object
      if (authOverrides.isCreator !== undefined) {
        (session.user as any).isCreator = authOverrides.isCreator
      }
      if (authOverrides.isActivePatron !== undefined) {
        (session.user as any).isActivePatron = authOverrides.isActivePatron
      }
      if (authOverrides.membershipTier !== undefined) {
        (session.user as any).membershipTier = authOverrides.membershipTier
      }
    }
  }, [session, authOverrides])

  // Load overrides from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem('debug-auth-overrides')
      if (stored) {
        setAuthOverrides(JSON.parse(stored))
      }
    }
  }, [])

  // Debug info
  const debugInfo = {
    sessionStatus: status,
    userId: session?.user?.id || 'none',
    isCreator: session?.user?.isCreator || false,
    isPatron: session?.user?.isActivePatron || false,
    membershipTier: session?.user?.membershipTier || 'none',
    hasOverrides: !!authOverrides,
  }

  // Toggle debug panel visibility
  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev)
    if (!showDebugPanel) {
      setIsMinimized(false)
    }
  }

  // Toggle minimize state
  const toggleMinimize = () => {
    setIsMinimized(prev => !prev)
  }

  // Override authentication properties
  const overrideAuth = (overrides: AuthOverrides | null) => {
    setAuthOverrides(overrides)
    if (overrides === null && typeof window !== 'undefined') {
      window.sessionStorage.removeItem('debug-auth-overrides')
      // Reload to reset session
      window.location.reload()
    }
  }

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + D
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleDebugPanel()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <DebugContext.Provider value={{
      isDebugMode: DEBUG_ENABLED,
      showDebugPanel,
      isMinimized,
      toggleDebugPanel,
      toggleMinimize,
      overrideAuth,
      authOverrides
    }}>
      {children}
      {DEBUG_ENABLED && showDebugPanel && <DebugPanel session={session} debugInfo={debugInfo} />}
    </DebugContext.Provider>
  )
}

// Compact Debug Panel Component
function DebugPanel({ session, debugInfo }: any) {
  const { isMinimized, toggleMinimize, toggleDebugPanel, overrideAuth, authOverrides } = useDebug()
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  
  const presets = [
    { id: 'creator', label: 'Creator', overrides: { isCreator: true, isActivePatron: true, membershipTier: 'creator' } },
    { id: 'platinum', label: 'Platinum', overrides: { isCreator: false, isActivePatron: true, membershipTier: 'platinum' } },
    { id: 'diamond', label: 'Diamond', overrides: { isCreator: false, isActivePatron: true, membershipTier: 'diamond' } },
    { id: 'gold', label: 'Gold', overrides: { isCreator: false, isActivePatron: true, membershipTier: 'gold' } },
    { id: 'silver', label: 'Silver', overrides: { isCreator: false, isActivePatron: true, membershipTier: 'silver' } },
    { id: 'bronze', label: 'Bronze', overrides: { isCreator: false, isActivePatron: true, membershipTier: 'bronze' } },
    { id: 'user', label: 'Free User', overrides: { isCreator: false, isActivePatron: false, membershipTier: undefined } },
  ]
  
  const handlePresetChange = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setSelectedPreset(presetId)
      overrideAuth(preset.overrides)
    }
  }

  const clearOverrides = () => {
    setSelectedPreset('')
    overrideAuth(null)
  }

  // Determine current preset based on overrides
  useEffect(() => {
    if (authOverrides) {
      const matchingPreset = presets.find(p => 
        p.overrides.isCreator === authOverrides.isCreator &&
        p.overrides.isActivePatron === authOverrides.isActivePatron &&
        p.overrides.membershipTier === authOverrides.membershipTier
      )
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.id)
      }
    } else {
      setSelectedPreset('')
    }
  }, [authOverrides])

  // Minimized view - just a small floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={toggleMinimize}
          className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow group"
          title="Expand Debug Panel (⌘⇧D)"
        >
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            {authOverrides && (
              <div className="w-2 h-2 bg-blue-400 rounded-full" title="Auth overrides active" />
            )}
            <svg className="w-4 h-4 text-yellow-400 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </button>
      </div>
    )
  }

  // Full view
  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-xs">
      {/* Main Debug Panel */}
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-400 text-black px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Debug Mode</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMinimize}
              className="p-1 hover:bg-yellow-500 rounded transition-colors"
              title="Minimize (⌘⇧D)"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={toggleDebugPanel}
              className="p-1 hover:bg-yellow-500 rounded transition-colors"
              title="Close"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Session Info */}
        <div className="p-3 border-b border-zinc-800">
          <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">Session</div>
          {session?.user ? (
            <div className="space-y-0.5 text-xs">
              <div className="font-mono text-gray-400">
                {session.user?.email || 'No email'}
              </div>
              <div className="flex gap-2 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded ${session.user?.isCreator ? 'bg-green-900/50 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  Creator
                </span>
                <span className={`px-1.5 py-0.5 rounded ${session.user?.isActivePatron ? 'bg-blue-900/50 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  Patron
                </span>
                {session.user?.membershipTier && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400">
                    {session.user.membershipTier}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Not authenticated
            </div>
          )}
        </div>

        {/* Auth Override Controls */}
        {session && (
          <div className="p-3 space-y-2">
            <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">Override Auth</div>
            
            {/* Preset Selector */}
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded focus:border-yellow-400 focus:outline-none"
            >
              <option value="">Select auth preset...</option>
              <optgroup label="Admin">
                <option value="creator">Creator (Full Access)</option>
              </optgroup>
              <optgroup label="Patron Tiers">
                <option value="platinum">Platinum Patron</option>
                <option value="diamond">Diamond Patron</option>
                <option value="gold">Gold Patron</option>
                <option value="silver">Silver Patron</option>
                <option value="bronze">Bronze Patron</option>
              </optgroup>
              <optgroup label="Other">
                <option value="user">Free User (No Access)</option>
              </optgroup>
            </select>

            {/* Current Override Display */}
            {authOverrides && (
              <div className="space-y-1 text-[10px] bg-zinc-800/50 rounded p-2">
                <div className="font-mono text-gray-500 uppercase mb-1">Active Overrides</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Creator:</span>
                    <span className={authOverrides.isCreator ? 'text-green-400' : 'text-zinc-500'}>
                      {authOverrides.isCreator ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Patron:</span>
                    <span className={authOverrides.isActivePatron ? 'text-blue-400' : 'text-zinc-500'}>
                      {authOverrides.isActivePatron ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tier:</span>
                    <span className="text-purple-400">
                      {authOverrides.membershipTier || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Clear Button */}
            {authOverrides && (
              <button
                onClick={clearOverrides}
                className="w-full px-2 py-1 text-xs bg-red-900/20 text-red-400 hover:bg-red-900/30 rounded transition-colors border border-red-900/50"
              >
                Clear Overrides & Reload
              </button>
            )}
          </div>
        )}

        {/* Additional Debug Info */}
        <div className="p-3 border-t border-zinc-800 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Session Status:</span>
            <span className="text-gray-400">{debugInfo.sessionStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">User ID:</span>
            <span className="text-gray-400 font-mono">{debugInfo.userId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Has Overrides:</span>
            <span className={debugInfo.hasOverrides ? 'text-yellow-400' : 'text-gray-400'}>
              {debugInfo.hasOverrides ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
