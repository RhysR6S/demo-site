// src/app/api/admin/commissions/count/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Count only pending commissions (excluding completed)
    const { count, error } = await supabase
      .from('commissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      console.error('Error counting commissions:', error)
      return NextResponse.json({ error: 'Failed to count commissions' }, { status: 500 })
    }

    return NextResponse.json({ 
      pending: count || 0
    })
  } catch (error) {
    console.error('Commission count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}