// src/app/api/commissions/my-commissions/[commissionId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commissionId } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    // First, verify the commission belongs to the user and is editable
    const { data: existingCommission, error: fetchError } = await supabase
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !existingCommission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    // Only allow editing pending commissions
    if (existingCommission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending commissions can be edited' },
        { status: 400 }
      )
    }

    // Calculate pricing
    const calculatePrice = (type: string, requestData: any) => {
      if (type === 'set') {
        const basePrice = 15
        const totalCharacters = (requestData.femaleCharacters?.length || 0)
        const additionalCharacterCost = Math.max(0, totalCharacters - 1) * 0.50
        return basePrice + additionalCharacterCost
      } else {
        const basePrice = 20
        const characterCount = 1 // Default to 1, could be parsed from description
        const additionalCharacterCost = Math.max(0, characterCount - 1) * 4
        return basePrice + additionalCharacterCost
      }
    }

    // Prepare updated request_data
    let requestData: any = {
      type: body.type || existingCommission.type,
      mode: body.mode || 'simple',
    }

    if (body.type === 'set' || existingCommission.type === 'set') {
      // Validate image distribution format and convert old format if needed
      let imageDistribution = body.imageDistribution || {}
      
      if ('duo_ff' in imageDistribution) {
        // New format - use as is
        imageDistribution = {
          solo: imageDistribution.solo ?? 100,
          duo_ff: imageDistribution.duo_ff ?? 100,
          duo_mf: imageDistribution.duo_mf ?? 100,
          duo_mf_pov: imageDistribution.duo_mf_pov ?? 50,
          pov_ffm: imageDistribution.pov_ffm ?? 0,
          gangbang: imageDistribution.gangbang ?? 0
        }
      } else if ('duo' in imageDistribution || 'boyGirl' in imageDistribution) {
        // Old format - convert to new
        const oldDist = imageDistribution
        imageDistribution = {
          solo: oldDist.solo ?? 100,
          duo_ff: oldDist.duo ?? 100,
          duo_mf: Math.floor((oldDist.boyGirl ?? 100) * 0.34),
          duo_mf_pov: Math.floor((oldDist.boyGirl ?? 100) * 0.66),
          pov_ffm: 0,
          gangbang: 0
        }
      }

      // Validate that values are numbers and handle 0 values correctly
      Object.keys(imageDistribution).forEach(key => {
        const value = imageDistribution[key as keyof typeof imageDistribution]
        if (typeof value !== 'number' || value < 0) {
          imageDistribution[key as keyof typeof imageDistribution] = 0
        }
        if (value > 1000) {
          imageDistribution[key as keyof typeof imageDistribution] = 1000
        }
      })

      requestData = {
        ...requestData,
        femaleCharacters: body.femaleCharacters || [],
        maleCharacter: body.maleCharacter || null,
        locations: body.locations || [],
        bodyType: body.bodyType || '',
        imageDistribution,
      }

      // Add preferences based on mode
      if (body.mode === 'simple') {
        requestData.simplePreferences = body.simplePreferences || {}
      } else if (body.mode === 'advanced') {
        requestData.poseWeights = body.poseWeights || {}
        requestData.locationWeights = body.locationWeights || {}
        
        // Advanced mode additional settings
        requestData.sceneFiltersEnabled = body.sceneFiltersEnabled || false
        requestData.sceneFilters = body.sceneFilters || []
        requestData.dynamicVariantsEnabled = body.dynamicVariantsEnabled ?? true
        requestData.favorDefaultVariants = body.favorDefaultVariants ?? true
        requestData.maleOverrideEnabled = body.maleOverrideEnabled || false
        requestData.malePovCharacters = body.malePovCharacters || []
        requestData.maleNonPovCharacters = body.maleNonPovCharacters || []
        requestData.globalPoseWeight = body.globalPoseWeight ?? 50
      }
    } else {
      // Custom image commission
      requestData = {
        ...requestData,
        type: 'custom',
        description: body.description || '',
        references: body.references || []
      }
    }

    // Calculate new price (maintain free tier status)
    const newPrice = existingCommission.is_free_tier ? 0 : calculatePrice(requestData.type, requestData)
    requestData.price = newPrice

    // Update the commission (no updated_at field in schema)
    const { data: updatedCommission, error: updateError } = await supabase
      .from('commissions')
      .update({
        type: requestData.type,
        request_data: requestData
      })
      .eq('id', commissionId)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating commission:', updateError)
      console.error('Update data:', { type: requestData.type, request_data: requestData })
      return NextResponse.json(
        { error: `Failed to update commission: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      commission: updatedCommission,
      message: 'Commission updated successfully'
    })

  } catch (error) {
    console.error('Commission update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commissionId } = await params
    const supabase = getSupabaseAdmin()

    // Fetch the specific commission
    const { data: commission, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .eq('user_id', session.user.id)
      .single()

    if (error || !commission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ commission })

  } catch (error) {
    console.error('Commission fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commissionId } = await params
    const supabase = getSupabaseAdmin()

    // First, verify the commission belongs to the user
    const { data: existingCommission, error: fetchError } = await supabase
      .from('commissions')
      .select('status')
      .eq('id', commissionId)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !existingCommission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    // Only allow deleting pending commissions
    if (existingCommission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending commissions can be deleted' },
        { status: 400 }
      )
    }

    // Delete the commission
    const { error: deleteError } = await supabase
      .from('commissions')
      .delete()
      .eq('id', commissionId)
      .eq('user_id', session.user.id)

    if (deleteError) {
      console.error('Error deleting commission:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete commission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Commission deleted successfully'
    })

  } catch (error) {
    console.error('Commission delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}