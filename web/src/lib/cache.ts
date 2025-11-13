// src/lib/cache.ts
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache key prefixes for organization
const CACHE_PREFIXES = {
  SIGNED_URL: 'signed-url:',
  GALLERY: 'gallery:',
  USER_SESSION: 'session:',
  SET_DATA: 'set:',
  USER_DATA: 'user-data:',
} as const

// TTL values in seconds
const CACHE_TTL = {
  SIGNED_URL: 240, // 4 minutes (URLs expire in 5 min)
  GALLERY: 300, // 5 minutes
  USER_SESSION: 1800, // 30 minutes
  SET_DATA: 600, // 10 minutes
  USER_DATA: 300, // 5 minutes
} as const

/**
 * Cache signed R2 URL
 * Key includes r2Key and userTier for tier-specific caching
 * Returns { url, cacheStatus } to track HIT/MISS
 */
export async function getCachedSignedUrl(r2Key: string, userTier?: string): Promise<{ url: string | null; cacheStatus: 'HIT' | 'MISS' | 'ERROR' }> {
  try {
    const cacheKey = userTier
      ? `${CACHE_PREFIXES.SIGNED_URL}${r2Key}:${userTier}`
      : `${CACHE_PREFIXES.SIGNED_URL}${r2Key}`

    const cached = await redis.get<string>(cacheKey)

    if (cached) {
      console.log(`[Cache] HIT: Signed URL for ${r2Key}`)
      return { url: cached, cacheStatus: 'HIT' }
    }

    return { url: null, cacheStatus: 'MISS' }
  } catch (error) {
    console.error('[Cache] Error getting signed URL:', error)
    return { url: null, cacheStatus: 'ERROR' }
  }
}

export async function setCachedSignedUrl(r2Key: string, url: string, userTier?: string): Promise<void> {
  try {
    const cacheKey = userTier
      ? `${CACHE_PREFIXES.SIGNED_URL}${r2Key}:${userTier}`
      : `${CACHE_PREFIXES.SIGNED_URL}${r2Key}`

    await redis.setex(cacheKey, CACHE_TTL.SIGNED_URL, url)
    console.log(`[Cache] SET: Signed URL for ${r2Key} (TTL: ${CACHE_TTL.SIGNED_URL}s)`)
  } catch (error) {
    console.error('[Cache] Error setting signed URL:', error)
    // Don't throw - fail gracefully
  }
}

/**
 * Cache gallery data
 * Key includes filters for filter-specific caching
 */
export async function getCachedGallery(filters: string): Promise<any | null> {
  try {
    const cacheKey = `${CACHE_PREFIXES.GALLERY}${filters}`
    const cached = await redis.get<string>(cacheKey)

    if (cached) {
      console.log(`[Cache] HIT: Gallery data for filters: ${filters}`)
      return typeof cached === 'string' ? JSON.parse(cached) : cached
    }

    return null
  } catch (error) {
    console.error('[Cache] Error getting gallery data:', error)
    return null
  }
}

export async function setCachedGallery(filters: string, data: any): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIXES.GALLERY}${filters}`
    await redis.setex(cacheKey, CACHE_TTL.GALLERY, JSON.stringify(data))
    console.log(`[Cache] SET: Gallery data (TTL: ${CACHE_TTL.GALLERY}s)`)
  } catch (error) {
    console.error('[Cache] Error setting gallery data:', error)
  }
}

/**
 * Invalidate gallery cache
 * Call this when content is created/updated/deleted
 */
export async function invalidateGalleryCache(): Promise<void> {
  try {
    // Get all gallery cache keys
    const keys = await redis.keys(`${CACHE_PREFIXES.GALLERY}*`)

    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`[Cache] INVALIDATE: Cleared ${keys.length} gallery cache entries`)
    }
  } catch (error) {
    console.error('[Cache] Error invalidating gallery cache:', error)
  }
}

/**
 * Cache user session data
 */
export async function getCachedUserSession(userId: string): Promise<any | null> {
  try {
    const cacheKey = `${CACHE_PREFIXES.USER_SESSION}${userId}`
    const cached = await redis.get<string>(cacheKey)

    if (cached) {
      console.log(`[Cache] HIT: User session for ${userId}`)
      return typeof cached === 'string' ? JSON.parse(cached) : cached
    }

    return null
  } catch (error) {
    console.error('[Cache] Error getting user session:', error)
    return null
  }
}

export async function setCachedUserSession(userId: string, data: any): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIXES.USER_SESSION}${userId}`
    await redis.setex(cacheKey, CACHE_TTL.USER_SESSION, JSON.stringify(data))
    console.log(`[Cache] SET: User session (TTL: ${CACHE_TTL.USER_SESSION}s)`)
  } catch (error) {
    console.error('[Cache] Error setting user session:', error)
  }
}

