// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { RateLimiter, withRateLimit, RATE_LIMITS, type RateLimitType } from "@/lib/rate-limiter"
import { AntiScrapingSystem } from "@/lib/anti-scraping"

// Define route types for better organization
const ROUTES = {
  PUBLIC: [
    '/login', 
    '/api/auth', 
    '/auth', 
    '/privacy',
    '/commissions/public',
    '/api/commissions/public'
  ],
  ADMIN: '/admin',
  API: '/api',
  STATIC: ['/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml'],
  IMAGES: '/api/image',
  THUMBNAILS: '/api/thumbnail',
  CONTENT: '/api/content',
  DOWNLOAD: '/api/download',
  COMMISSIONS: '/commissions',
  ADMIN_COMMISSIONS: '/admin/commissions',
  API_COMMISSIONS: '/api/commissions',
  API_ADMIN_COMMISSIONS: '/api/admin/commissions',
  API_CHARACTERS: '/api/characters',
  PRIVACY: '/privacy',
  API_PRIVACY: '/api/privacy',
} as const

// Route-specific rate limit mappings
const ROUTE_LIMITS: Record<string, RateLimitType> = {
  '/api/image': 'IMAGE_VIEW',
  '/api/thumbnail': 'IMAGE_VIEW',
  '/api/content': 'SET_VIEW',
  '/api/download': 'DOWNLOAD',
  '/api': 'API',
}

// Get Supabase URL from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_DOMAIN = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : ''

// Security headers with fixed CSP for Supabase
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Powered-By': 'PhotoVault',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' https: data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `connect-src 'self' https://${SUPABASE_DOMAIN} wss://${SUPABASE_DOMAIN} https://*.r2.cloudflarestorage.com https://*.r2.dev`,
    "media-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

// Helper function to get client IP
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') ||
         'unknown'
}

// Determine rate limit type based on path
function getRateLimitType(pathname: string): RateLimitType | null {
  for (const [route, type] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(route)) {
      return type as RateLimitType
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestId = crypto.randomUUID()

  // Skip middleware for static files
  if (ROUTES.STATIC.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  try {
    const clientIp = getClientIp(request)

    // Clone the request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-request-id', requestId)
    requestHeaders.set('x-client-ip', clientIp)

    // Check if route is public
    const isPublicRoute = ROUTES.PUBLIC.some(route => pathname.startsWith(route))

    if (!isPublicRoute) {
      // Get JWT token
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      })

      // Check for authentication error in token
      if (token?.authError) {
        console.warn('🚫 Auth error detected in token:', token.authError)

        // Redirect to error page with error details
        const errorUrl = new URL('/auth/error', request.url)
        errorUrl.searchParams.set('error', JSON.stringify(token.authError))
        return NextResponse.redirect(errorUrl)
      }

      // Check admin routes
      if (pathname.startsWith(ROUTES.ADMIN)) {
        if (!token?.isCreator) {
          console.warn('🚫 Non-creator tried to access admin:', {
            userId: token?.sub,
            pathname
          })
          return NextResponse.redirect(new URL('/login', request.url))
        }
      }
      // Check commission routes (creator or user with email) - but NOT public commission routes
      else if (pathname === ROUTES.COMMISSIONS || (pathname === ROUTES.API_COMMISSIONS && !pathname.includes('/public'))) {
        if (!token?.email) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
      }
      // Check admin commission routes
      else if (pathname === ROUTES.ADMIN_COMMISSIONS || pathname.startsWith(ROUTES.API_ADMIN_COMMISSIONS)) {
        if (!token?.isCreator) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
      }
      // Check character API route - but allow for public commission page
      else if (pathname === ROUTES.API_CHARACTERS) {
        const referer = request.headers.get('referer')
        const isFromPublicCommissionPage = referer && referer.includes('/commissions/public')

        if (!isFromPublicCommissionPage && !token?.email) {
          return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
      // Check all other protected routes
      else if (!token) {
        // No token at all - user not logged in, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
      }
      else if (!token.isActivePatron) {
        // Has token but not active patron - show error
        console.warn('🚫 Unauthorized access attempt:', {
          userId: token.sub,
          pathname,
          isActivePatron: token.isActivePatron,
          isCreator: token.isCreator
        })

        if (pathname.startsWith(ROUTES.API)) {
          return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Redirect to error page
        const errorUrl = new URL('/auth/error', request.url)
        errorUrl.searchParams.set('error', JSON.stringify({
          code: 'not_patron',
          message: 'You need an active Patreon membership to access this content',
          timestamp: new Date().toISOString(),
          userId: token.sub,
          attemptedEmail: token.email
        }))
        return NextResponse.redirect(errorUrl)
      }
    }
    
    // Apply rate limiting ONLY for auth routes (brute force protection)
    // EXCLUDE OAuth callbacks and read-only endpoints - they're safe
    const authReadOnlyEndpoints = ['/callback', '/session', '/providers', '/csrf']
    const shouldRateLimitAuth = pathname.startsWith('/api/auth') &&
      !authReadOnlyEndpoints.some(endpoint => pathname.includes(endpoint))

    if (shouldRateLimitAuth) {
      const rateLimitResponse = await withRateLimit(request, 'AUTH')

      if (rateLimitResponse) {
        console.warn(`[RateLimit] Auth limit exceeded - IP: ${clientIp}`)
        return rateLimitResponse
      }
    }

    // Optional: Rate limit downloads for expensive operations
    if (pathname.startsWith(ROUTES.DOWNLOAD)) {
      const rateLimitResponse = await withRateLimit(request, 'DOWNLOAD')

      if (rateLimitResponse) {
        console.warn(`[RateLimit] Download limit exceeded - IP: ${clientIp}`)
        return rateLimitResponse
      }
    }
    
    // Create response with security headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    })
    
    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error: any) {
    console.error('[Middleware] Error:', error)
    
    // Redirect to error page with details
    const errorUrl = new URL('/auth/error', request.url)
    errorUrl.searchParams.set('error', JSON.stringify({
      code: 'unknown_error',
      message: 'An error occurred while verifying your authentication',
      details: error.message,
      stackTrace: error.stack,
      timestamp: new Date().toISOString()
    }))
    return NextResponse.redirect(errorUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}