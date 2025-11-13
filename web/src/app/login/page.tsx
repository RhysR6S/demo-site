"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { AlertCircle } from 'lucide-react'
import { AUTH_ERROR_MESSAGES, isAuthErrorCode, type AuthError } from '@/types/auth-errors'

function SignInButton() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const errorParam = searchParams.get("error")
  const attemptedEmail = searchParams.get("email")
  const attemptedName = searchParams.get("name")
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [confirmedAge, setConfirmedAge] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  // Check for errors in URL or session
  useEffect(() => {
    if (errorParam) {
      try {
        if (errorParam.startsWith('{')) {
          setError(JSON.parse(decodeURIComponent(errorParam)))
        } else {
          const code = isAuthErrorCode(errorParam) ? errorParam : 'unknown_error'
          setError({
            code,
            message: AUTH_ERROR_MESSAGES[code].description,
            timestamp: new Date().toISOString()
          })
        }
      } catch (e) {
        console.error('Error parsing error parameter:', e)
        setError({
          code: 'unknown_error',
          message: errorParam,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Check session for error
    if (session && (session as any).error) {
      const sessionError = (session as any).error as AuthError
      setError(sessionError)
      
      // Redirect to error page with full details
      const errorJson = encodeURIComponent(JSON.stringify(sessionError))
      router.push(`/auth/error?error=${errorJson}`)
    }
  }, [errorParam, session, router])

  // Redirect authenticated users
  useEffect(() => {
    if (session?.user && !(session as any).error) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  const handleSignIn = async () => {
    if (!agreedToTerms || !confirmedAge) {
      alert('Please confirm you are 18+ and agree to our terms')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await signIn("patreon", { 
        callbackUrl,
        redirect: true
      })

      // If signIn returns (usually only on error), handle it
      if (result?.error) {
        setError({
          code: 'oauth_error',
          message: result.error,
          timestamp: new Date().toISOString()
        })
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error("Sign in error:", err)
      setError({
        code: 'unknown_error',
        message: err.message || 'Failed to initiate login',
        timestamp: new Date().toISOString()
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Error Display with new error handling */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-400 mb-1">
                {AUTH_ERROR_MESSAGES[error.code]?.title || 'Login Error'}
              </h3>
              <p className="text-sm text-gray-300">
                {error.message}
              </p>
              {error.code === 'not_patron' && (
                <div className="mt-3 space-y-2">
                  {(attemptedEmail || attemptedName || error.attemptedEmail) && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Attempting to sign in as:</p>
                      {(attemptedName || error.userId) && (
                        <p className="text-sm text-white font-medium">
                          {attemptedName ? decodeURIComponent(attemptedName) : error.userId}
                        </p>
                      )}
                      {(attemptedEmail || error.attemptedEmail) && (
                        <p className="text-sm text-gray-300">
                          {attemptedEmail ? decodeURIComponent(attemptedEmail) : error.attemptedEmail}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-400">
                    Not a patron yet?{' '}
                    <a 
                      href="https://www.patreon.com/DemoCreator" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 underline font-medium"
                    >
                      Become a patron
                    </a>
                  </p>
                  <p className="text-sm text-gray-400">
                    Already a patron? Make sure you're using the same account you use on Patreon.
                  </p>
                  {(error.details || error.stackTrace) && (
                    <button
                      onClick={() => {
                        const errorJson = encodeURIComponent(JSON.stringify(error))
                        router.push(`/auth/error?error=${errorJson}`)
                      }}
                      className="text-sm text-gray-400 hover:text-gray-300 underline"
                    >
                      View detailed error report
                    </button>
                  )}
                </div>
              )}
              {error.code !== 'not_patron' && (error.details || error.stackTrace) && (
                <button
                  onClick={() => {
                    const errorJson = encodeURIComponent(JSON.stringify(error))
                    router.push(`/auth/error?error=${errorJson}`)
                  }}
                  className="mt-2 text-sm text-gray-400 hover:text-gray-300 underline"
                >
                  View detailed error report
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Age Verification */}
      <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedAge}
            onChange={(e) => setConfirmedAge(e.target.checked)}
            className="mt-1 w-4 h-4 text-red-600 bg-zinc-800 border-zinc-600 rounded focus:ring-red-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">
            I confirm that I am at least 18 years of age and legally allowed to view adult content in my jurisdiction
          </span>
        </label>
      </div>

      {/* Terms Agreement */}
      <div className="p-4 bg-zinc-800/50 border border-white/10 rounded-lg">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 w-4 h-4 text-red-600 bg-zinc-800 border-zinc-600 rounded focus:ring-red-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">
            I agree to the{' '}
            <Link href="/privacy" className="text-red-400 hover:text-red-300 underline">
              Privacy Policy
            </Link>
            {' '}and understand that by connecting my Patreon account, I authorize KamiContent to access my membership information and collect usage data as described
          </span>
        </label>
      </div>

      {/* Sign In Button */}
      <button
        onClick={handleSignIn}
        disabled={isLoading || !agreedToTerms || !confirmedAge}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl"
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className="flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>
            </svg>
            Sign in with Patreon
          </span>
        )}
      </button>
    </div>
  )
}

function LoginContent() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo/Brand */}
          <div className="text-center">
            <div className="inline-block p-4 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-2xl shadow-red-600/25 mb-8">
              <h1 className="text-4xl font-bold text-white">K</h1>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to KamiContent</h2>
            <p className="text-gray-400">Exclusive content for active patrons</p>
          </div>

          {/* Sign-in Card */}
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <div className="space-y-6">
              {/* Benefits list */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">Access to exclusive photo sets</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">Early access to new content</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">Direct messaging with the creator</span>
                </div>
              </div>

              {/* Sign-in section with checkboxes */}
              <SignInButton />
            </div>
          </div>

          {/* Help text */}
          <p className="text-center text-sm text-gray-600">
            Don't have a Patreon membership?{' '}
            <a 
              href="https://www.patreon.com/DemoCreator" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              Become a patron
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-red-600/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
