// src/app/api/admin/watermark-upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadToR2 } from '@/lib/r2'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Read file
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // Generate unique R2 key
    const timestamp = Date.now()
    const r2Key = `watermarks/${session.user.id}-${timestamp}.png`

    // Upload to R2
    await uploadToR2(r2Key, uint8Array, file.type)

    return NextResponse.json({
      success: true,
      r2Key
    })
  } catch (error) {
    console.error('Watermark upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload watermark' },
      { status: 500 }
    )
  }
}
