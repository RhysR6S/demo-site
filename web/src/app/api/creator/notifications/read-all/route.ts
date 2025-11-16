// File: src/app/api/creator/notifications/read-all/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.isCreator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Mark all notifications as read
    // Since notifications are generated dynamically from actual database records,
    // marking as read is handled client-side through state management.
    // In a production app with a dedicated notifications table, you would update the database here.
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking all as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}