// src/lib/r2-signed.ts
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
})

/**
 * Generate a signed URL for direct R2 access
 * @param r2Key - The R2 object key (e.g., "2025/10/slug/original/001.jpg")
 * @param expiresIn - URL expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL that allows direct browser access
 */
export async function generateSignedR2Url(
  r2Key: string,
  expiresIn: number = 900 // 15 minutes default
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET!,
      Key: r2Key,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn,
    })

    return signedUrl
  } catch (error) {
    console.error('[R2 Signed URL] Failed to generate:', error)
    throw new Error('Failed to generate signed URL')
  }
}

/**
 * Generate signed URLs for multiple images at once (for gallery views)
 */
export async function generateBatchSignedUrls(
  r2Keys: string[],
  expiresIn: number = 900
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()

  await Promise.all(
    r2Keys.map(async (key) => {
      try {
        const url = await generateSignedR2Url(key, expiresIn)
        urlMap.set(key, url)
      } catch (error) {
        console.error(`[R2 Signed URL] Failed for key: ${key}`, error)
      }
    })
  )

  return urlMap
}
