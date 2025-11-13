// src/lib/anti-scraping.ts
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'
import { RateLimiter } from './rate-limiter'
import { incrementMetric } from './rate-limit-helpers'
import { getSupabaseAdmin } from './supabase'

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface ScrapingPattern {
  rapid_sequential: boolean
  no_interaction_time: boolean
  automated_headers: boolean
  bulk_downloading: boolean
  ip_hopping: boolean
}

export interface ScrapingAnalysis {
  suspicious: boolean
  confidence: number
  patterns: Partial<ScrapingPattern>
  shouldBlock: boolean
}

/**
 * Anti-scraping system that respects user consent
 */
export class AntiScrapingSystem {
  private static readonly BEHAVIOR_KEY_PREFIX = 'behavior:'
  private static readonly BANNED_KEY = 'banned:users'
  private static readonly CONFIDENCE_THRESHOLD = 80 // Auto-block threshold
  
  /**
   * Check if user has given tracking consent
   */
  private static async hasTrackingConsent(userId: string): Promise<boolean> {
    // Extract user ID from identifier if it contains session info
    const actualUserId = userId.split(':')[0]
    
    try {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('user_privacy_consent')
        .select('tracking_consent')
        .eq('user_id', actualUserId)
        .single()
      
      return data?.tracking_consent ?? false
    } catch (error) {
      return false
    }
  }
  
  /**
   * Analyze request for scraping patterns
   */
  static async analyzeRequest(
    request: NextRequest,
    identifier: string,
    resourceType: 'image' | 'set' = 'image'
  ): Promise<ScrapingAnalysis> {
    const patterns: Partial<ScrapingPattern> = {}
    let totalConfidence = 0
    
    // Check if user is already banned
    if (await this.isUserBanned(identifier)) {
      return {
        suspicious: true,
        confidence: 100,
        patterns: { bulk_downloading: true },
        shouldBlock: true,
      }
    }
    
    // Only perform behavior analysis if user has consented to tracking
    const hasConsent = await this.hasTrackingConsent(identifier)
    
    if (hasConsent) {
      // Check for rapid sequential access
      const sequentialResult = await this.checkSequentialAccess(identifier, resourceType)
      if (sequentialResult.suspicious) {
        patterns.rapid_sequential = true
        totalConfidence += sequentialResult.confidence
      }
      
      // Check interaction patterns
      const interactionResult = await this.checkInteractionTime(identifier)
      if (interactionResult.suspicious) {
        patterns.no_interaction_time = true
        totalConfidence += interactionResult.confidence
      }
      
      // Check download patterns
      const downloadResult = await this.checkDownloadPatterns(identifier)
      if (downloadResult.suspicious) {
        patterns.bulk_downloading = true
        totalConfidence += downloadResult.confidence
      }
      
      // Check for IP hopping
      const ipResult = await this.checkIPHopping(identifier, request)
      if (ipResult.suspicious) {
        patterns.ip_hopping = true
        totalConfidence += ipResult.confidence
      }
    }
    
    // Always check automated headers (doesn't require tracking consent)
    const headerResult = this.checkAutomatedHeaders(request)
    if (headerResult.suspicious) {
      patterns.automated_headers = true
      totalConfidence += headerResult.confidence
    }
    
    // Calculate final confidence (max 100)
    const confidence = Math.min(totalConfidence, 100)
    const shouldBlock = confidence >= this.CONFIDENCE_THRESHOLD
    
    // Log suspicious activity
    if (confidence > 50) {
      await this.logSuspiciousActivity(identifier, patterns, confidence)
      
      incrementMetric('security.suspicious_activity', {
        confidence: confidence.toString(),
        blocked: shouldBlock.toString(),
      })
    }
    
    // Auto-ban if confidence is too high
    if (shouldBlock && hasConsent) {
      await this.banUser(
        identifier,
        `Automated ban: ${confidence}% confidence. Patterns: ${Object.keys(patterns).join(', ')}`
      )
    }
    
    return {
      suspicious: confidence > 30,
      confidence,
      patterns,
      shouldBlock,
    }
  }
  
