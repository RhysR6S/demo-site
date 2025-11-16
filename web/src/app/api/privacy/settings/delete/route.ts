// src/app/api/privacy/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { signOut } from 'next-auth/react'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const userId = token.sub

    // Log deletion request first (in case something fails)
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: userId,
        action: 'account_deletion_requested',
        details: {
          email: token.email,
          timestamp: new Date().toISOString()
        },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      })

    // Delete in correct order to respect foreign key constraints
    
    // 1. Delete activity logs
    await supabase
      .from('user_activity')
      .delete()
      .eq('user_id', userId)

    // 2. Delete content interactions
    await supabase
      .from('user_set_views')
      .delete()
      .eq('user_id', userId)

    await supabase
      .from('user_set_downloads')
      .delete()
      .eq('user_id', userId)

    await supabase
      .from('content_likes')
      .delete()
      .eq('user_id', userId)

    // 3. Anonymize comments instead of deleting (preserve content integrity)
    await supabase
      .from('content_comments')
      .update({
        user_name: '[Deleted User]',
        user_email: 'deleted@user.com',
        is_deleted: true
      })
      .eq('user_id', userId)

    // 4. Delete watermark cache
    await supabase
      .from('watermark_cache')
      .delete()
      .eq('user_id', userId)

    // 5. Delete privacy consent
    await supabase
      .from('user_privacy_consent')
      .delete()
      .eq('user_id', userId)

    // 6. Delete commissions (if any)
    await supabase
      .from('commissions')
      .delete()
      .eq('user_id', userId)

    // 7. Delete creator profile (if creator)
    if (token.isCreator) {
      await supabase
        .from('creator_profile')
        .delete()
        .eq('user_id', userId)
    }

    // 8. Finally, delete user record
    await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    // Log successful deletion
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: userId,
        action: 'account_deleted',
        details: {
          email: token.email,
          deletedAt: new Date().toISOString()
        },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      })

    return NextResponse.json({ 
      success: true,
      message: 'Account and all associated data deleted successfully'
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}