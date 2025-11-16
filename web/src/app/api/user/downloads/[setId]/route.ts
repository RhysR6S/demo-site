// src/app/api/user/downloads/[setId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { setId } = await params
    const userId = token.sub
    const supabase = getSupabaseAdmin()

    // Upsert download record
    const { error } = await supabase
      .from('user_set_downloads')
      .upsert({
        user_id: userId,
        set_id: setId,
        downloaded_at: new Date().toISOString(),
        download_count: 1
      }, {
        onConflict: 'user_id,set_id',
        ignoreDuplicates: false
      })

    if (error) {
      throw error
    }

    // Increment download count on set
    await supabase.rpc('increment_download_count', { set_id: setId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Download tracking error:', error)
    return NextResponse.json({ error: 'Failed to track download' }, { status: 500 })
  }
}