// src/app/api/admin/cleanup-inactive-users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/admin/cleanup-inactive-users
 * Removes users who logged in but are not active patrons
 * Only accessible by creators
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Find inactive users (not patrons, not creators)
    const { data: inactiveUsers, error: selectError } = await supabase
      .from('users')
      .select('id, email, name, created_at, last_login_at')
      .eq('is_active_patron', false)
      .eq('is_creator', false)
      .is('membership_tier', null)
    
    if (selectError) {
      return NextResponse.json(
        { error: 'Failed to fetch inactive users' },
        { status: 500 }
      )
    }
    
    const userCount = inactiveUsers?.length || 0
    
    if (userCount === 0) {
      return NextResponse.json({
        message: 'No inactive users found',
        deletedCount: 0
      })
    }
    
    // Delete inactive users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('is_active_patron', false)
      .eq('is_creator', false)
      .is('membership_tier', null)
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete inactive users' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: `Successfully removed ${userCount} inactive users`,
      deletedCount: userCount,
      deletedUsers: inactiveUsers
    })
  } catch (error) {
    console.error('[Cleanup] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
