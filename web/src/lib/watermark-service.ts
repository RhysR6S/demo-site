// src/lib/watermark-service.ts
import sharp from 'sharp'
import { getSupabaseAdmin } from './supabase'
import { getImageFromR2 } from './r2'

export interface WatermarkSettings {
  watermark_type: 'text' | 'image'
  watermark_image_r2_key?: string
  position: 'corner' | 'center' | 'diagonal' | 'custom'
  opacity: number
  scale: number
  enabled: boolean
  offset_x?: number
  offset_y?: number
}

/**
 * Apply brand watermark to image (for Bronze tier storage)
 * This is used during upload to create the watermarked version
 */
export async function applyBrandWatermark(
  imageBuffer: Buffer,
  settings?: WatermarkSettings
): Promise<Buffer> {
  try {
    // Get watermark settings from database or use defaults
    const watermarkSettings = settings || await getCreatorWatermarkSettings() || {
      watermark_type: 'image',
      watermark_image_r2_key: 'watermarks/brand-logo.png',
      position: 'corner',
      opacity: 0.15,
      scale: 1.0,
      enabled: true,
      offset_x: 0,
      offset_y: 0
    }

    if (!watermarkSettings.enabled) {
      return imageBuffer
    }

    console.log('[Watermark] Applying brand watermark with settings:', watermarkSettings)

    // Apply the brand watermark
    if (watermarkSettings.watermark_type === 'image' && watermarkSettings.watermark_image_r2_key) {
      return await applyImageWatermark(imageBuffer, watermarkSettings)
    } else {
      return await applyTextWatermark(imageBuffer, watermarkSettings)
    }
  } catch (error) {
    console.error('[Watermark] Failed to apply brand watermark:', error)
    return imageBuffer // Return original on error
  }
}

/**
 * Apply ID watermark only (lightweight, on-the-fly)
 * This is applied to all images when served, regardless of tier
 */
export async function applyIdWatermark(imageBuffer: Buffer, userId: string): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions')
    }
    
    // Use the actual user ID (no hashing)
    const watermarkText = userId
    
    console.log(`[Watermark] Applying ID watermark: ${watermarkText}`)
    
    // Generate bitmap font watermark
    const watermarkBuffer = await generateBitmapWatermark(watermarkText)
    
    // Get watermark dimensions
    const watermarkMetadata = await sharp(watermarkBuffer).metadata()
    if (!watermarkMetadata.width || !watermarkMetadata.height) {
      throw new Error('Unable to read watermark dimensions')
    }
    
    // Position in top-right corner
    const padding = 20
    const left = Math.max(0, metadata.width - watermarkMetadata.width - padding)
    const top = padding
    
    // Apply watermark with reduced opacity
    const watermarkedImage = await image
      .composite([{
        input: watermarkBuffer,
        left: Math.round(left),
        top: Math.round(top),
        blend: 'over'
      }])
      .jpeg({
        quality: 95,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer()
    
    console.log('[Watermark] ID watermark applied successfully')
    return watermarkedImage
  } catch (error) {
    console.error('[Watermark] Failed to apply ID watermark:', error)
    return imageBuffer // Return original on error
  }
}

/**
 * Generate ID watermark using bitmap font - guaranteed to work
 */
