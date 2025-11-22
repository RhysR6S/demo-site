// app/api/gallery/unseen-count/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use database function to dynamically calculate unseen count
    const { data, error } = await supabase
      .rpc('count_user_unseen_sets', {
        p_user_id: session.user.id
      })

    if (error) {
      console.error('Error counting unseen sets:', error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({
      count: data || 0
    })
  } catch (error) {
    console.error('Unseen count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}