  /**
   * Check for rapid sequential access patterns
   */
  private static async checkSequentialAccess(
    identifier: string,
    resourceType: string
  ): Promise<{ suspicious: boolean; confidence: number }> {
    try {
      const key = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:${resourceType}:times`
      const now = Date.now()

      // Add current access time
      await redis.zadd(key, { score: now, member: now })
      await redis.expire(key, 300) // 5 minutes

      // Get accesses in last minute
      const oneMinuteAgo = now - 60000
      const recentAccesses = await redis.zcount(key, oneMinuteAgo, now)

      // Suspicious thresholds
      if (resourceType === 'image') {
        if (recentAccesses > 60) return { suspicious: true, confidence: 40 }
        if (recentAccesses > 30) return { suspicious: true, confidence: 20 }
      } else {
        if (recentAccesses > 10) return { suspicious: true, confidence: 30 }
        if (recentAccesses > 5) return { suspicious: true, confidence: 15 }
      }

      return { suspicious: false, confidence: 0 }
    } catch (error) {
      console.error('[AntiScraping] Error checking sequential access:', error)
      return { suspicious: false, confidence: 0 } // Fail open
    }
  }
  
  /**
   * Check for lack of normal interaction time
   */
  private static async checkInteractionTime(
    identifier: string
  ): Promise<{ suspicious: boolean; confidence: number }> {
    try {
      const key = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:image:times`
      const now = Date.now()
      const tenSecondsAgo = now - 10000

      // Get recent access times
      const recentTimes = await redis.zrange(key, tenSecondsAgo, now, {
        byScore: true,
      })

      if (recentTimes.length < 2) {
        return { suspicious: false, confidence: 0 }
      }

      // Calculate time between accesses
      const intervals: number[] = []
      for (let i = 1; i < recentTimes.length; i++) {
        intervals.push(Number(recentTimes[i]) - Number(recentTimes[i - 1]))
      }

      // Check if intervals are too consistent (automated)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2)
      }, 0) / intervals.length

      // Low variance suggests automation
      if (variance < 100 && avgInterval < 2000) {
        return { suspicious: true, confidence: 25 }
      }

