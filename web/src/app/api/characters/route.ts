// src/app/api/characters/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a request from the public commission page
    const referer = request.headers.get('referer')
    const isPublicAccess = referer && referer.includes('/commissions/public')
    
    // If not public access, check authentication
    if (!isPublicAccess) {
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    const supabase = getSupabaseAdmin()
    
    // Fetch all characters with their series
    const { data: characters, error } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        slug,
        series:series_id (
          id,
          name
        )
      `)
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching characters:', error)
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
    }
    
    return NextResponse.json({ characters: characters || [] })
  } catch (error) {
    console.error('Characters API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
