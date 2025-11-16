// src/lib/creator-profile.ts

import { getSupabaseAdmin } from '@/lib/supabase'

export interface CreatorProfile {
  display_name: string
  profile_picture_url: string | null
  bio: string | null
}

/**
 * Get creator profile with fallback values
 * This is used server-side to get creator display information
 */
export async function getCreatorProfile(userId?: string): Promise<CreatorProfile> {
  // Default profile
  const defaultProfile: CreatorProfile = {
    display_name: 'KamiXXX',
    profile_picture_url: null,
    bio: null
  }

  if (!userId) {
    console.log('[getCreatorProfile] No userId provided, returning default')
    return defaultProfile
  }

  try {
    const supabase = getSupabaseAdmin()
    
    const { data: profile, error } = await supabase
      .from('creator_profile')
      .select('display_name, profile_picture_url, bio')
      .eq('user_id', userId)
      .single()

    if (error) {
      // PGRST116 means no rows returned, which is expected for new users
      if (error.code !== 'PGRST116') {
        console.error('[getCreatorProfile] Database error:', error)
      }
      return defaultProfile
    }

    if (!profile) {
      console.log('[getCreatorProfile] No profile found for user:', userId)
      return defaultProfile
    }

    console.log('[getCreatorProfile] Found profile for user:', userId, profile)
    
    return {
      display_name: profile.display_name || defaultProfile.display_name,
      profile_picture_url: profile.profile_picture_url,
      bio: profile.bio
    }
  } catch (error) {
    console.error('[getCreatorProfile] Unexpected error:', error)
    return defaultProfile
  }
}

/**
 * Get the primary creator's profile
 * Useful for public-facing pages where we need to show creator info
 */
export async function getPrimaryCreatorProfile(): Promise<CreatorProfile> {
  const creatorPageId = process.env.NEXT_PUBLIC_PATREON_CREATORS_PAGE_ID
  
  if (!creatorPageId) {
    console.log('[getPrimaryCreatorProfile] No creator page ID configured')
    return getCreatorProfile()
  }

  try {
    const supabase = getSupabaseAdmin()
    
    // First, try to find a creator profile
    const { data: profiles } = await supabase
      .from('creator_profile')
      .select('display_name, profile_picture_url, bio, user_id')
      .limit(1)

    if (profiles && profiles.length > 0) {
      console.log('[getPrimaryCreatorProfile] Found creator profile')
      return {
        display_name: profiles[0].display_name,
        profile_picture_url: profiles[0].profile_picture_url,
        bio: profiles[0].bio
      }
    }

    console.log('[getPrimaryCreatorProfile] No creator profiles found')
    // Fallback to default
    return getCreatorProfile()
  } catch (error) {
    console.error('[getPrimaryCreatorProfile] Error:', error)
    return getCreatorProfile()
  }
}