      return { suspicious: false, confidence: 0 }
    } catch (error) {
      console.error('[AntiScraping] Error checking interaction time:', error)
      return { suspicious: false, confidence: 0 } // Fail open
    }
  }
  
  /**
   * Check for automated request headers
   */
  private static checkAutomatedHeaders(
    request: NextRequest
  ): { suspicious: boolean; confidence: number } {
    const userAgent = request.headers.get('user-agent') || ''
    const acceptLanguage = request.headers.get('accept-language')
    const acceptEncoding = request.headers.get('accept-encoding')
    
    let confidence = 0
    
    // Check for common automation tools
    const automationKeywords = [
      'headless', 'phantom', 'selenium', 'puppeteer', 'playwright',
      'wget', 'curl', 'python-requests', 'scrapy', 'bot', 'spider'
    ]
    
    if (automationKeywords.some(keyword => userAgent.toLowerCase().includes(keyword))) {
      confidence += 30
    }
    
    // Missing typical browser headers
    if (!acceptLanguage || !acceptEncoding) {
      confidence += 10
    }
    
    // Suspicious user agents
    if (userAgent.length < 20 || userAgent === 'Mozilla/5.0') {
      confidence += 15
    }
    
    return {
      suspicious: confidence > 0,
      confidence,
    }
  }
  
  /**
   * Check download patterns
   */
  private static async checkDownloadPatterns(
    identifier: string
  ): Promise<{ suspicious: boolean; confidence: number }> {
    try {
      const viewKey = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:views`
      const downloadKey = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:downloads`

      const [viewsStr, downloadsStr] = await redis.mget(viewKey, downloadKey)
      const views = viewsStr ? parseInt(String(viewsStr)) : 0
      const downloads = downloadsStr ? parseInt(String(downloadsStr)) : 0

      if (views === 0) return { suspicious: false, confidence: 0 }

      const ratio = downloads / views

      // Suspicious if downloading everything they view
      if (ratio > 0.8) return { suspicious: true, confidence: 30 }
      if (ratio > 0.5) return { suspicious: true, confidence: 15 }

      return { suspicious: false, confidence: 0 }
    } catch (error) {
      console.error('[AntiScraping] Error checking download patterns:', error)
      return { suspicious: false, confidence: 0 } // Fail open
    }
  }
  
  /**
   * Track download ratio
   */
  static async trackDownloadRatio(identifier: string): Promise<number> {
    try {
      const viewKey = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:views`
      const downloadKey = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:downloads`

      // Increment download count
      await redis.incr(downloadKey)
      await redis.expire(downloadKey, 86400) // 24 hours

      const [viewsStr, downloadsStr] = await redis.mget(viewKey, downloadKey)
      const views = viewsStr ? parseInt(String(viewsStr)) : 0
      const downloads = downloadsStr ? parseInt(String(downloadsStr)) : 0

      if (views === 0) return 0
      return downloads / views
    } catch (error) {
      console.error('[AntiScraping] Error tracking download ratio:', error)
      return 0 // Fail gracefully
    }
  }
  
  /**
   * Check for IP hopping behavior
   */
  private static async checkIPHopping(
    identifier: string,
    request: NextRequest
  ): Promise<{ suspicious: boolean; confidence: number }> {
    try {
      const key = `${this.BEHAVIOR_KEY_PREFIX}${identifier}:ips`
      const currentIP = this.getClientIP(request)

      // Track unique IPs
      await redis.sadd(key, currentIP)
      await redis.expire(key, 3600) // 1 hour

      const uniqueIPs = await redis.scard(key)

      // Suspicious if more than 3 IPs in an hour
      if (uniqueIPs > 5) {
        return { suspicious: true, confidence: 30 }
      } else if (uniqueIPs > 3) {
        return { suspicious: true, confidence: 15 }
      }

      return { suspicious: false, confidence: 0 }
    } catch (error) {
      console.error('[AntiScraping] Error checking IP hopping:', error)
      return { suspicious: false, confidence: 0 } // Fail open
    }
  }
  
  /**
   * Check if user is banned
   */
  private static async isUserBanned(identifier: string): Promise<boolean> {
    try {
      const result = await redis.sismember(this.BANNED_KEY, identifier)
      return result === 1
    } catch (error) {
      console.error('[AntiScraping] Error checking ban status:', error)
      return false // Fail open - don't block on error
    }
  }
  
  /**
   * Ban a user
   */
  static async banUser(
    identifier: string,
    reason: string,
    duration: number = 24 * 60 * 60 // 24 hours default
  ): Promise<void> {
    try {
      await redis.sadd(this.BANNED_KEY, identifier)

      // Store ban details
      await redis.setex(
        `${this.BANNED_KEY}:${identifier}:details`,
        duration,
        JSON.stringify({
          reason,
          bannedAt: new Date().toISOString(),
          duration,
        })
      )

      // Clear their rate limits to prevent any access
      await RateLimiter.reset(identifier)

      incrementMetric('security.user.banned', { reason })
    } catch (error) {
      console.error('[AntiScraping] Error banning user:', error)
      // Still increment metric even if Redis fails
      incrementMetric('security.user.banned', { reason, error: 'redis_failed' })
    }
  }
  
  /**
   * Log suspicious activity for review
   */
  private static async logSuspiciousActivity(
    identifier: string,
    patterns: Partial<ScrapingPattern>,
    confidence: number
  ): Promise<void> {
    try {
      const key = `security:alerts:${new Date().toISOString().split('T')[0]}`

      await redis.zadd(key, {
        score: confidence,
        member: JSON.stringify({
          identifier,
          patterns,
          confidence,
          timestamp: new Date().toISOString(),
        }),
      })

      await redis.expire(key, 7 * 24 * 60 * 60) // Keep for 7 days
    } catch (error) {
      console.error('[AntiScraping] Error logging suspicious activity:', error)
      // Don't throw - logging failure shouldn't block the request
    }
  }
  
  /**
   * Get client IP from request
   */
  private static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown'
  }
}
