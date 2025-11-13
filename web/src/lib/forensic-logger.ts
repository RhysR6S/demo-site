// src/lib/forensic-logger.ts
import { getSupabaseAdmin } from '@/lib/supabase'
import type { NextRequest } from 'next/server'

export interface ImageAccessLog {
  userId: string
  imageId: string
  setId?: string
  action: 'view' | 'download' | 'thumbnail'
  ipAddress: string | null
  userAgent: string | null
  userTier?: string
  referer?: string | null
}

/**
 * Log image access to user_activity table for forensic tracking
 */
export async function logImageAccess(
  log: ImageAccessLog,
  request?: NextRequest
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    // Get additional metadata from request if provided
    const ipAddress = log.ipAddress || (request ? getClientIp(request) : null)
    const userAgent = log.userAgent || (request ? request.headers.get('user-agent') : null)
    const referer = request ? request.headers.get('referer') : null

    // Insert into user_activity table (which already exists)
    await supabase.from('user_activity').insert({
      user_id: log.userId,
      image_id: log.imageId,
      set_id: log.setId,
      action: log.action,
      ip_address: ipAddress,
      user_agent: userAgent,
      // Store additional metadata in a structured way
      // We can add a metadata jsonb column later if needed
    })

    console.log(`[Forensic Log] ${log.action.toUpperCase()} - User: ${log.userId}, Image: ${log.imageId}`)
  } catch (error) {
    // Non-blocking - don't fail the request if logging fails
    console.error('[Forensic Log] Failed to log access:', error)
  }
}

/**
 * Extract client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * LEAK INVESTIGATION: Find all users who accessed a specific image
 */
export async function investigateImageAccess(imageId: string, timeRange?: {
  startDate: Date
  endDate: Date
}) {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('user_activity')
    .select(`
      *,
      users!inner (
        id,
        email,
        name,
        membership_tier,
        patreon_user_id
      )
    `)
    .eq('image_id', imageId)
    .order('created_at', { ascending: false })

  if (timeRange) {
    query = query
      .gte('created_at', timeRange.startDate.toISOString())
      .lte('created_at', timeRange.endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('[Forensic Investigation] Query failed:', error)
    return null
  }

  return data
}

/**
 * LEAK INVESTIGATION: Find suspicious download patterns
 */
export async function findSuspiciousActivity(params: {
  minAccessCount?: number // Users who accessed more than X images in short time
  timeWindowMinutes?: number // Within this time window
  action?: 'view' | 'download'
}) {
  const supabase = getSupabaseAdmin()
  
  const timeWindow = params.timeWindowMinutes || 60 // Default: 1 hour
  const minCount = params.minAccessCount || 50 // Default: 50+ accesses
  const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000)

  const { data, error } = await supabase
    .from('user_activity')
    .select(`
      user_id,
      users!inner (
        email,
        name,
        membership_tier
      ),
      created_at,
      action,
      ip_address
    `)
    .gte('created_at', cutoffTime.toISOString())
    .eq('action', params.action || 'view')

  if (error || !data) {
    console.error('[Forensic Investigation] Suspicious activity query failed:', error)
    return null
  }

  // Group by user and count accesses
  const userAccessCounts = new Map<string, { count: number; details: any[] }>()

  data.forEach((activity) => {
    const userId = activity.user_id
    if (!userAccessCounts.has(userId)) {
      userAccessCounts.set(userId, { count: 0, details: [] })
    }
    const user = userAccessCounts.get(userId)!
    user.count++
    user.details.push(activity)
  })

  // Filter users with suspicious activity
  const suspicious = Array.from(userAccessCounts.entries())
    .filter(([_, data]) => data.count >= minCount)
    .map(([userId, data]) => ({
      userId,
      accessCount: data.count,
      userInfo: data.details[0].users,
      timeWindow: `${timeWindow} minutes`,
      recentAccesses: data.details.slice(0, 10), // Show first 10
    }))

  return suspicious
}

/**
 * Get user's complete access history for a specific content set
 */
export async function getUserSetAccessHistory(userId: string, setId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('set_id', setId)
    .order('created_at', { ascending: false })

  return { data, error }
}
