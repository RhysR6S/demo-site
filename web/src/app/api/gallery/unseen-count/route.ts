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

    // Direct lookup by ID
    const { data: user, error } = await supabase
      .from('users')
      .select('unseen_sets_count')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('User lookup error:', error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ 
      count: user?.unseen_sets_count || 0
    })
  } catch (error) {
    console.error('Unseen count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}