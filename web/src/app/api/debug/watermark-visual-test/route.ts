// src/app/api/debug/watermark-visual-test/route.ts
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { applyTierBasedWatermark } from '@/lib/watermark-service'

export async function GET() {
  // Only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    // Create a simple test image
    const testImage = await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 50, g: 50, b: 50 }
      }
    })
    .composite([{
      input: Buffer.from(`
        <svg width="600" height="400">
          <rect x="0" y="0" width="600" height="400" fill="#323232"/>
          <text x="300" y="200" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
            Test Image for Watermark
          </text>
          <text x="300" y="230" font-family="Arial" font-size="16" fill="#999" text-anchor="middle">
            Check top-right corner for ID watermark
          </text>
        </svg>
      `),
      blend: 'over'
    }])
    .jpeg()
    .toBuffer()
    
    // Apply watermark
    const watermarkedImage = await applyTierBasedWatermark(testImage, {
      userId: 'TEST123',
      userTier: 'gold',
      setId: 'test',
      imageId: 'test',
      skipCache: true
    })
    
    // Return the watermarked image
    return new NextResponse(watermarkedImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
        'X-Test-Info': 'Look for ID: TEST123 in top-right corner'
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create test image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
