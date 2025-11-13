// src/lib/watermark-generator.ts
import sharp from 'sharp'
import { join } from 'path'
import { readFileSync } from 'fs'

/**
 * Alternative approach: Create watermark using Canvas-like API in Sharp
 * This is more reliable than SVG font embedding
 */
export async function createTextWatermark(
  text: string,
  options: {
    fontSize?: number
    fontPath?: string
    color?: string
    strokeColor?: string
    strokeWidth?: number
  } = {}
): Promise<Buffer> {
  const {
    fontSize = 20,
    fontPath = join(process.cwd(), 'public/fonts/Ananias.ttf'),
    color = 'white',
    strokeColor = 'black',
    strokeWidth = 2
  } = options
  
  // Calculate dimensions
  const padding = 10
  const width = text.length * fontSize * 0.7 + padding * 2
  const height = fontSize + padding * 2
  
  try {
    // Method 1: Use Sharp's text overlay feature (requires libvips with text support)
    const textBuffer = await sharp({
      text: {
        text: text,
        font: 'Ananias',
        fontfile: fontPath,
        width: Math.ceil(width),
        height: Math.ceil(height),
        align: 'center',
        rgba: true,
        spacing: 0,
        dpi: 72
      }
    })
    .png()
    .toBuffer()
    
    return textBuffer
  } catch (error) {
    console.warn('Sharp text rendering failed, using SVG fallback:', error)
    
    // Method 2: Enhanced SVG with better font handling
    try {
      // Read font file and convert to base64
      const fontBuffer = readFileSync(fontPath)
      const fontBase64 = fontBuffer.toString('base64')
      
      // Create SVG with embedded font
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style type="text/css">
              @font-face {
                font-family: 'AnaniasEmbedded';
                src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
              }
            </style>
            <filter id="shadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
              <feOffset dx="1" dy="1" result="offsetblur"/>
              <feFlood flood-color="#000000" flood-opacity="0.8"/>
              <feComposite in2="offsetblur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <text 
            x="${width / 2}" 
            y="${height / 2 + fontSize / 3}" 
            font-family="AnaniasEmbedded, monospace" 
            font-size="${fontSize}px" 
            fill="${color}" 
            text-anchor="middle"
            filter="url(#shadow)"
          >${escapeXml(text)}</text>
        </svg>`
      
      return await sharp(Buffer.from(svg))
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer()
    } catch (svgError) {
      console.error('SVG with embedded font failed:', svgError)
      
      // Method 3: Ultimate fallback - monospace font
      const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow">
              <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.8"/>
            </filter>
          </defs>
          <text 
            x="${width / 2}" 
            y="${height / 2 + fontSize / 3}" 
            font-family="Courier New, monospace" 
            font-size="${fontSize}px" 
            font-weight="bold"
            fill="${color}" 
            text-anchor="middle"
            filter="url(#shadow)"
          >${escapeXml(text)}</text>
        </svg>`
      
      return await sharp(Buffer.from(fallbackSvg))
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer()
    }
  }
}

/**
 * Create a watermark badge with background
 */
export async function createWatermarkBadge(
  text: string,
  options: {
    fontSize?: number
    padding?: number
    backgroundColor?: string
    backgroundOpacity?: number
    textColor?: string
    borderRadius?: number
  } = {}
): Promise<Buffer> {
  const {
    fontSize = 16,
    padding = 8,
    backgroundColor = '#000000',
    backgroundOpacity = 0.7,
    textColor = '#ffffff',
    borderRadius = 4
  } = options
  
  // Calculate dimensions
  const width = text.length * fontSize * 0.6 + padding * 2
  const height = fontSize + padding * 2
  
  // Create SVG with background
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="1" result="offsetblur"/>
          <feFlood flood-color="#000000" flood-opacity="0.3"/>
          <feComposite in2="offsetblur" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background with rounded corners -->
      <rect 
        x="0" 
        y="0" 
        width="${width}" 
        height="${height}" 
        rx="${borderRadius}" 
        ry="${borderRadius}"
        fill="${backgroundColor}" 
        fill-opacity="${backgroundOpacity}"
        filter="url(#shadow)"
      />
      
      <!-- Text -->
      <text 
        x="${width / 2}" 
        y="${height / 2 + fontSize / 3}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}px" 
        font-weight="500"
        fill="${textColor}" 
        text-anchor="middle"
      >${escapeXml(text)}</text>
    </svg>`
  
  return await sharp(Buffer.from(svg))
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()
}

// Helper function to escape XML
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
