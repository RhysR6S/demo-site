// src/components/auth-wrapper.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthWrapperProps {
  children: React.ReactNode
  requireCreator?: boolean
}

export function AuthWrapper({ children, requireCreator = false }: AuthWrapperProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    // Check if session has error (user not authorized)
    if (session && 'error' in session && session.error === 'not_patron') {
      const email = encodeURIComponent((session as any).attemptedEmail || '')
      const name = encodeURIComponent((session as any).attemptedName || '')
      router.push(`/login?error=not_patron&email=${email}&name=${name}`)
      return
    }

    // Check if user is not authenticated or not an active patron
    if (!session || !session.user?.isActivePatron) {
      router.push("/login")
      return
    }

    // Additional check for creator-only pages
    if (requireCreator && !session.user?.isCreator) {
      router.push("/")
      return
    }
  }, [session, status, router, requireCreator])

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-red-600/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session || !session.user?.isActivePatron) {
    return null
  }

  // Don't render anything if creator required but user is not creator
  if (requireCreator && !session.user?.isCreator) {
    return null
  }

  // Render children if authenticated
  return <>{children}</>
}