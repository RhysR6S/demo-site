// src/app/api/placeholder/[...dimensions]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dimensions: string[] }> }
) {
  try {
    const { dimensions } = await params
    const [width, height] = dimensions.map(d => parseInt(d))
    
    if (!width || !height || width > 1200 || height > 1200) {
      return NextResponse.json(
        { error: 'Invalid dimensions' },
        { status: 400 }
      )
    }

    // Create a gradient placeholder image
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#gradient)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#666" font-family="Arial" font-size="14">
          Sample Image
        </text>
      </svg>
    `

    const buffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 80 })
      .toBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('Placeholder image error:', error)
    return NextResponse.json(
      { error: 'Failed to generate placeholder' },
      { status: 500 }
    )
  }
}