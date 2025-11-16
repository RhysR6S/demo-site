// src/app/api/commissions/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const userId = session.user.id
    const userTier = session.user.membershipTier?.toLowerCase() || 'bronze'
    
    // Get free commission allocation based on tier
    const freeAllocation = getFreeCommissionCount(userTier)
    
    if (freeAllocation === 0) {
      return NextResponse.json({
        slots: [],
        summary: {
          tier: userTier,
          freeAllocation: 0,
          available: 0,
          used: 0,
          periodStart: null,
          periodEnd: null,
          nextReset: null
        }
      })
    }

    // Get user's subscription renewal date
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_renewed_at')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('Error fetching user data:', userError)
    }

    // Calculate commission period
    const { startDate, endDate } = getCommissionPeriod(userData?.subscription_renewed_at)

    // Get all user's commissions for this period (excluding only cancelled ones)
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_free_tier', true)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (commissionsError) {
      console.error('Error fetching commissions:', commissionsError)
      return NextResponse.json({ error: 'Failed to fetch commission status' }, { status: 500 })
    }

    // Build slots array
    const slots = []
    for (let i = 0; i < freeAllocation; i++) {
      const commission = commissions?.[i]
      
      if (commission) {
        // Map archived status to completed for user view
        const displayStatus = commission.status === 'archived' ? 'completed' : commission.status
        
        slots.push({
          index: i,
          status: displayStatus,
          commissionId: commission.id
        })
      } else {
        slots.push({
          index: i,
          status: 'available'
        })
      }
    }

    // Calculate summary
    const usedSlots = commissions?.length || 0
    const availableSlots = Math.max(0, freeAllocation - usedSlots)

    return NextResponse.json({
      slots,
      summary: {
        tier: userTier,
        freeAllocation,
        available: availableSlots,
        used: usedSlots,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        nextReset: endDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Commission status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getFreeCommissionCount(tier: string): number {
  switch (tier) {
    case 'gold': return 2
    case 'diamond': return 4
    case 'platinum': return 6
    default: return 0
  }
}

function getCommissionPeriod(subscriptionRenewedAt: string | null) {
  const now = new Date()
  
  // If no renewal date, fall back to calendar month
  if (!subscriptionRenewedAt) {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { startDate, endDate }
  }
  
  // Extract renewal day from subscription date
  const renewalDate = new Date(subscriptionRenewedAt)
  const renewalDay = renewalDate.getDate()
  
  // Calculate current period start
  let startDate = new Date(now.getFullYear(), now.getMonth(), renewalDay)
  
  // If we're before the renewal day this month, use previous month
  if (now < startDate) {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, renewalDay)
  }
  
  // Calculate period end (handle month boundaries)
  let endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1)
  
  // Handle edge case: renewal on 31st, next month has fewer days
  if (endDate.getDate() !== renewalDay) {
    endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0) // Last day of month
  }
  
  return { startDate, endDate }
}