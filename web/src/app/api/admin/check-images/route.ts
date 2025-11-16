// src/app/api/admin/check-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verify creator access
    const token = await getToken({ req: request })
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get a sample of images to check
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('[Check Images API] Database error:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }
    
    // Check R2/Cloudflare configuration (support both naming conventions)
    const r2Config = {
      publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 
                process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || 
                'NOT SET - Add NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL to .env.local',
      bucketName: process.env.R2_BUCKET_NAME || 
                  process.env.CLOUDFLARE_BUCKET || 
                  'NOT SET',
      accountId: (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID) ? 'SET' : 'NOT SET',
      accessKeyId: (process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID) ? 'SET' : 'NOT SET',
      secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY) ? 'SET' : 'NOT SET',
    }
    
    // Check if images have r2_key
    const imageCheck = images?.map(img => ({
      id: img.id,
      filename: img.filename,
      r2_key: img.r2_key || 'MISSING',
      set_id: img.set_id,
      hasR2Key: !!img.r2_key
    })) || []
    
    const response = {
      r2Config,
      sampleImages: imageCheck,
      totalImagesChecked: images?.length || 0,
      imagesWithR2Key: imageCheck.filter(img => img.hasR2Key).length,
      imagesWithoutR2Key: imageCheck.filter(img => !img.hasR2Key).length,
      recommendation: (!process.env.NEXT_PUBLIC_R2_PUBLIC_URL && !process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL)
        ? 'CRITICAL: Add NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL to your .env.local file. Example: NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL=https://pub-xxxxx.r2.dev' 
        : 'Public URL is configured. If images still not loading, check: 1) R2 bucket is set to public access, 2) CORS settings allow your domain'
    }
    
    console.log('[Check Images API] Debug response:', response)
    
    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error('[Check Images API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
}