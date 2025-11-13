// src/lib/patreon-metrics.ts
import { getSupabaseAdmin } from './supabase'
import { formatCurrency } from './currency'

interface PatreonMetrics {
  patronCount: number
  totalMembers: number
  monthlyRevenue: number
  lifetimeRevenue: number
  tierBreakdown: Record<string, number>
  currency: string
  campaignStartDate?: string
}

export class PatreonMetricsService {
  private static CACHE_KEY = 'patreon_metrics'
  private static CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours

  static async getMetrics(accessToken: string): Promise<PatreonMetrics> {
    console.log('[PatreonMetrics] Getting metrics with token:', accessToken ? 'Token exists' : 'No token')
    
    // Try cache first
    const cached = await this.getCachedMetrics()
    if (cached) {
      console.log('[PatreonMetrics] Returning cached data:', cached)
      return cached
    }
    
    console.log('[PatreonMetrics] No cache found, fetching from API...')

    try {
      // Fetch campaign data - removed invalid fields
      const campaignResponse = await fetch(
        'https://www.patreon.com/api/oauth2/v2/campaigns?fields[campaign]=creation_name,vanity,url,patron_count,created_at&include=tiers&fields[tier]=title,amount_cents,patron_count',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'KamiContent/1.0',
          },
        }
      )

      if (!campaignResponse.ok) {
        const errorText = await campaignResponse.text()
        console.error('Campaign API error:', campaignResponse.status, errorText)
        throw new Error(`Patreon API error: ${campaignResponse.status}`)
      }

      const campaignData = await campaignResponse.json()
      console.log('Campaign data:', JSON.stringify(campaignData, null, 2))
      
      if (!campaignData.data || campaignData.data.length === 0) {
        throw new Error('No campaign data found')
      }

      const campaign = campaignData.data[0]
      const attributes = campaign.attributes || {}
      
      // Use environment variable or default to GBP for KamiContent
      // Since Patreon API doesn't expose currency in the campaign fields we can access
      const campaignCurrency = process.env.PATREON_CAMPAIGN_CURRENCY || 'GBP'
      console.log('Using currency:', campaignCurrency)
      
      // Process tier data from included
      const tierBreakdown: Record<string, number> = {}
      let monthlyRevenue = 0
      
      if (campaignData.included) {
        const tiers = campaignData.included.filter((item: any) => item.type === 'tier')
        
        tiers.forEach((tier: any) => {
          if (tier.attributes && tier.attributes.patron_count > 0) {
            const tierName = tier.attributes.title
            const patronCount = tier.attributes.patron_count
            const amountCents = tier.attributes.amount_cents || 0
            
            // Skip free tier for revenue calculation
            if (amountCents > 0) {
              // Format tier name with currency amount
              const formattedAmount = formatCurrency(amountCents, campaignCurrency, { showDecimals: false })
              const formattedTierName = `${tierName} (${formattedAmount})`
              tierBreakdown[formattedTierName] = patronCount
              monthlyRevenue += (patronCount * amountCents)
            }
          }
        })
      }
      
      console.log('Revenue calculation:', {
        currency: campaignCurrency,
        tiers: campaignData.included?.filter((t: any) => t.type === 'tier').map((t: any) => ({
          name: t.attributes.title,
          patrons: t.attributes.patron_count,
          amount: formatCurrency(t.attributes.amount_cents || 0, campaignCurrency),
          revenue: formatCurrency((t.attributes.patron_count * (t.attributes.amount_cents || 0)), campaignCurrency)
        })),
        totalMonthlyRevenue: formatCurrency(monthlyRevenue, campaignCurrency)
      })
      
      // Get actual paying patrons count (exclude free tier)
      const freePatrons = campaignData.included?.find((tier: any) => 
        tier.type === 'tier' && tier.attributes.amount_cents === 0
      )?.attributes.patron_count || 0
      
      const payingPatrons = attributes.patron_count - freePatrons
      
      // Calculate lifetime estimate based on campaign age
      const createdAt = attributes.created_at ? new Date(attributes.created_at) : null
      const monthsActive = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))) : 12
      const lifetimeRevenue = Math.round(monthlyRevenue * monthsActive * 0.9) // 90% to account for growth
      
      const metrics: PatreonMetrics = {
        patronCount: payingPatrons,
        totalMembers: attributes.patron_count || 0,
        monthlyRevenue: Math.round(monthlyRevenue), // Keep in minor units (cents/pence)
        lifetimeRevenue, // Keep in minor units
        tierBreakdown,
        currency: campaignCurrency,
        campaignStartDate: attributes.created_at || undefined
      }

      console.log('Final metrics:', metrics)

      // Cache the results
      await this.cacheMetrics(metrics)
      
      return metrics
    } catch (error) {
      console.error('Error fetching Patreon metrics:', error)
      
      // Return empty metrics on error with default currency
      return {
        patronCount: 0,
        totalMembers: 0,
        monthlyRevenue: 0,
        lifetimeRevenue: 0,
        tierBreakdown: {},
        currency: 'USD',
      }
    }
  }

  private static async getCachedMetrics(): Promise<PatreonMetrics | null> {
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

  private static async cacheMetrics(metrics: PatreonMetrics): Promise<void> {
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('cache')
        .upsert({
          key: this.CACHE_KEY,
          value: JSON.stringify(metrics),
          expires_at: new Date(Date.now() + this.CACHE_DURATION).toISOString(),
        })
    } catch (error) {
      console.error('Error caching metrics:', error)
    }
  }
}
