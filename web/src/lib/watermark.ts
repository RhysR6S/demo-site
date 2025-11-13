import sharp from 'sharp'
import crypto from 'crypto'

interface WatermarkOptions {
  opacity?: number
  fontSize?: number
  position?: 'center' | 'corners' | 'random'
  color?: string
}

/**
 * Add watermark to image using user ID instead of email
 */
export async function addWatermark(
  imageBuffer: Buffer,
  userId: string,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  const {
    opacity = 0.15, // 15% opacity - visible but not intrusive
    fontSize = 0,   // Auto-calculate if not provided
    position = 'center',
    color = 'white'
  } = options

  try {
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions')
    }

    // Generate a short hash of the user ID for display
    const userIdHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 8).toUpperCase()
    const watermarkText = `ID: ${userIdHash}`

    // Calculate font size based on image dimensions
    const calculatedFontSize = fontSize || Math.max(
      16,
      Math.floor(Math.min(metadata.width, metadata.height) / 30)
    )

    // Create watermark pattern
    const watermarkSvg = createWatermarkSvg(
      watermarkText,
      metadata.width,
      metadata.height,
      calculatedFontSize,
      opacity,
      position,
      color
    )

    // Apply watermark and optimize output
    const watermarkedImage = await image
      .composite([{
        input: Buffer.from(watermarkSvg),
        blend: 'over'
      }])
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer()

    return watermarkedImage
  } catch (error) {
    console.error('Watermark error:', error)
    // NEVER fail - always return original on error
    return imageBuffer
  }
}

/**
 * Add metadata watermark (invisible) using user ID
 */
export async function addMetadataWatermark(
  imageBuffer: Buffer,
  userId: string,
  setId: string
): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer)
    
    // Create tracking ID that links to user without exposing personal info
    const trackingId = crypto.createHash('sha256')
      .update(`${userId}-${setId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16)
    
    // Add metadata
    const watermarkedImage = await image
      .withMetadata({
        exif: {
          IFD0: {
            Copyright: `Protected Content - Tracking ID: ${trackingId}`,
            Artist: 'KamiContent',
            Software: 'KamiContent Protection System'
          }
        }
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer()

    // Store tracking ID in database for later lookup if needed
    // This would link trackingId -> userId without exposing the userId
    
    return watermarkedImage
  } catch (error) {
    console.error('Metadata watermark error:', error)
    return imageBuffer
  }
}

function createWatermarkSvg(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  opacity: number,
  position: string,
  color: string
): string {
  // Escape text for SVG
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  if (position === 'center') {
    // Diagonal repeating pattern
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="watermark" x="0" y="0" width="250" height="250" patternUnits="userSpaceOnUse">
            <text 
              x="125" 
              y="125" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              fill="${color}" 
              fill-opacity="${opacity}" 
              text-anchor="middle"
              transform="rotate(-45 125 125)"
            >${escapedText}</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark)" />
      </svg>
    `
  } else if (position === 'corners') {
    // Subtle corner watermarks
    const padding = 20
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="${padding}" y="${fontSize + padding}" 
          font-family="Arial, sans-serif" font-size="${fontSize}" 
          fill="${color}" fill-opacity="${opacity * 0.5}">${escapedText}</text>
        <text x="${width - padding}" y="${fontSize + padding}" 
          font-family="Arial, sans-serif" font-size="${fontSize}" 
          fill="${color}" fill-opacity="${opacity * 0.5}" text-anchor="end">${escapedText}</text>
        <text x="${padding}" y="${height - padding}" 
          font-family="Arial, sans-serif" font-size="${fontSize}" 
          fill="${color}" fill-opacity="${opacity * 0.5}">${escapedText}</text>
        <text x="${width - padding}" y="${height - padding}" 
          font-family="Arial, sans-serif" font-size="${fontSize}" 
          fill="${color}" fill-opacity="${opacity * 0.5}" text-anchor="end">${escapedText}</text>
      </svg>
    `
  } else {
    // Random single position (changes per image)
    const x = Math.random() * (width - 200) + 100
    const y = Math.random() * (height - 100) + 50
    const rotation = Math.random() * 60 - 30 // -30 to +30 degrees
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="${x}" y="${y}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          fill="${color}" 
          fill-opacity="${opacity}"
          text-anchor="middle"
          transform="rotate(${rotation} ${x} ${y})"
        >${escapedText}</text>
      </svg>
    `
  }
}

// Visible watermark for testing
export async function addVisibleWatermark(
  imageBuffer: Buffer,
  userId: string
): Promise<Buffer> {
  return addWatermark(imageBuffer, userId, {
    opacity: 0.4,
    position: 'center',
    color: 'red'
  })
}
