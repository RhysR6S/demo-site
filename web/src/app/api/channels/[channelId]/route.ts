// Path: src/app/api/channels/[channelId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkChannelAccess } from '@/middleware/tier-access'

export async function GET(request: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
    const { channelId } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessCheck = await checkChannelAccess(request, channelId)
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: 403 }
      )
    }

    return NextResponse.json({ channel: accessCheck.channel })
  } catch (error) {
    console.error('Error in channel GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}