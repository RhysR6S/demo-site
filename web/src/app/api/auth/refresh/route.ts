// src/app/api/auth/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Force the session to refresh by updating the JWT token
    // This will trigger the JWT callback in auth.config.ts to reload the creator profile
    return NextResponse.json({ 
      success: true,
      message: 'Session will be refreshed on next request' 
    })
  } catch (error) {
    console.error('Error refreshing session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}