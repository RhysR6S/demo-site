// src/lib/rate-limiter.ts
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Initialize Redis client (using Upstash for serverless compatibility)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limit configurations per action type
export const RATE_LIMITS = {
  // Image viewing limits - adjusted for 140 images per set
  IMAGE_VIEW: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // Allow viewing ~2 full sets per minute
    keyPrefix: 'rl:img:',
  },
  // Content set browsing
  SET_VIEW: {
    windowMs: 60 * 1000,
    maxRequests: 300, // Browse up to 60 sets per minute
    keyPrefix: 'rl:set:',
  },
  // Download limits (for premium tiers)
  DOWNLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 250, // 50 downloads per hour for Silver+ tiers
    keyPrefix: 'rl:dl:',
  },
  // API calls
  API: {
    windowMs: 60 * 1000,
    maxRequests: 500, // Increased for legitimate browsing
    keyPrefix: 'rl:api:',
  },
  // Authentication attempts
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // Allow multiple login flows (each flow = ~5 API calls)
    keyPrefix: 'rl:auth:',
  },
  // Suspicious activity - rapid bulk viewing
  BULK_VIEW: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 2000, // Max 1000 images in 5 minutes (~1.4 sets/minute sustained)
    keyPrefix: 'rl:bulk:',
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Sliding window rate limiter using Redis sorted sets
 * More accurate than fixed window, prevents burst abuse
 */
export class RateLimiter {
  /**
   * Check if a request should be rate limited
   */
  static async checkLimit(
    identifier: string,
    type: RateLimitType = 'API',
    customLimit?: number
  ): Promise<RateLimitResult> {
    const config = RATE_LIMITS[type]
    const limit = customLimit || config.maxRequests
    const windowMs = config.windowMs
    const key = `${config.keyPrefix}${identifier}`
    
    const now = Date.now()
    const windowStart = now - windowMs
    
    try {
      // Only clean up 1% of the time (probabilistic cleanup)
      if (Math.random() < 0.01) {
        await redis.zremrangebyscore(key, 0, windowStart)
      }
      
      // Count recent requests
      const count = await redis.zcount(key, windowStart, now)
      
      if (count >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: Math.ceil((now + windowMs) / 1000),
          retryAfter: Math.ceil(windowMs / 1000),
        }
      }
      
      // Add current request
      const memberId = `${now}-${Math.random().toString(36).substring(7)}`
      await redis.zadd(key, { score: now, member: memberId })
      await redis.expire(key, Math.ceil(windowMs / 1000))
      
      return {
        success: true,
        limit,
        remaining: Math.max(0, limit - count - 1),
        reset: Math.ceil((now + windowMs) / 1000),
      }
    } catch (error) {
      console.error('[RateLimiter] Redis error:', error)
      return {
        success: true,
        limit,
        remaining: 1,
        reset: Math.ceil((now + windowMs) / 1000),
      }
    }
  }
  
  /**
   * Get current usage stats for an identifier
   */
  static async getUsage(
    identifier: string,
    type: RateLimitType = 'API'
  ): Promise<{ count: number; windowMs: number }> {
    const config = RATE_LIMITS[type]
    const key = `${config.keyPrefix}${identifier}`
    const windowStart = Date.now() - config.windowMs
    
    try {
      // Remove old entries and count current
      await redis.zremrangebyscore(key, 0, windowStart)
      const count = await redis.zcard(key) || 0
      
      return { count, windowMs: config.windowMs }
    } catch (error) {
      console.error('[RateLimiter] Usage check error:', error)
      return { count: 0, windowMs: config.windowMs }
    }
  }
  
  /**
   * Reset limits for a specific identifier (e.g., after payment upgrade)
   */
  static async reset(identifier: string, type?: RateLimitType): Promise<void> {
    try {
      if (type) {
        const config = RATE_LIMITS[type]
        await redis.del(`${config.keyPrefix}${identifier}`)
      } else {
        // Reset all limits for this identifier
        const pipeline = redis.pipeline()
        for (const [_, config] of Object.entries(RATE_LIMITS)) {
          pipeline.del(`${config.keyPrefix}${identifier}`)
        }
        await pipeline.exec()
      }
    } catch (error) {
      console.error('[RateLimiter] Reset error:', error)
    }
  }
  
  /**
   * Get identifier from request (user ID or IP)
   */
  static async getIdentifier(request: NextRequest): Promise<string> {
    // Try to get user ID from token
    const token = await getToken({ req: request })
    if (token?.sub) {
      return `user:${token.sub}`
    }
    
    // Fall back to IP address
    const ip = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    
    return `ip:${ip}`
  }
  
  /**
   * Apply rate limit headers to response
   */
  static applyHeaders(
    headers: Headers,
    result: RateLimitResult,
    type: RateLimitType = 'API'
  ): void {
    headers.set('X-RateLimit-Limit', result.limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', result.reset.toString())
    headers.set('X-RateLimit-Type', type)
    
    if (result.retryAfter) {
      headers.set('Retry-After', result.retryAfter.toString())
    }
  }
}

/**
 * Rate limiting middleware for Next.js
 */
export async function withRateLimit(
  request: NextRequest,
  type: RateLimitType = 'API',
  customLimit?: number
): Promise<Response | null> {
  const identifier = await RateLimiter.getIdentifier(request)
  const result = await RateLimiter.checkLimit(identifier, type, customLimit)
  
  if (!result.success) {
    const response = new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`,
        limit: result.limit,
        type,
        reset: new Date(result.reset * 1000).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    
    RateLimiter.applyHeaders(response.headers, result, type)
    return response
  }
  
  // Rate limit passed - return null to continue
  return null
}
