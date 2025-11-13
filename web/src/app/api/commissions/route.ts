// src/app/api/commissions/route.ts (FULLY UPDATED VERSION)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// Define the complete weight structure matching your app
interface CommissionWeights {
  imageDistribution: {
    solo: number
    duo_ff: number
    duo_mf: number
    duo_mf_pov: number
    pov_ffm: number
    gangbang: number
  }
  poseWeights?: {
    [key: string]: number  // Tag-based weights like [VAGINAL_SEX], [ANAL_SEX], etc.
  }
  locationWeights?: {
    [key: string]: number  // Location-based weights
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isActivePatron && !session?.user?.isCreator) {
      return NextResponse.json({ error: 'Patron access required' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = getSupabaseAdmin()
    const userId = session.user.id
    const userEmail = session.user.email!
    const userName = session.user.name || userEmail.split('@')[0]
    const userTier = session.user.membershipTier || 'bronze'
    
    // Check if this should be a free tier commission
    const tier = userTier.toLowerCase()
    const freeAllocation = getFreeCommissionCount(tier)
    
    let isFreeTier = false
    
    if (freeAllocation > 0) {
      // Get user's subscription renewal date
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_renewed_at')
        .eq('id', userId)
        .single()
      
      if (userError) {
        console.error('Error fetching user data:', userError)
      } else {
        // Calculate commission period based on subscription renewal
        const { startDate, endDate } = getCommissionPeriod(userData?.subscription_renewed_at)

        // Count used free commissions this period (excluding cancelled)
        const { count, error: countError } = await supabase
          .from('commissions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_free_tier', true)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
          .neq('status', 'cancelled')

        if (countError) {
          console.error('Error counting free commissions:', countError)
        } else {
          // Check if user has free slots available
          const usedFreeSlots = count || 0
          isFreeTier = usedFreeSlots < freeAllocation
        }
      }
    }

    // Prepare commission data with new structure
    const commissionData = {
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      user_tier: userTier,
      type: body.type,
      status: 'pending',
      is_free_tier: isFreeTier,
      request_data: {} as any
    }

    // Build request_data based on type and mode
    if (body.type === 'set') {
      // Handle migration from old format to new format
      let imageDistribution = {
        solo: 100,
        duo_ff: 100,
        duo_mf: 100,
        duo_mf_pov: 50,
        pov_ffm: 0,
        gangbang: 0
      }

      // Check if we have the new format
      if (body.imageDistribution) {
        if ('duo_ff' in body.imageDistribution) {
          // New format - use directly but ensure all keys exist
          imageDistribution = {
            solo: body.imageDistribution.solo ?? 100,
            duo_ff: body.imageDistribution.duo_ff ?? 100,
            duo_mf: body.imageDistribution.duo_mf ?? 100,
            duo_mf_pov: body.imageDistribution.duo_mf_pov ?? 50,
            pov_ffm: body.imageDistribution.pov_ffm ?? 0,
            gangbang: body.imageDistribution.gangbang ?? 0
          }
        } else if ('duo' in body.imageDistribution || 'boyGirl' in body.imageDistribution) {
          // Old format - convert to new
          const oldDist = body.imageDistribution
          imageDistribution = {
            solo: oldDist.solo ?? 100,
            duo_ff: oldDist.duo ?? 100,
            duo_mf: Math.floor((oldDist.boyGirl ?? 100) * 0.34),
            duo_mf_pov: Math.floor((oldDist.boyGirl ?? 100) * 0.66),
            pov_ffm: 0,
            gangbang: 0
          }
        }
      }

      // Validate that values are numbers and handle 0 values correctly
      Object.keys(imageDistribution).forEach(key => {
        const value = imageDistribution[key as keyof typeof imageDistribution]
        // Ensure value is a number and allow 0 as valid
        if (typeof value !== 'number' || value < 0) {
          imageDistribution[key as keyof typeof imageDistribution] = 0
        }
        // Cap at 1000 as maximum
        if (value > 1000) {
          imageDistribution[key as keyof typeof imageDistribution] = 1000
        }
      })

      commissionData.request_data = {
        // Core fields
        femaleCharacters: body.femaleCharacters || [],
        maleCharacter: body.maleCharacter || null,
        locations: body.locations || [],
        bodyType: body.bodyType || '',
        price: body.price || 0,
        
        // Updated image distribution with all 6 categories
        imageDistribution,
        
        // Mode-specific preferences
        mode: body.mode || 'simple',
        
        // Include simple preferences if in simple mode
        ...(body.mode === 'simple' && body.simplePreferences && {
          simplePreferences: body.simplePreferences
        }),
        
        // Include pose weights if in advanced mode
        ...(body.mode === 'advanced' && {
          poseWeights: body.poseWeights || {},
          locationWeights: body.locationWeights || {}
        }),
        
        // Additional advanced settings
        ...(body.mode === 'advanced' && {
          // Scene filters
          sceneFiltersEnabled: body.sceneFiltersEnabled || false,
          sceneFilters: body.sceneFilters || [],
          
          // Dynamic variants
          dynamicVariantsEnabled: body.dynamicVariantsEnabled ?? true,
          favorDefaultVariants: body.favorDefaultVariants ?? true,
          
          // Male override settings
          maleOverrideEnabled: body.maleOverrideEnabled || false,
          malePovCharacters: body.malePovCharacters || [],
          maleNonPovCharacters: body.maleNonPovCharacters || [],
          
          // Global pose weight
          globalPoseWeight: body.globalPoseWeight ?? 50
        })
      }
    } else {
      // Custom image commission
      commissionData.request_data = {
        type: 'custom',
        description: body.description || '',
        references: body.references || [],
        price: body.price || 0
      }
    }

    // Insert commission
    const { data, error } = await supabase
      .from('commissions')
      .insert(commissionData)
      .select()
      .single()

    if (error) {
      console.error('Error creating commission:', error)
      return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      commission: data,
      isFreeTier 
    })

  } catch (error) {
    console.error('Commission creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to retrieve commission data with proper format
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commissionId = searchParams.get('id')
    
    const supabase = getSupabaseAdmin()
    
    if (commissionId) {
      // Get single commission
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('id', commissionId)
        .single()
      
      if (error) {
        return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
      }
      
      // Convert old format to new if needed
      if (data.request_data?.imageDistribution && !('duo_ff' in data.request_data.imageDistribution)) {
        const oldDist = data.request_data.imageDistribution
        data.request_data.imageDistribution = {
          solo: oldDist.solo ?? 100,
          duo_ff: oldDist.duo ?? 100,
          duo_mf: Math.floor((oldDist.boyGirl ?? 100) * 0.34),
          duo_mf_pov: Math.floor((oldDist.boyGirl ?? 100) * 0.66),
          pov_ffm: 0,
          gangbang: 0
        }
      }
      
      return NextResponse.json({ commission: data })
    } else {
      // Get all commissions for user
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
      }
      
      // Convert old formats to new
      const updatedData = data.map(commission => {
        if (commission.request_data?.imageDistribution && !('duo_ff' in commission.request_data.imageDistribution)) {
          const oldDist = commission.request_data.imageDistribution
          commission.request_data.imageDistribution = {
            solo: oldDist.solo ?? 100,
            duo_ff: oldDist.duo ?? 100,
            duo_mf: Math.floor((oldDist.boyGirl ?? 100) * 0.34),
            duo_mf_pov: Math.floor((oldDist.boyGirl ?? 100) * 0.66),
            pov_ffm: 0,
            gangbang: 0
          }
        }
        return commission
      })
      
      return NextResponse.json({ commissions: updatedData })
    }
  } catch (error) {
    console.error('Error fetching commissions:', error)
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
