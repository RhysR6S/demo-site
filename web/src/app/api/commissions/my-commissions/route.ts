// src/app/api/commissions/my-commissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const userId = session.user.id

    // Get all user's commissions
    const { data: commissions, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user commissions:', error)
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
    }

    // Map archived status to completed for user view
    const processedCommissions = commissions?.map(commission => ({
      ...commission,
      status: commission.status === 'archived' ? 'completed' : commission.status,
      // Add a flag to indicate if it was archived (optional, for transparency)
      was_archived: commission.status === 'archived'
    })) || []

    return NextResponse.json({ 
      commissions: processedCommissions 
    })

  } catch (error) {
    console.error('My commissions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}