/**
 * Cache content set data
 */
export async function getCachedSetData(setId: string): Promise<any | null> {
  try {
    const cacheKey = `${CACHE_PREFIXES.SET_DATA}${setId}`
    const cached = await redis.get<string>(cacheKey)

    if (cached) {
      console.log(`[Cache] HIT: Set data for ${setId}`)
      return typeof cached === 'string' ? JSON.parse(cached) : cached
    }

    return null
  } catch (error) {
    console.error('[Cache] Error getting set data:', error)
    return null
  }
}

export async function setCachedSetData(setId: string, data: any): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIXES.SET_DATA}${setId}`
    await redis.setex(cacheKey, CACHE_TTL.SET_DATA, JSON.stringify(data))
    console.log(`[Cache] SET: Set data (TTL: ${CACHE_TTL.SET_DATA}s)`)
  } catch (error) {
    console.error('[Cache] Error setting set data:', error)
  }
}

/**
 * Invalidate specific set cache
 */
export async function invalidateSetCache(setId: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIXES.SET_DATA}${setId}`
    await redis.del(cacheKey)
    console.log(`[Cache] INVALIDATE: Cleared set cache for ${setId}`)
  } catch (error) {
    console.error('[Cache] Error invalidating set cache:', error)
  }
}

/**
 * Cache user-specific data (views, downloads, likes)
 */
export async function getCachedUserData(userId: string, setIds: string[]): Promise<any | null> {
  try {
    const cacheKey = `${CACHE_PREFIXES.USER_DATA}${userId}:${setIds.join(',')}`
    const cached = await redis.get<string>(cacheKey)

    if (cached) {
      console.log(`[Cache] HIT: User data for ${userId}`)
      return typeof cached === 'string' ? JSON.parse(cached) : cached
    }

    return null
  } catch (error) {
    console.error('[Cache] Error getting user data:', error)
    return null
  }
}

export async function setCachedUserData(userId: string, setIds: string[], data: any): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIXES.USER_DATA}${userId}:${setIds.join(',')}`
    await redis.setex(cacheKey, CACHE_TTL.USER_DATA, JSON.stringify(data))
    console.log(`[Cache] SET: User data (TTL: ${CACHE_TTL.USER_DATA}s)`)
  } catch (error) {
    console.error('[Cache] Error setting user data:', error)
  }
}

/**
 * Helper to generate cache key from query parameters
 */
export function generateCacheKey(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort()
  const keyParts = sortedKeys.map(key => {
    const value = params[key]
    if (Array.isArray(value)) {
      return `${key}=${value.sort().join(',')}`
    }
    return `${key}=${value}`
  })
  return keyParts.join('&')
}

/**
 * Batch delete keys by pattern
 * Useful for cache invalidation
 */
export async function deleteKeysByPattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern)

    if (keys.length === 0) {
      return 0
    }

    await redis.del(...keys)
    console.log(`[Cache] BATCH DELETE: Cleared ${keys.length} keys matching ${pattern}`)
    return keys.length
  } catch (error) {
    console.error('[Cache] Error deleting keys by pattern:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  signedUrls: number
  gallery: number
  sessions: number
  sets: number
  userData: number
  total: number
}> {
  try {
    const [signedUrls, gallery, sessions, sets, userData] = await Promise.all([
      redis.keys(`${CACHE_PREFIXES.SIGNED_URL}*`).then(k => k.length),
      redis.keys(`${CACHE_PREFIXES.GALLERY}*`).then(k => k.length),
      redis.keys(`${CACHE_PREFIXES.USER_SESSION}*`).then(k => k.length),
      redis.keys(`${CACHE_PREFIXES.SET_DATA}*`).then(k => k.length),
      redis.keys(`${CACHE_PREFIXES.USER_DATA}*`).then(k => k.length),
    ])

    return {
      signedUrls,
      gallery,
      sessions,
      sets,
      userData,
      total: signedUrls + gallery + sessions + sets + userData
    }
  } catch (error) {
    console.error('[Cache] Error getting cache stats:', error)
    return {
      signedUrls: 0,
      gallery: 0,
      sessions: 0,
      sets: 0,
      userData: 0,
      total: 0
    }
  }
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(): Promise<void> {
  try {
    const prefixes = Object.values(CACHE_PREFIXES)

    for (const prefix of prefixes) {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }

    console.log('[Cache] CLEAR ALL: Cleared entire cache')
  } catch (error) {
    console.error('[Cache] Error clearing all cache:', error)
  }
}
