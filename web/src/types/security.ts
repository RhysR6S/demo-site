// src/types/security.ts

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

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

export interface SecurityAlert {
  identifier: string
  patterns: Partial<ScrapingPattern>
  confidence: number
  timestamp: string
}

export interface RateLimitUser {
  identifier: string
  type: string
  count: number
  email?: string
}

export interface BanDetails {
  reason: string
  bannedAt: string
  duration: number
}

// Monitoring metrics
export interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  uniqueUsers: number
  suspiciousActivity: number
  averageConfidence: number
}

// User activity patterns
export interface UserBehavior {
  viewingSpeed: number // ms between views
  downloadRatio: number
  uniqueIPs: number
  sequentialAccess: boolean
  lastSeen: Date
}