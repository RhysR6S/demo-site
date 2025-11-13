// src/app/api/test-r2/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getImageFromR2 } from '@/lib/r2'

export async function GET(request: NextRequest) {
  // Only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    // Check auth
    const token = await getToken({ req: request })
    if (!token?.isCreator) {
      return NextResponse.json({ error: 'Creator access required' }, { status: 403 })
    }

    // Test R2 key from the Mixed Singles set - third image
    const testR2Key = '2025/07/mixed-singles-1752326650500/003.jpg'
    
    console.log('[R2 Test] Testing key:', testR2Key)
    
    // Check environment variables
    const envCheck = {
      CLOUDFLARE_ACCOUNT_ID: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_ACCESS_KEY_ID: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
      CLOUDFLARE_SECRET_ACCESS_KEY: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
      CLOUDFLARE_R2_BUCKET_NAME: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
      CLOUDFLARE_ENDPOINT: process.env.CLOUDFLARE_ENDPOINT,
      NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL
    }
    
    console.log('[R2 Test] Environment check:', envCheck)
    
    // Try to fetch from R2
    try {
      const result = await getImageFromR2(testR2Key)
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || 'getImageFromR2 failed',
          envCheck,
          testKey: testR2Key
        })
      }
      
      if (!result.data) {
        return NextResponse.json({
          success: false,
          error: 'No data returned from R2',
          envCheck,
          testKey: testR2Key
        })
      }
      
      return NextResponse.json({
        success: true,
        bufferSize: result.data.length,
        isBuffer: Buffer.isBuffer(result.data),
        envCheck,
        testKey: testR2Key,
        message: 'Successfully fetched image from R2'
      })
      
    } catch (r2Error) {
      console.error('[R2 Test] R2 fetch error:', r2Error)
      return NextResponse.json({
        success: false,
        error: r2Error instanceof Error ? r2Error.message : 'Unknown R2 error',
        envCheck,
        testKey: testR2Key
      })
    }
    
  } catch (error) {
    console.error('[R2 Test] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
