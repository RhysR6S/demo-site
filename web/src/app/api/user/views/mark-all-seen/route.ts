// app/api/user/views/mark-all-seen/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin()

    // Get all published content sets
    const { data: allSets, error: setsError } = await supabase
      .from('content_sets')
      .select('id')
      .or(`published_at.not.is.null,scheduled_time.lte.${new Date().toISOString()}`)

    if (setsError) {
      console.error('Error fetching content sets:', setsError)
      return NextResponse.json(
        { error: 'Failed to fetch content sets' },
        { status: 500 }
      )
    }

    if (!allSets || allSets.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No content sets to mark as seen',
        markedCount: 0 
      })
    }

    // Get already viewed sets to avoid duplicates
    const { data: existingViews, error: viewsError } = await supabase
      .from('user_set_views')
      .select('set_id')
      .eq('user_id', userId)

    if (viewsError) {
      console.error('Error fetching existing views:', viewsError)
      return NextResponse.json(
        { error: 'Failed to fetch existing views' },
        { status: 500 }
      )
    }

    const existingSetIds = new Set(existingViews?.map(v => v.set_id) || [])
    const now = new Date().toISOString()

    // Prepare records for sets that haven't been viewed yet
    const newViewRecords = allSets
      .filter(set => !existingSetIds.has(set.id))
      .map(set => ({
        user_id: userId,
        set_id: set.id,
        first_viewed_at: now,
        last_viewed_at: now,
        view_count: 1
      }))

    // Insert new view records if there are any
    if (newViewRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('user_set_views')
        .insert(newViewRecords)

      if (insertError) {
        console.error('Error inserting view records:', insertError)
        return NextResponse.json(
          { error: 'Failed to mark sets as seen' },
          { status: 500 }
        )
      }
    }

    // Update the user's unseen_sets_count to 0
    const { error: updateError } = await supabase
      .from('users')
      .update({ unseen_sets_count: 0 })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user unseen count:', updateError)
      // Don't fail the whole operation if this update fails
    }

    return NextResponse.json({
      success: true,
      message: 'All sets marked as seen',
      markedCount: newViewRecords.length,
      totalSets: allSets.length
    })

  } catch (error) {
    console.error('Mark all as seen error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}