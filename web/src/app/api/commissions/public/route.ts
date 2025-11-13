// src/app/api/commissions/public/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()
    
    // Validate required fields for public commissions
    if (!body.contactPlatform || !body.contactUsername) {
      return NextResponse.json(
        { error: 'Contact information is required' },
        { status: 400 }
      )
    }

    // Validate contact platform
    if (!['x', 'kofi'].includes(body.contactPlatform)) {
      return NextResponse.json(
        { error: 'Invalid contact platform' },
        { status: 400 }
      )
    }

    // Validate X handle format if platform is X
    if (body.contactPlatform === 'x') {
      const handleRegex = /^[A-Za-z0-9_]{1,15}$/
      if (!handleRegex.test(body.contactUsername)) {
        return NextResponse.json(
          { error: 'Invalid X handle format' },
          { status: 400 }
        )
      }
    }
    
    // Generate a unique ID for the public user
    const publicUserId = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Format the display name based on platform
    const displayName = body.contactPlatform === 'x' 
      ? `@${body.contactUsername}` 
      : body.contactUsername
    
    // Prepare commission data for public submission
    const commissionData = {
      user_id: publicUserId,
      user_email: `${body.contactUsername}@${body.contactPlatform}.public`, // Pseudo email for database
      user_name: displayName,
      user_tier: 'public', // Special tier for public commissions
      type: body.type,
      status: 'pending',
      is_free_tier: false, // Public commissions are never free
      request_data: {}
    }

    // Build request_data based on type
    if (body.type === 'set') {
      commissionData.request_data = {
        // Contact information
        isPublic: true,
        contactPlatform: body.contactPlatform,
        contactUsername: body.contactUsername,
        
        // Core fields
        femaleCharacters: body.femaleCharacters || [],
        maleCharacter: body.maleCharacter || null,
        locations: body.locations || [],
        bodyType: body.bodyType || '',
        price: body.price || 0,
        
        // Image distribution
        imageDistribution: body.imageDistribution || {
          solo: 100,
          duo: 100,
          boyGirl: 100
        },
        
        // Mode-specific preferences
        mode: body.mode || 'simple',
        
        // Include simple preferences if in simple mode
        ...(body.mode === 'simple' && body.simplePreferences && {
          simplePreferences: body.simplePreferences
        }),
        
        // Include pose weights if in advanced mode
        ...(body.mode === 'advanced' && body.poseWeights && {
          poseWeights: body.poseWeights,
          locationWeights: body.locationWeights || {}
        })
      }
    } else {
      // Custom image commission
      commissionData.request_data = {
        type: 'custom',
        isPublic: true,
        contactPlatform: body.contactPlatform,
        contactUsername: body.contactUsername,
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
      console.error('Error creating public commission:', error)
      return NextResponse.json(
        { error: 'Failed to create commission' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      commission: data,
      message: 'Commission submitted successfully. The creator will contact you soon.'
    })

  } catch (error) {
    console.error('Public commission creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
