// src/lib/rate-limit-helpers.ts
import { Redis } from '@upstash/redis'
import { RateLimiter, RATE_LIMITS, type RateLimitType } from './rate-limiter'
import { getSupabaseAdmin } from './supabase'

// Initialize Redis client (same as in rate-limiter.ts)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

interface RateLimitUser {
  identifier: string
  type: RateLimitType
  count: number
  email?: string
}

/**
 * Get top users by rate limit usage
 */
export async function getTopRateLimitUsers(limit: number = 10): Promise<RateLimitUser[]> {
  const topUsers: RateLimitUser[] = []
  
  try {
    // Scan through all rate limit keys
    for (const [type, config] of Object.entries(RATE_LIMITS)) {
      const pattern = `${config.keyPrefix}*`
      const keys = await scanRedisKeys(pattern, 100)
      
      for (const key of keys) {
        const identifier = key.replace(config.keyPrefix, '')
        const usage = await RateLimiter.getUsage(identifier, type as RateLimitType)
        
        if (usage.count > 0) {
          // Try to get user email if it's a user identifier
          let email: string | undefined
          if (identifier.startsWith('user:')) {
            const userId = identifier.replace('user:', '')
            email = await getUserEmail(userId)
          }
          
          topUsers.push({
            identifier,
            type: type as RateLimitType,
            count: usage.count,
            email,
          })
        }
      }
    }
    
    // Sort by count descending and return top N
    return topUsers
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  } catch (error) {
    console.error('[RateLimitHelpers] Error getting top users:', error)
    return []
  }
}

/**
 * Scan Redis keys with pattern (Redis SCAN implementation)
 */
async function scanRedisKeys(pattern: string, maxKeys: number = 100): Promise<string[]> {
  const keys: string[] = []
  let cursor = 0
  
  try {
    // Note: Upstash doesn't support SCAN directly, so we'll use a workaround
    // In production, you might want to maintain a separate set of active keys
    // For now, we'll return an empty array and log a note
    console.log('[RateLimitHelpers] Key scanning not fully implemented for Upstash')
    return []
  } catch (error) {
    console.error('[RateLimitHelpers] Error scanning keys:', error)
    return []
  }
}

/**
 * Get user email from database
 */
async function getUserEmail(userId: string): Promise<string | undefined> {
  try {
    const supabase = getSupabaseAdmin()
    
    // First check if it's a debug user
    if (userId.startsWith('debug-')) {
      return `${userId}@kamicontent.test`
    }
    
    // In a real implementation, you'd query your users table
    // For now, return undefined
    return undefined
  } catch (error) {
    console.error('[RateLimitHelpers] Error getting user email:', error)
    return undefined
  }
}

/**
 * Reset rate limit for a specific user
 */
export async function resetUserLimit(identifier: string, type: RateLimitType): Promise<boolean> {
  try {
    await RateLimiter.reset(identifier, type)
    console.log(`[RateLimitHelpers] Reset ${type} limit for ${identifier}`)
    return true
  } catch (error) {
    console.error('[RateLimitHelpers] Error resetting limit:', error)
    return false
  }
}

/**
 * Increment a metric (for monitoring)
 */
export function incrementMetric(metric: string, tags?: Record<string, string>): void {
  // In production, send to your monitoring service (DataDog, New Relic, etc.)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Metric] ${metric}`, tags || {})
  }
  
  // Example DataDog implementation:
  // if (process.env.DATADOG_API_KEY) {
  //   datadogClient.increment(metric, 1, tags)
  // }
}

/**
 * Log error with context (for error tracking)
 */
export function logError(error: {
  endpoint: string
  error: string
  stack?: string
  context?: Record<string, any>
}): void {
  // In production, send to error tracking service (Sentry, Rollbar, etc.)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', error)
  }
  
  // Example Sentry implementation:
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(new Error(error.error), {
  //     tags: { endpoint: error.endpoint },
  //     extra: { stack: error.stack, ...error.context }
  //   })
  // }
}

/**
 * Track performance metric
 */
export function trackPerformance(
  metric: string,
  value: number,
  tags: Record<string, string> = {}
): void {
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric}: ${value}ms`, tags)
  }
  
  // Example implementation:
  // if (process.env.MONITORING_ENABLED) {
  //   monitoringClient.timing(metric, value, tags)
  // }
}

/**
 * Check if user is suspicious based on rate limit patterns
 */
export async function checkSuspiciousRateLimitActivity(
  identifier: string
): Promise<{
  suspicious: boolean
  reasons: string[]
  score: number
}> {
  const reasons: string[] = []
  let score = 0
  
  try {
    // Check usage across all rate limit types
    for (const [type, config] of Object.entries(RATE_LIMITS)) {
      const usage = await RateLimiter.getUsage(identifier, type as RateLimitType)
      const percentage = (usage.count / config.maxRequests) * 100
      
      // Flag if consistently hitting limits
      if (percentage > 90) {
        reasons.push(`Near ${type} limit (${percentage.toFixed(0)}%)`)
        score += 20
      }
      
      // Very suspicious if maxing out multiple limits
      if (percentage >= 100) {
        reasons.push(`Exceeded ${type} limit`)
        score += 30
      }
    }
    
    // Check for automated patterns
    const downloadUsage = await RateLimiter.getUsage(identifier, 'DOWNLOAD')
    const viewUsage = await RateLimiter.getUsage(identifier, 'IMAGE_VIEW')
    
    // Suspicious if high download to view ratio
    if (downloadUsage.count > 0 && viewUsage.count > 0) {
      const ratio = downloadUsage.count / viewUsage.count
      if (ratio > 0.5) {
        reasons.push(`High download ratio: ${(ratio * 100).toFixed(0)}%`)
        score += 25
      }
    }
    
    return {
      suspicious: score >= 50,
      reasons,
      score,
    }
  } catch (error) {
    console.error('[RateLimitHelpers] Error checking suspicious activity:', error)
    return { suspicious: false, reasons: [], score: 0 }
  }
}

/**
 * Get rate limit stats for monitoring dashboard
 */
export async function getRateLimitStats(): Promise<{
  totalRequests: number
  blockedRequests: number
  uniqueUsers: number
  topOffenders: RateLimitUser[]
}> {
  // This would need proper implementation with Redis tracking
  // For now, return mock data
  return {
    totalRequests: 0,
    blockedRequests: 0,
    uniqueUsers: 0,
    topOffenders: await getTopRateLimitUsers(5),
  }
}