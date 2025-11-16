// src/app/api/admin/watermark-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get watermark settings for the creator
    const { data: settings, error } = await supabase
      .from('creator_watermark_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching watermark settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Get a sample image for preview
    const { data: sampleImage } = await supabase
      .from('images')
      .select('id, r2_key')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        settings: {
          watermark_type: 'text',
          position: 'corner',
          opacity: 0.15,
          scale: 1.0,
          enabled: true,
          offset_x: 0,
          offset_y: 0
        },
        sampleImage
      })
    }

    return NextResponse.json({ settings, sampleImage })
  } catch (error) {
    console.error('Watermark settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const supabase = getSupabaseAdmin()
    
    // Validate settings
    const { watermark_type, position, opacity, scale, enabled, watermark_image_r2_key, offset_x, offset_y } = body
    
    if (!['text', 'image'].includes(watermark_type)) {
      return NextResponse.json(
        { error: 'Invalid watermark type' },
        { status: 400 }
      )
    }
    
    if (!['corner', 'center', 'diagonal', 'custom'].includes(position)) {
      return NextResponse.json(
        { error: 'Invalid position' },
        { status: 400 }
      )
    }
    
    if (opacity < 0 || opacity > 1) {
      return NextResponse.json(
        { error: 'Opacity must be between 0 and 1' },
        { status: 400 }
      )
    }
    
    // Allow scale up to 10 (1000%) for larger watermarks
    if (scale < 0.1 || scale > 10) {
      return NextResponse.json(
        { error: 'Scale must be between 10% and 1000%' },
        { status: 400 }
      )
    }

    // Validate offsets (allow -50 to 50 for percentage-based positioning)
    // Convert to number and ensure they're valid
    const offsetX = Number(offset_x) || 0
    const offsetY = Number(offset_y) || 0
    
    if (offsetX < -50 || offsetX > 50 || offsetY < -50 || offsetY > 50) {
      return NextResponse.json(
        { error: 'Offsets must be between -50 and 50' },
        { status: 400 }
      )
    }

    // Round to 1 decimal place to avoid floating point precision issues
    const roundedOffsetX = Math.round(offsetX * 10) / 10
    const roundedOffsetY = Math.round(offsetY * 10) / 10

    // Upsert settings
    const { data, error } = await supabase
      .from('creator_watermark_settings')
      .upsert({
        user_id: session.user.id,
        watermark_type,
        watermark_image_r2_key: watermark_type === 'image' ? watermark_image_r2_key : null,
        position,
        opacity,
        scale,
        enabled,
        offset_x: roundedOffsetX,
        offset_y: roundedOffsetY,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving watermark settings:', error)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    // Note: In the new system, changing watermark settings requires re-processing
    // all watermarked images. This should be done as a separate admin action.
    console.log('Watermark settings updated. Note: Existing watermarked images will need to be regenerated.')

    return NextResponse.json({ 
      success: true,
      settings: data,
      message: 'Settings saved. Run the fix-watermarks script to apply changes to existing images.'
    })
  } catch (error) {
    console.error('Watermark settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}