// src/app/api/admin/regenerate-watermarks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { regenerateUserIdWatermark } from '@/lib/watermark-service'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { userId, allUsers = false } = body
    
    if (!userId && !allUsers) {
      return NextResponse.json(
        { error: 'Must specify either userId or allUsers' },
        { status: 400 }
      )
    }
    
    const results = {
      success: true,
      regenerated: [] as string[],
      failed: [] as { userId: string; error: string }[]
    }
    
    if (allUsers) {
      // Get all unique user IDs from the database
      const supabase = getSupabaseAdmin()
      
      // Get from user_profiles
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
      
      if (users) {
        for (const user of users) {
          try {
            await regenerateUserIdWatermark(user.user_id)
            results.regenerated.push(user.user_id)
            
            // Add a small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            results.failed.push({
              userId: user.user_id,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }
    } else {
      // Regenerate for specific user
      try {
        await regenerateUserIdWatermark(userId)
        results.regenerated.push(userId)
      } catch (error) {
        results.failed.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        results.success = false
      }
    }
    
    return NextResponse.json({
      ...results,
      summary: {
        total: results.regenerated.length + results.failed.length,
        succeeded: results.regenerated.length,
        failed: results.failed.length
      }
    })
  } catch (error) {
    console.error('[Admin] Error regenerating watermarks:', error)
    return NextResponse.json(
      { 
        error: 'Failed to regenerate watermarks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}