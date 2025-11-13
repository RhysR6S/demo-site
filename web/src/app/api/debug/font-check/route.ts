// src/app/api/debug/font-check/route.ts
import { NextResponse } from 'next/server'
import { existsSync, statSync } from 'fs'
import { join } from 'path'

export async function GET() {
  // Only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    checks: {}
  }
  
  // Check public/fonts directory
  const publicFontPath = join(process.cwd(), 'public/fonts/Ananias.ttf')
  results.checks.publicFont = {
    path: publicFontPath,
    exists: existsSync(publicFontPath),
    size: existsSync(publicFontPath) ? statSync(publicFontPath).size : null
  }
  
  // Check src/fonts directory
  const srcFontPath = join(process.cwd(), 'src/fonts/Ananias.ttf')
  results.checks.srcFont = {
    path: srcFontPath,
    exists: existsSync(srcFontPath),
    size: existsSync(srcFontPath) ? statSync(srcFontPath).size : null
  }
  
  // Check if watermark service can load the font
  try {
    const { applyTierBasedWatermark } = await import('@/lib/watermark-service')
    results.watermarkServiceLoaded = true
    
    // Test watermarking a small buffer
    const testBuffer = Buffer.from('test')
    const watermarked = await applyTierBasedWatermark(testBuffer, {
      userId: 'TEST123',
      userTier: 'gold',
      setId: 'test',
      imageId: 'test'
    })
    results.watermarkTest = {
      success: true,
      originalSize: testBuffer.length,
      watermarkedSize: watermarked.length,
      sizeChanged: testBuffer.length !== watermarked.length
    }
  } catch (error) {
    results.watermarkServiceLoaded = false
    results.watermarkError = error instanceof Error ? error.message : 'Unknown error'
  }
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}