async function generateBitmapWatermark(text: string): Promise<Buffer> {
  console.log(`[Watermark] Generating bitmap watermark for: ${text}`)
  
  const charWidth = 10
  const charHeight = 16
  const width = text.length * charWidth + 20
  const height = charHeight + 8
  
  // Bitmap font definitions (5x7 grid per character)
  const bitmapFont: { [key: string]: number[] } = {
    '0': [0x7C, 0xC6, 0xCE, 0xDE, 0xF6, 0xE6, 0x7C],
    '1': [0x30, 0x70, 0x30, 0x30, 0x30, 0x30, 0xFC],
    '2': [0x78, 0xCC, 0x0C, 0x38, 0x60, 0xC0, 0xFC],
    '3': [0x78, 0xCC, 0x0C, 0x38, 0x0C, 0xCC, 0x78],
    '4': [0x1C, 0x3C, 0x6C, 0xCC, 0xFE, 0x0C, 0x1E],
    '5': [0xFC, 0xC0, 0xF8, 0x0C, 0x0C, 0xCC, 0x78],
    '6': [0x38, 0x60, 0xC0, 0xF8, 0xCC, 0xCC, 0x78],
    '7': [0xFC, 0xCC, 0x0C, 0x18, 0x30, 0x30, 0x30],
    '8': [0x78, 0xCC, 0xCC, 0x78, 0xCC, 0xCC, 0x78],
    '9': [0x78, 0xCC, 0xCC, 0x7C, 0x0C, 0x18, 0x70],
    'A': [0x30, 0x78, 0xCC, 0xCC, 0xFC, 0xCC, 0xCC],
    'B': [0xFC, 0x66, 0x66, 0x7C, 0x66, 0x66, 0xFC],
    'C': [0x3C, 0x66, 0xC0, 0xC0, 0xC0, 0x66, 0x3C],
    'D': [0xF8, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0xF8],
    'E': [0xFE, 0x62, 0x68, 0x78, 0x68, 0x62, 0xFE],
    'F': [0xFE, 0x62, 0x68, 0x78, 0x68, 0x60, 0xF0],
  }
  
  const composites = []
  
  // Render each character
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const bitmap = bitmapFont[char] || bitmapFont['0']
    const x = 10 + i * charWidth
    
    // Create pixels for each character
    for (let row = 0; row < bitmap.length; row++) {
      const byte = bitmap[row]
      for (let col = 0; col < 8; col++) {
        if (byte & (1 << (7 - col))) {
          // Shadow pixel (very subtle)
          composites.push({
            input: Buffer.from(
              `<svg width="2" height="2">
                <rect width="2" height="2" fill="black" opacity="0.05"/>
              </svg>`
            ),
            left: x + col + 1,
            top: 4 + row * 2 + 1,
            blend: 'over' as const
          })
          // Main pixel (15% opacity white)
          composites.push({
            input: Buffer.from(
              `<svg width="2" height="2">
                <rect width="2" height="2" fill="white" opacity="0.15"/>
              </svg>`
            ),
            left: x + col,
            top: 4 + row * 2,
            blend: 'over' as const
          })
        }
      }
    }
  }
  
  // Create the watermark image
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(composites)
  .png()
  .toBuffer()
}

/**
 * Apply custom PNG watermark
 */
async function applyImageWatermark(
  imageBuffer: Buffer,
  settings: WatermarkSettings
): Promise<Buffer> {
  try {
    // Fetch watermark image from R2
    const watermarkResult = await getImageFromR2(settings.watermark_image_r2_key!)
    
    if (!watermarkResult.success || !watermarkResult.data) {
      throw new Error('Failed to fetch watermark image')
    }
    
    const watermarkBuffer = watermarkResult.data
    
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions')
    }
    
    // Process watermark image
    const watermark = sharp(watermarkBuffer)
    const watermarkMetadata = await watermark.metadata()
    
    if (!watermarkMetadata.width || !watermarkMetadata.height) {
      throw new Error('Unable to read watermark dimensions')
    }
    
    // Scale watermark to 15% of image width at scale 1.0
    const scaledWidth = Math.floor(metadata.width * settings.scale * 0.15)
    const scaledHeight = Math.floor(
      (scaledWidth / watermarkMetadata.width) * watermarkMetadata.height
    )
    
    console.log(`[Watermark] Image watermark scaled to: ${scaledWidth}x${scaledHeight}`)
    
    // Resize watermark with opacity
    const processedWatermark = await watermark
      .resize(scaledWidth, scaledHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .composite([{
        input: Buffer.from(
          `<svg width="${scaledWidth}" height="${scaledHeight}">
            <rect width="100%" height="100%" fill="white" fill-opacity="${settings.opacity}"/>
          </svg>`
        ),
        blend: 'dest-in'
      }])
      .toBuffer()
    
    // Calculate position (top-left for brand watermark)
    let left: number, top: number
    
    switch (settings.position) {
      case 'corner':
        // Top-left corner with padding
        left = 20 + Math.floor((settings.offset_x || 0) * metadata.width / 100)
        top = 20 + Math.floor((settings.offset_y || 0) * metadata.height / 100)
        break
        
      case 'center':
        // Center of image
        left = Math.floor((metadata.width - scaledWidth) / 2) + Math.floor((settings.offset_x || 0) * metadata.width / 100)
        top = Math.floor((metadata.height - scaledHeight) / 2) + Math.floor((settings.offset_y || 0) * metadata.height / 100)
        break
        
      case 'custom':
        // Custom position based on offset percentages
        left = Math.floor(metadata.width * (settings.offset_x || 50) / 100 - scaledWidth / 2)
        top = Math.floor(metadata.height * (settings.offset_y || 50) / 100 - scaledHeight / 2)
        break
        
      default:
        // Default to top-left corner
        left = 20
        top = 20
    }
    
    // Ensure watermark stays within bounds
    left = Math.max(0, Math.min(left, metadata.width - scaledWidth))
    top = Math.max(0, Math.min(top, metadata.height - scaledHeight))
    
    // Apply watermark
    const watermarkedImage = await image
      .composite([{
        input: processedWatermark,
        left: Math.floor(left),
        top: Math.floor(top),
        blend: 'over'
      }])
      .jpeg({
        quality: 95,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      })
      .toBuffer()
    
    return watermarkedImage
  } catch (error) {
    console.error('[Watermark] Failed to apply image watermark:', error)
    return imageBuffer
  }
}

