// src/lib/activity-logger.ts
import { getSupabaseAdmin } from './supabase'

/**
 * Check if user has given tracking consent
 */
async function hasTrackingConsent(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data } = await supabase
      .from('user_privacy_consent')
      .select('tracking_consent')
      .eq('user_id', userId)
      .single()
    
    return data?.tracking_consent ?? false
  } catch (error) {
    // Default to no consent if error
    return false
  }
}

/**
 * Log image viewing activity for legal protection and analytics
 * This creates an audit trail if content gets leaked
 */
export async function logImageView(
  imageId: string,
  userId: string,
  request: Request
): Promise<void> {
  try {
    // Check for tracking consent first
    const hasConsent = await hasTrackingConsent(userId)
    if (!hasConsent) {
      return // Don't log without consent
    }

    const supabase = getSupabaseAdmin()
    
    // Extract IP and user agent
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Fire and forget - don't await
    supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        image_id: imageId,
        action: 'view_image',
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to log activity:', error)
        }
      })
  } catch (error) {
    // Never let logging errors break the app
    console.error('Activity logging error:', error)
  }
}

/**
 * Log content set viewing
 */
export async function logSetView(
  setId: string,
  userId: string,
  request: Request
): Promise<void> {
  try {
    // Check for tracking consent first
    const hasConsent = await hasTrackingConsent(userId)
    if (!hasConsent) {
      return // Don't log without consent
    }

    const supabase = getSupabaseAdmin()
    
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Fire and forget
    supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        set_id: setId,
        action: 'view_set',
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to log set view:', error)
        }
      })
  } catch (error) {
    console.error('Activity logging error:', error)
  }
}

/**
 * Log download activity
 */
export async function logDownload(
  setId: string,
  userId: string,
  request: Request
): Promise<void> {
  try {
    // Check for tracking consent first
    const hasConsent = await hasTrackingConsent(userId)
    if (!hasConsent) {
      return // Don't log without consent
    }

    const supabase = getSupabaseAdmin()
    
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Fire and forget
    supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        set_id: setId,
        action: 'download',
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to log download:', error)
        }
      })
  } catch (error) {
    console.error('Activity logging error:', error)
  }
}

/**
 * Get suspicious activity for a user
 * Useful for identifying potential scrapers or abuse
 */
export async function getSuspiciousActivity(
  userId: string
): Promise<{
  rapidViewing: boolean
  bulkDownloading: boolean
  suspiciousIPs: string[]
}> {
  const supabase = getSupabaseAdmin()
  
  // Get activity from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data: activities } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: true })
  
  if (!activities || activities.length === 0) {
    return {
      rapidViewing: false,
      bulkDownloading: false,
      suspiciousIPs: []
    }
  }
  
  // Check for rapid viewing (more than 60 images in 1 minute)
  const viewTimes = activities
    .filter(a => a.action === 'view_image')
    .map(a => new Date(a.created_at).getTime())
  
  let rapidViewing = false
  for (let i = 0; i < viewTimes.length - 60; i++) {
    if (viewTimes[i + 60] - viewTimes[i] < 60000) {
      rapidViewing = true
      break
    }
  }
  
  // Check for bulk downloading
  const downloads = activities.filter(a => a.action === 'download')
  const bulkDownloading = downloads.length > 5
  
  // Get unique IPs
  const ips = [...new Set(activities.map(a => a.ip_address).filter(ip => ip !== 'unknown'))]
  const suspiciousIPs = ips.length > 3 ? ips : []
  
  return {
    rapidViewing,
    bulkDownloading,
    suspiciousIPs
  }
}