// src/app/api/admin/forensics/investigate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { investigateImageAccess } from '@/lib/forensic-logger'

export async function POST(request: NextRequest) {
  try {
    // Verify creator access
    const token = await getToken({ req: request })
    if (!token?.isCreator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { imageId, startDate, endDate } = await request.json()

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
    }

    const timeRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    } : undefined

    const accesses = await investigateImageAccess(imageId, timeRange)

    return NextResponse.json({
      imageId,
      accessCount: accesses?.length || 0,
      accesses
    })
  } catch (error) {
    console.error('Forensic investigation error:', error)
    return NextResponse.json({ error: 'Investigation failed' }, { status: 500 })
  }
}