/**
 * Apply text watermark with custom settings
 */
async function applyTextWatermark(
  imageBuffer: Buffer,
  settings: WatermarkSettings
): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions')
    }
    
    const watermarkText = '© PhotoVault'
    
    // Calculate font size based on image dimensions and scale
    const fontSize = Math.max(
      14,
      Math.floor(Math.min(metadata.width, metadata.height) / 40 * settings.scale)
    )
    
    // Create watermark based on position
    let watermarkSvg: string
    
    switch (settings.position) {
      case 'corner':
        watermarkSvg = createCornerWatermark(
          watermarkText, 
          metadata.width,
          metadata.height,
          fontSize, 
          settings.opacity,
          settings.offset_x || 0,
          settings.offset_y || 0
        )
        break
        
      case 'center':
        watermarkSvg = createCenterWatermark(
          watermarkText,
          metadata.width,
          metadata.height,
          fontSize * 2,
          settings.opacity * 0.5,
          settings.offset_x || 0,
          settings.offset_y || 0
        )
        break
        
      case 'diagonal':
        watermarkSvg = createDiagonalWatermark(
          watermarkText,
          metadata.width,
          metadata.height,
          fontSize,
          settings.opacity
        )
        break
        
      case 'custom':
        watermarkSvg = createCustomWatermark(
          watermarkText,
          metadata.width,
          metadata.height,
          fontSize,
          settings.opacity,
          settings.offset_x || 0,
          settings.offset_y || 0
        )
        break
        
      default:
        watermarkSvg = createCornerWatermark(
          watermarkText,
          metadata.width,
          metadata.height,
          fontSize,
          settings.opacity,
          0, 0
        )
    }
    
    // Apply watermark
    const watermarkedImage = await image
      .composite([{
        input: Buffer.from(watermarkSvg),
        blend: 'over'
      }])
      .jpeg({
        quality: 95,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      })
      .toBuffer()
    
    return watermarkedImage
  } catch (error) {
    console.error('[Watermark] Failed to apply text watermark:', error)
    return imageBuffer
  }
}

/**
 * Get creator watermark settings
 */
async function getCreatorWatermarkSettings(): Promise<WatermarkSettings | null> {
  try {
    const supabase = getSupabaseAdmin()
    
    // Get the first creator's settings
    const { data, error } = await supabase
      .from('creator_watermark_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return {
          watermark_type: 'image',
          watermark_image_r2_key: 'watermarks/brand-logo.png',
          position: 'corner',
          opacity: 0.15,
          scale: 1.0,
          enabled: true,
          offset_x: 0,
          offset_y: 0
        }
      }
      console.error('Failed to fetch watermark settings:', error)
      return null
    }
    
    return data as WatermarkSettings
  } catch (error) {
    console.error('Failed to fetch watermark settings:', error)
    return null
  }
}

// Helper functions for creating SVG watermarks

function createCornerWatermark(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  opacity: number,
  offsetX: number,
  offsetY: number
): string {
  const padding = 20
  const x = padding + Math.floor((width - padding * 2) * offsetX / 100)
  const y = fontSize + padding + Math.floor((height - padding * 2) * offsetY / 100)
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="${x}" 
        y="${y}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        fill="white" 
        fill-opacity="${opacity}"
        style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5)"
      >${escapeXml(text)}</text>
    </svg>`
}

function createCenterWatermark(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  opacity: number,
  offsetX: number,
  offsetY: number
): string {
  const x = width / 2 + (width * offsetX / 100)
  const y = height / 2 + (height * offsetY / 100)
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="${x}" 
        y="${y}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        fill="white" 
        fill-opacity="${opacity}" 
        text-anchor="middle"
        dominant-baseline="middle"
        style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5)"
      >${escapeXml(text)}</text>
    </svg>`
}

function createDiagonalWatermark(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  opacity: number
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="watermark" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          <text 
            x="100" 
            y="100" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            fill="white" 
            fill-opacity="${opacity}" 
            text-anchor="middle"
            transform="rotate(-45 100 100)"
            style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5)"
          >${escapeXml(text)}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark)" />
    </svg>`
}

function createCustomWatermark(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  opacity: number,
  offsetX: number,
  offsetY: number
): string {
  const x = width / 2 + (width * offsetX / 100)
  const y = height / 2 + (height * offsetY / 100)
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="${x}" 
        y="${y}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        fill="white" 
        fill-opacity="${opacity}" 
        text-anchor="middle"
        dominant-baseline="middle"
        style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5)"
      >${escapeXml(text)}</text>
    </svg>`
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}