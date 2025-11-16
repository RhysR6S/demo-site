// src/app/api/debug/watermark-generation-test/route.ts
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET() {
  // Only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const userId = 'TEST123'
    const watermarkText = `ID: ${userId}`
    
    // Try different approaches to generate the watermark
    const results: any = {
      timestamp: new Date().toISOString(),
      userId,
      approaches: {}
    }
    
    // Approach 1: Using Sharp text overlay (most reliable)
    try {
      const approach1 = await sharp({
        text: {
          text: watermarkText,
          font: 'Ananias',
          fontfile: join(process.cwd(), 'public/fonts/Ananias.ttf'),
          width: 150,
          height: 40,
          align: 'center',
          rgba: true,
          spacing: 0
        }
      })
      .png()
      .toBuffer()
      
      results.approaches.sharpText = {
        success: true,
        size: approach1.length
      }
    } catch (error) {
      results.approaches.sharpText = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Approach 2: Create a test image with the watermark
    try {
      // First check if font exists
      const fontPath = join(process.cwd(), 'public/fonts/Ananias.ttf')
      results.fontExists = existsSync(fontPath)
      results.fontPath = fontPath
      
      // Create a dark test image
      const testImage = await sharp({
        create: {
          width: 600,
          height: 400,
          channels: 3,
          background: { r: 50, g: 50, b: 50 }
        }
      })
      .jpeg()
      .toBuffer()
      
      // Try to create watermark with custom font using Sharp's text feature
      let watermarkBuffer: Buffer
      
      try {
        // This approach uses Sharp's built-in text rendering
        watermarkBuffer = await sharp({
          text: {
            text: watermarkText,
            font: 'Ananias',
            fontfile: fontPath,
            dpi: 72,
            rgba: true,
            spacing: 0
          }
        })
        .extend({
          top: 10,
          bottom: 10,
          left: 10,
          right: 10,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
        
        results.watermarkGenerated = true
      } catch (fontError) {
        console.error('Font rendering failed, using fallback:', fontError)
        
        // Fallback to SVG with monospace
        const svg = `
          <svg width="150" height="40" xmlns="http://www.w3.org/2000/svg">
            <text 
              x="75" 
              y="25" 
              font-family="monospace" 
              font-size="20" 
              fill="white" 
              text-anchor="middle"
              style="filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.8))"
            >${watermarkText}</text>
          </svg>
        `
        
        watermarkBuffer = await sharp(Buffer.from(svg))
          .png()
          .toBuffer()
          
        results.watermarkGenerated = false
        results.fallbackUsed = true
      }
      
      // Get watermark metadata
      const watermarkMeta = await sharp(watermarkBuffer).metadata()
      results.watermarkDimensions = {
        width: watermarkMeta.width,
        height: watermarkMeta.height
      }
      
      // Apply watermark to test image
      const watermarkedImage = await sharp(testImage)
        .composite([{
          input: watermarkBuffer,
          top: 20,
          left: 600 - (watermarkMeta.width || 150) - 20,
          blend: 'over'
        }])
        .jpeg({ quality: 95 })
        .toBuffer()
      
      // Return the watermarked image
      return new NextResponse(watermarkedImage, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Debug-Info': JSON.stringify(results)
        }
      })
    } catch (error) {
      results.approaches.testImage = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // If we couldn't generate an image, return JSON debug info
    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test watermark generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}