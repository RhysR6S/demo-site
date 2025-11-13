// scripts/check-watermark-image.ts
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
import * as fs from 'fs'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  }
})

const bucketName = process.env.CLOUDFLARE_BUCKET!

async function checkWatermarkImage() {
  const watermarkKey = 'watermarks/109483064-1753730885285.png'
  
  console.log(`Checking for watermark image: ${watermarkKey}\n`)
  
  try {
    // Check if file exists
    await r2Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: watermarkKey
    }))
    
    console.log('✓ Watermark image exists in R2')
    
    // Try to download it
    const response = await r2Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: watermarkKey
    }))
    
    const chunks = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    console.log(`✓ Successfully downloaded watermark (${(buffer.length / 1024).toFixed(1)} KB)`)
    
    // Save locally for inspection
    fs.writeFileSync('watermark-test.png', buffer)
    console.log('✓ Saved watermark to watermark-test.png for inspection')
    
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log('✗ Watermark image NOT FOUND in R2')
      console.log('\nYou need to upload your watermark image to R2 at this key:')
      console.log(`  ${watermarkKey}`)
    } else {
      console.error('✗ Error checking watermark:', error.message)
    }
  }
  
  // Also check for other watermark files
  console.log('\nChecking for other watermark files in R2...')
  
  const { ListObjectsV2Command } = require('@aws-sdk/client-s3')
  
  try {
    const response = await r2Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'watermarks/',
      MaxKeys: 20
    }))
    
    if (response.Contents) {
      console.log('\nFound watermark files:')
      const watermarkFiles = response.Contents
        .filter((obj: any) => obj.Key && !obj.Key.includes('user-ids/') && obj.Key.endsWith('.png'))
        .map((obj: any) => obj.Key)
      
      watermarkFiles.forEach((key: string) => {
        console.log(`  - ${key}`)
      })
      
      if (watermarkFiles.length > 0 && !watermarkFiles.includes(watermarkKey)) {
        console.log('\n⚠️  Your configured watermark is not in the list above!')
        console.log('You may need to update your watermark settings to use one of these files.')
      }
    }
  } catch (error) {
    console.error('Error listing watermarks:', error)
  }
}

checkWatermarkImage()
