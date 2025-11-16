// Path: src/app/api/dm/members/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Only creators can search members' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    
    if (!query || query.length < 2) {
      return NextResponse.json({ members: [] })
    }

    // Search patrons in the database
    let { data: patrons, error } = await supabase
      .rpc('search_patrons', { search_query: query })

    if (error) {
      console.error('Error searching patrons:', error)
      // Fallback to direct query if function doesn't exist
      const { data: fallbackPatrons, error: fallbackError } = await supabase
        .from('patrons')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('tier_name', { ascending: false })
        .order('full_name', { ascending: true })
        .limit(20)

      if (fallbackError) {
        throw fallbackError
      }

      patrons = fallbackPatrons
    }

    // Format response
    const formattedMembers = (patrons || []).map((patron: any) => ({
      id: patron.id,
      name: patron.full_name,
      email: patron.email,
      tier: patron.tier_name,
      monthlyAmount: patron.currently_entitled_amount_cents,
      lifetimeSupport: patron.lifetime_support_cents,
      status: patron.patron_status
    }))

    return NextResponse.json({ 
      members: formattedMembers,
      query: query,
      count: formattedMembers.length
    })
  } catch (error) {
    console.error('Error searching members:', error)
    return NextResponse.json({ error: 'Failed to search members' }, { status: 500 })
  }
}