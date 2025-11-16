// src/app/api/admin/watermark-preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getImageFromR2 } from '@/lib/r2'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const r2Key = searchParams.get('key')
    
    if (!r2Key) {
      return NextResponse.json(
        { error: 'Missing R2 key' },
        { status: 400 }
      )
    }

    // Fetch watermark image from R2
    const result = await getImageFromR2(r2Key)
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'Failed to load watermark image' },
        { status: 404 }
      )
    }

    // Return the image
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Watermark preview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}