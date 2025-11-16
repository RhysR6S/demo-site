'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AlertTriangle, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { AUTH_ERROR_MESSAGES, isAuthErrorCode, type AuthError } from '@/types/auth-errors'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [authError, setAuthError] = useState<AuthError | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    
    if (errorParam) {
      try {
        // Check if it's a JSON error object
        if (errorParam.startsWith('{')) {
          setAuthError(JSON.parse(decodeURIComponent(errorParam)))
        } else {
          // Simple error code - use type guard
          const code = isAuthErrorCode(errorParam) ? errorParam : 'unknown_error'
          setAuthError({
            code,
            message: AUTH_ERROR_MESSAGES[code].description,
            timestamp: new Date().toISOString()
          })
        }
      } catch (e) {
        setAuthError({
          code: 'unknown_error',
          message: errorParam,
          timestamp: new Date().toISOString()
        })
      }
    }
  }, [searchParams])

  const errorInfo = authError 
    ? AUTH_ERROR_MESSAGES[authError.code] || AUTH_ERROR_MESSAGES.unknown_error
    : AUTH_ERROR_MESSAGES.unknown_error

  const copyErrorDetails = () => {
    if (!authError) return
    
    const details = `
Error Report
============
Error Code: ${authError.code}
Message: ${authError.message}
Timestamp: ${authError.timestamp}
User ID: ${authError.userId || 'N/A'}
Email: ${authError.attemptedEmail || 'N/A'}

Details:
${authError.details || 'N/A'}

Stack Trace:
${authError.stackTrace || 'N/A'}
    `.trim()
    
    navigator.clipboard.writeText(details)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">
                {errorInfo.title}
              </h1>
              <p className="text-gray-400">
                {errorInfo.description}
              </p>
            </div>
          </div>

          {/* Specific error handling */}
          {authError?.code === 'not_patron' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">
                How to get access:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                <li>Visit our Patreon page</li>
                <li>Choose a membership tier</li>
                <li>Complete the subscription</li>
                <li>Return here and try logging in again</li>
              </ol>
              <a
                href={`https://www.patreon.com/${process.env.NEXT_PUBLIC_PATREON_CREATOR_USERNAME || 'KamiXXX'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#FF424D] hover:bg-[#FF424D]/90 text-white rounded-lg transition-colors"
              >
                Visit Patreon
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Error Details */}
          {authError && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">
                  Error Details
                </h3>
                <button
                  onClick={copyErrorDetails}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 text-sm rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Details
                    </>
                  )}
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm font-mono">
                <div>
                  <span className="text-gray-500">Error Code:</span>{' '}
                  <span className="text-red-400">{authError.code}</span>
                </div>
                <div>
                  <span className="text-gray-500">Message:</span>{' '}
                  <span className="text-gray-300">{authError.message}</span>
                </div>
                {authError.userId && (
                  <div>
                    <span className="text-gray-500">User ID:</span>{' '}
                    <span className="text-gray-300">{authError.userId}</span>
                  </div>
                )}
                {authError.attemptedEmail && (
                  <div>
                    <span className="text-gray-500">Email:</span>{' '}
                    <span className="text-gray-300">{authError.attemptedEmail}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Time:</span>{' '}
                  <span className="text-gray-300">
                    {new Date(authError.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {authError.details && (
                <details className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-300 hover:text-white">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-400 overflow-x-auto">
                    {authError.details}
                  </pre>
                </details>
              )}

              {authError.stackTrace && (
                <details className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-300 hover:text-white">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                    {authError.stackTrace}
                  </pre>
                </details>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  💡 If this error persists, please copy the error details above and send them to the creator for assistance.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-zinc-800">
            <Link
              href="/login"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-center rounded-lg transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help?{' '}
          <a
            href="mailto:support@kamicontent.com"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}