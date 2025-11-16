// src/app/api/privacy/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const userId = token.sub

    // Collect all user data
    const exportData: any = {
      exportDate: new Date().toISOString(),
      userData: {
        id: userId,
        email: token.email,
        name: token.name,
        membershipTier: token.membershipTier,
        isActivePatron: token.isActivePatron,
        isCreator: token.isCreator
      },
      data: {}
    }

    // Get user activity
    const { data: activities } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (activities) {
      exportData.data.activities = activities.map(a => ({
        action: a.action,
        setId: a.set_id,
        imageId: a.image_id,
        timestamp: a.created_at
      }))
    }

    // Get view history
    const { data: views } = await supabase
      .from('user_set_views')
      .select('*, content_sets(title, slug)')
      .eq('user_id', userId)

    if (views) {
      exportData.data.viewHistory = views.map((v: any) => ({
        contentTitle: v.content_sets?.title,
        contentSlug: v.content_sets?.slug,
        firstViewed: v.first_viewed_at,
        lastViewed: v.last_viewed_at,
        viewCount: v.view_count
      }))
    }

    // Get downloads
    const { data: downloads } = await supabase
      .from('user_set_downloads')
      .select('*, content_sets(title, slug)')
      .eq('user_id', userId)

    if (downloads) {
      exportData.data.downloads = downloads.map((d: any) => ({
        contentTitle: d.content_sets?.title,
        contentSlug: d.content_sets?.slug,
        downloadedAt: d.downloaded_at,
        downloadCount: d.download_count
      }))
    }

    // Get likes
    const { data: likes } = await supabase
      .from('content_likes')
      .select('*, content_sets(title, slug)')
      .eq('user_id', userId)

    if (likes) {
      exportData.data.likes = likes.map((l: any) => ({
        contentTitle: l.content_sets?.title,
        contentSlug: l.content_sets?.slug,
        likedAt: l.created_at
      }))
    }

    // Get comments
    const { data: comments } = await supabase
      .from('content_comments')
      .select('*, content_sets(title)')
      .eq('user_id', userId)
      .eq('is_deleted', false)

    if (comments) {
      exportData.data.comments = comments.map((c: any) => ({
        contentTitle: c.content_sets?.title,
        comment: c.comment,
        createdAt: c.created_at
      }))
    }

    // Get privacy consent
    const { data: consent } = await supabase
      .from('user_privacy_consent')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (consent) {
      exportData.data.privacyConsent = {
        trackingConsent: consent.tracking_consent,
        communicationConsent: consent.communication_consent,
        consentDate: consent.updated_at
      }
    }

    // Log export request
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: userId,
        action: 'data_export',
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      })

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="kamicontent-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}