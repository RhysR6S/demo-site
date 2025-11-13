// src/lib/patreon-tiers.ts
import { getSupabaseAdmin } from './supabase'

export interface PatreonTier {
  id: string
  title: string
  amount_cents: number
  patron_count: number
  description?: string
  benefits?: string[]
  color?: string // For UI display
  emoji?: string // For UI display
}

export interface TierConfig {
  [key: string]: {
    color: string
    bgColor: string
    emoji?: string
  }
}

export class PatreonTierService {
  private static CACHE_KEY = 'patreon_tiers'
  private static CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours

  // Default tier configurations for UI styling
  private static DEFAULT_TIER_CONFIGS: TierConfig = {
    'bronze': {
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
      emoji: '🥉'
    },
    'silver': {
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
      emoji: '🥈'
    },
    'gold': {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      emoji: '🥇'
    },
    'platinum': {
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      emoji: '💎'
    }
  }

  /**
   * Fetch tiers from Patreon API
   */
  static async fetchTiers(accessToken: string): Promise<PatreonTier[]> {
    console.log('[PatreonTiers] Fetching tiers from API...')

    try {
      // Check cache first
      const cached = await this.getCachedTiers()
      if (cached) {
        console.log('[PatreonTiers] Returning cached tiers')
        return cached
      }

      // Fetch campaign with tiers
      const response = await fetch(
        'https://www.patreon.com/api/oauth2/v2/campaigns?include=tiers&fields[tier]=title,amount_cents,patron_count,description',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'KamiContent/1.0',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Patreon API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.included) {
        return []
      }

      // Extract tiers from the response
      const tiers = data.included
        .filter((item: any) => item.type === 'tier')
        .filter((tier: any) => tier.attributes.amount_cents > 0) // Exclude free tier
        .map((tier: any) => ({
          id: tier.id,
          title: tier.attributes.title,
          amount_cents: tier.attributes.amount_cents,
          patron_count: tier.attributes.patron_count || 0,
          description: tier.attributes.description
        }))
        .sort((a: PatreonTier, b: PatreonTier) => a.amount_cents - b.amount_cents)

      // Cache the results
      await this.cacheTiers(tiers)

      return tiers
    } catch (error) {
      console.error('Error fetching Patreon tiers:', error)
      // Return empty array on error - let the app use defaults
      return []
    }
  }

  /**
   * Get tier configuration for UI styling
   */
  static getTierConfig(tierName: string): { color: string; bgColor: string; emoji?: string } {
    // Normalize tier name to lowercase
    const normalizedName = tierName.toLowerCase()
    
    // Check if we have a direct match
    if (this.DEFAULT_TIER_CONFIGS[normalizedName]) {
      return this.DEFAULT_TIER_CONFIGS[normalizedName]
    }
    
    // Try to match common patterns
    if (normalizedName.includes('bronze')) return this.DEFAULT_TIER_CONFIGS.bronze
    if (normalizedName.includes('silver')) return this.DEFAULT_TIER_CONFIGS.silver
    if (normalizedName.includes('gold')) return this.DEFAULT_TIER_CONFIGS.gold
    if (normalizedName.includes('platinum') || normalizedName.includes('diamond')) {
      return this.DEFAULT_TIER_CONFIGS.platinum
    }
    
    // Default styling for unknown tiers
    return {
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      emoji: '⭐'
    }
  }

  /**
   * Get a mapping of tier names for backward compatibility
   */
  static async getTierMapping(accessToken: string): Promise<Record<string, PatreonTier>> {
    const tiers = await this.fetchTiers(accessToken)
    const mapping: Record<string, PatreonTier> = {}
    
    tiers.forEach(tier => {
      // Create multiple keys for flexibility
      mapping[tier.title] = tier
      mapping[tier.title.toLowerCase()] = tier
      mapping[tier.id] = tier
    })
    
    return mapping
  }

  /**
   * Check if a user has access to a tier-gated resource
   */
  static hasAccessToTier(userTier: string | undefined, requiredTier: string, availableTiers: PatreonTier[]): boolean {
    if (!userTier || !requiredTier || availableTiers.length === 0) {
      // If no tiers are configured, fall back to hardcoded hierarchy
      return this.hasAccessToTierFallback(userTier, requiredTier)
    }

    // Find the user's tier and required tier in the available tiers
    const userTierObj = availableTiers.find(t => 
      t.title.toLowerCase() === userTier.toLowerCase() ||
      t.id === userTier
    )
    
    const requiredTierObj = availableTiers.find(t => 
      t.title.toLowerCase() === requiredTier.toLowerCase() ||
      t.id === requiredTier
    )

    if (!userTierObj || !requiredTierObj) {
      // Fall back to hardcoded logic if tiers not found
      return this.hasAccessToTierFallback(userTier, requiredTier)
    }

    // User has access if their tier amount is >= required tier amount
    return userTierObj.amount_cents >= requiredTierObj.amount_cents
  }

  /**
   * Fallback tier hierarchy for when Patreon API is unavailable
   */
  private static hasAccessToTierFallback(userTier: string | undefined, requiredTier: string): boolean {
    const tierHierarchy = ['bronze', 'silver', 'gold', 'platinum']
    const userTierLower = userTier?.toLowerCase() || 'bronze'
    const requiredTierLower = requiredTier.toLowerCase()
    
    const userIndex = tierHierarchy.indexOf(userTierLower)
    const requiredIndex = tierHierarchy.indexOf(requiredTierLower)
    
    // If tiers not in hierarchy, allow access
    if (userIndex === -1 || requiredIndex === -1) return true
    
    return userIndex >= requiredIndex
  }

  private static async getCachedTiers(): Promise<PatreonTier[] | null> {
    try {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('cache')
        .select('value, expires_at')
        .eq('key', this.CACHE_KEY)
        .single()

      if (data && new Date(data.expires_at) > new Date()) {
        return JSON.parse(data.value)
      }
    } catch (error) {
      // Cache miss is ok
    }
    return null
  }

  private static async cacheTiers(tiers: PatreonTier[]): Promise<void> {
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('cache')
        .upsert({
          key: this.CACHE_KEY,
          value: JSON.stringify(tiers),
          expires_at: new Date(Date.now() + this.CACHE_DURATION).toISOString(),
        })
    } catch (error) {
      console.error('Error caching tiers:', error)
    }
  }
}
