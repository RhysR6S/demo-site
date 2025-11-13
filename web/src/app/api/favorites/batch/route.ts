// src/app/api/favorites/batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

// POST - Get favorite status for multiple sets
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const { setIds } = await request.json()

    if (!setIds || !Array.isArray(setIds) || setIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Get all favorites for the user that match the provided set IDs
    const { data, error } = await supabase
      .from('content_likes')
      .select('set_id')
      .eq('user_id', userId)
      .in('set_id', setIds)

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    // Create a map of set IDs to favorite status
    const favorites: { [setId: string]: boolean } = {}
    setIds.forEach(setId => {
      favorites[setId] = false
    })
    
    if (data) {
      data.forEach(item => {
        favorites[item.set_id] = true
      })
    }

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Batch favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
