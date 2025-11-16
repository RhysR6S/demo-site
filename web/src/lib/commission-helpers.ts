// src/lib/commission-helpers.ts
import { Session } from 'next-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function checkCommissionStatus(session: Session | null) {
  if (!session?.user) {
    return {
      available: 0,
      used: 0,
      total: 0,
      tier: 'bronze'
    }
  }

  const supabase = getSupabaseAdmin()
  const userTier = session.user.membershipTier?.toLowerCase() || 'bronze'
  
  const freeCommissionsPerMonth = {
    gold: 2,
    diamond: 4,
    platinum: 6
  }[userTier] || 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyCommissions, error } = await supabase
    .from('commissions')
    .select('id, is_free_tier')
    .eq('user_id', session.user.id)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('Error fetching commission status:', error)
    return {
      available: freeCommissionsPerMonth,
      used: 0,
      total: 0,
      tier: userTier
    }
  }

  const freeCommissionsUsed = monthlyCommissions?.filter(c => c.is_free_tier).length || 0
  const totalCommissions = monthlyCommissions?.length || 0

  return {
    available: freeCommissionsPerMonth,
    used: freeCommissionsUsed,
    total: totalCommissions,
    tier: userTier
  }
}

export async function getUserCommissionLimit(tier: string): Promise<number> {
  const lowerTier = tier.toLowerCase()
  const limits = {
    gold: 2,
    diamond: 4,
    platinum: 6
  }
  return limits[lowerTier as keyof typeof limits] || 0
}

// Cleanup completed commissions older than 24 hours
export async function cleanupCompletedCommissions() {
  const supabase = getSupabaseAdmin()
  
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  const { data, error } = await supabase
    .from('commissions')
    .delete()
    .eq('status', 'completed')
    .lte('completed_at', oneDayAgo.toISOString())
    .select()

  if (error) {
    console.error('Commission cleanup failed:', error)
    return { success: false, error }
  }

  return { 
    success: true, 
    deleted: data?.length || 0 
  }
}

// Run cleanup with 10% probability
export async function runOpportunisticCleanup() {
  if (Math.random() < 0.1) {
    cleanupCompletedCommissions().catch(console.error)
  }
}