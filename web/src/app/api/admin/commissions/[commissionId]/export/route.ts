// src/app/api/admin/commissions/[commissionId]/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'
import { simpleToPoseWeights, SMART_TAG_CATEGORIES } from '@/app/commissions/constants'

// Helper function to get all valid pose weight tags (excluding participants)
function getValidPoseWeightTags(): Set<string> {
  const validTags = new Set<string>()
  SMART_TAG_CATEGORIES.forEach(cat => {
    if (cat.name !== "Participants & Scene Type") {
      cat.tags.forEach(tag => {
        validTags.add(tag.key)
      })
    }
  })
  return validTags
}

// FIXED: Changed from exportGET to GET
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const { commissionId } = await params
    const supabase = getSupabaseAdmin()

    const { data: commission, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .single()

    if (error || !commission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    const requestData = commission.request_data as any
    
    // For custom images, return a different format
    if (commission.type === 'custom') {
      return NextResponse.json({
        type: 'custom',
        description: requestData.description || "",
        references: requestData.references || [],
        price: requestData.price || 0
      })
    }

    const toInt = (value: any): number => {
      if (typeof value === 'number') return Math.floor(value)
      if (typeof value === 'string') return parseInt(value) || 100
      return 100
    }

    const validPoseWeightTags = getValidPoseWeightTags()
    
    // Initialize export data with complete structure
    const exportData: any = {
      char_input: requestData.femaleCharacters?.join('\n') || '',
      male_override_enabled: !!requestData.maleCharacter,
      male_override_pov_characters: requestData.maleCharacter || '',
      male_override_non_pov_characters: requestData.maleCharacter || '',
      num_images: 100,
    }

    // Process image distribution - use stored values directly
    const dist = requestData.imageDistribution || {}
    const imageDistribution: Record<string, number> = {
      solo: toInt(dist.solo ?? 100),
      duo_ff: toInt(dist.duo_ff ?? 100),
      duo_mf: toInt(dist.duo_mf ?? 100),
      duo_mf_pov: toInt(dist.duo_mf_pov ?? 50),
      pov_ffm: toInt(dist.pov_ffm ?? 0),
      gangbang: toInt(dist.gangbang ?? 0)
    }
    
    exportData.image_distribution = imageDistribution

    // Process pose weights based on mode
    let poseWeights: Record<string, number> = {}
    const mode = requestData.mode || 'simple'
    
    if (mode === 'advanced') {
      // Advanced mode: initialize all to 100 (neutral baseline)
      validPoseWeightTags.forEach(tag => {
        poseWeights[tag] = 100
      })
      
      if (requestData.poseWeights) {
        // Override with stored weights
        Object.entries(requestData.poseWeights).forEach(([key, value]) => {
          if (validPoseWeightTags.has(key)) {
            poseWeights[key] = Math.floor(value as number)
          }
        })
      }
      
    } else {
      // Simple mode: initialize all to 10 (very low baseline)
      validPoseWeightTags.forEach(tag => {
        poseWeights[tag] = 10
      })
      
      // Convert simple preferences to pose weights
      if (requestData.simplePreferences) {
        const convertedWeights = simpleToPoseWeights(requestData.simplePreferences)
        
        // Only apply non-default values (100 is the neutral/default value in advanced mode)
        // For simple mode, we want unused categories to stay at 10, not jump to 100
        Object.keys(convertedWeights).forEach(key => {
          if (validPoseWeightTags.has(key)) {
            const value = Math.floor(convertedWeights[key])
            // Only override the 10 baseline if the value is NOT the default 100
            if (value !== 100) {
              poseWeights[key] = value
            }
          }
        })
      }
    }
    
    exportData.pose_weights = poseWeights
    
    // Location weights - ensure integers
    const locationWeights: Record<string, number> = {}
    if (requestData.locationWeights) {
      Object.entries(requestData.locationWeights).forEach(([key, value]) => {
        locationWeights[key] = toInt(value)
      })
    }
    exportData.location_weights = locationWeights
    
    // Enabled locations
    if (requestData.locations && requestData.locations.length > 0) {
      exportData.enabled_locations = requestData.locations.filter((l: string) => l && l.trim())
    } else {
      exportData.enabled_locations = []
    }
    
    // Body type override
    if (requestData.bodyType) {
      exportData.body_type_override = requestData.bodyType
    }
    
    // Dynamic variants settings
    exportData.dynamic_variants_enabled = requestData.dynamicVariants !== false
    exportData.favor_default_variants = requestData.favorDefaultVariants !== false
    
    // Scene filters
    exportData.scene_filters_enabled = !!(requestData.sceneFilters && requestData.sceneFilters.length > 0)
    exportData.scene_filters = requestData.sceneFilters || []
    
    return NextResponse.json(exportData)

  } catch (error) {
    console.error('Commission export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}