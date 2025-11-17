// src/app/api/creator/profile/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    
    // Get creator profile
    const { data: profile, error } = await supabase
      .from('creator_profile')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching creator profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Return profile or default values
    return NextResponse.json({
      profile: profile || {
        display_name: 'DemoCreator', // Default creator name
        profile_picture_url: null,
        bio: null
      }
    })
  } catch (error) {
    console.error('Error in creator profile GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Only creators can update profile' }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, profile_picture_url, bio } = body

    if (!display_name || display_name.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('creator_profile')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    let profile
    
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('creator_profile')
        .update({
          display_name,
          profile_picture_url,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating creator profile:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      profile = data
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('creator_profile')
        .insert({
          user_id: session.user.id,
          display_name,
          profile_picture_url,
          bio,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating creator profile:', error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      profile = data
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error in creator profile POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}