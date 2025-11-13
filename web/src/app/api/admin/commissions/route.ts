// src/app/api/admin/commissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// Cache for performance
let commissionsCache: { data: any[]; timestamp: number } | null = null
const CACHE_DURATION = 5000 // 5 seconds cache

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check cache first
    if (commissionsCache && Date.now() - commissionsCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({ commissions: commissionsCache.data })
    }

    const supabase = getSupabaseAdmin()

    // Optimized query - only select fields needed for list view
    const { data: commissions, error } = await supabase
      .from('commissions')
      .select(`
        id,
        user_id,
        user_email,
        user_name,
        user_tier,
        type,
        status,
        is_free_tier,
        created_at,
        completed_at,
        notes,
        request_data
      `)
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      console.error('Error fetching commissions:', error)
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
    }

    // Process the data to extract fields needed for the UI
    const processedCommissions = commissions?.map(commission => ({
      ...commission,
      request_data: {
        // Character information
        femaleCharacters: commission.request_data?.femaleCharacters || [],
        maleCharacter: commission.request_data?.maleCharacter || null,
        
        // Mode and preferences
        mode: commission.request_data?.mode || 'simple',
        simplePreferences: commission.request_data?.simplePreferences || {},
        
        // Image distribution (new format)
        imageDistribution: commission.request_data?.imageDistribution || {
          solo: 100,
          duo_ff: 100,
          duo_mf: 100,
          duo_mf_pov: 50,
          pov_ffm: 0,
          gangbang: 0
        },
        
        // Advanced settings
        poseWeights: commission.request_data?.poseWeights || {},
        locationWeights: commission.request_data?.locationWeights || {},
        
        // Location and body settings
        locations: commission.request_data?.locations || [],
        bodyType: commission.request_data?.bodyType || null,
        
        // Variant settings
        dynamicVariants: commission.request_data?.dynamicVariants !== false,
        favorDefaultVariants: commission.request_data?.favorDefaultVariants !== false,
        
        // Scene filters
        sceneFilters: commission.request_data?.sceneFilters || [],
        
        // Contact and visibility
        isPublic: commission.request_data?.isPublic || false,
        contactPlatform: commission.request_data?.contactPlatform,
        contactUsername: commission.request_data?.contactUsername,
        
        // Custom commission fields
        description: commission.request_data?.description,
        references: commission.request_data?.references || [],
        price: commission.request_data?.price,
        
        // Legacy support
        setBias: commission.request_data?.setBias || {}
      }
    })) || []

    // Update cache
    commissionsCache = {
      data: processedCommissions,
      timestamp: Date.now()
    }

    return NextResponse.json({ commissions: processedCommissions })
  } catch (error) {
    console.error('Commission GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Invalidate cache function (call when data changes)
export function invalidateCache() {
  commissionsCache = null
}
