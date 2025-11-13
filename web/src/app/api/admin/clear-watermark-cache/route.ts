// src/app/api/admin/clear-watermark-cache/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { deleteFromR2 } from '@/lib/r2'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Clear database cache
    await supabase.from('watermark_cache').delete().gte('id', '00000000-0000-0000-0000-000000000000')
    
    // Get all cached watermark keys from R2
    // Since we can't list R2 objects directly, we'll clear known patterns
    const userIds = await supabase
      .from('users')
      .select('id, patreon_user_id')
      .limit(1000)
    
    if (userIds.data) {
      // Clear user ID watermarks
      const deletePromises = userIds.data.map(user => {
        const userId = user.patreon_user_id || user.id
        return deleteFromR2(`watermarks/user-ids/${userId}.png`).catch(() => {})
      })
      
      await Promise.all(deletePromises)
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Watermark cache cleared'
    })
  } catch (error) {
    console.error('Clear cache error:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
