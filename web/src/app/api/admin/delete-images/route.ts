// src/app/api/admin/delete-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import { deleteImageFromR2 } from '@/lib/r2'

export async function DELETE(request: NextRequest) {
  try {
    // Verify creator access
    const token = await getToken({ req: request })
    if (!token || !token.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const { setId } = await request.json()
    
    if (!setId) {
      return NextResponse.json(
        { error: 'Set ID required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Get all images for this set
    const { data: images } = await supabase
      .from('images')
      .select('r2_key')
      .eq('set_id', setId)
    
    if (images && images.length > 0) {
      // Delete from R2 storage
      const deletePromises = images.map(img => deleteImageFromR2(img.r2_key))
      await Promise.all(deletePromises)
      
      console.log(`Deleted ${images.length} images from R2 for set ${setId}`)
    }
    
    return NextResponse.json({ success: true, deletedCount: images?.length || 0 })
  } catch (error) {
    console.error('Delete images error:', error)
    return NextResponse.json(
      { error: 'Failed to delete images' },
      { status: 500 }
    )
  }
}