// Path: src/middleware/tier-access.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { supabase } from '@/lib/supabase'
import { PatreonTierService } from '@/lib/patreon-tiers'

/**
 * Middleware to check if a user has access to a tier-gated resource
 * This should be used in channel message routes to prevent unauthorized access
 */
export async function checkTierAccess(
  request: NextRequest,
  requiredTier: string
): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { hasAccess: false, error: 'Unauthorized' }
    }

    // Creators always have access
    if (session.user.isCreator) {
      return { hasAccess: true }
    }

    const userTier = session.user.membershipTier || 'bronze'

    // Try to get available tiers from cache or fetch fresh
    let availableTiers: any[] = []
    
    // Check if we have a cached tier list
    const { data: cache } = await supabase
      .from('cache')
      .select('value, expires_at')
      .eq('key', 'patreon_tiers')
      .single()

    if (cache && new Date(cache.expires_at) > new Date()) {
      availableTiers = JSON.parse(cache.value)
    }

    // Check if user has access to the required tier
    const hasAccess = PatreonTierService.hasAccessToTier(
      userTier,
      requiredTier,
      availableTiers
    )

    if (!hasAccess) {
      return {
        hasAccess: false,
        error: `This content requires ${requiredTier} tier or higher. Your current tier is ${userTier}.`
      }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Error checking tier access:', error)
    return { hasAccess: false, error: 'Failed to verify tier access' }
  }
}

/**
 * Enhanced middleware for channel message routes
 * Checks both channel existence and tier access
 */
export async function checkChannelAccess(
  request: NextRequest,
  channelId: string
): Promise<{ hasAccess: boolean; channel?: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { hasAccess: false, error: 'Unauthorized' }
    }

    // Fetch the channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .is('deleted_at', null)
      .single()

    if (channelError || !channel) {
      return { hasAccess: false, error: 'Channel not found' }
    }

    // Check tier access
    const tierCheck = await checkTierAccess(request, channel.min_tier)
    
    if (!tierCheck.hasAccess) {
      return {
        hasAccess: false,
        error: tierCheck.error || `You need ${channel.min_tier} tier or higher to access this channel`
      }
    }

    return { hasAccess: true, channel }
  } catch (error) {
    console.error('Error checking channel access:', error)
    return { hasAccess: false, error: 'Failed to verify channel access' }
  }
}