// src/app/api/admin/commissions/[commissionId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { invalidateCache } from '../route'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const { commissionId } = await params
    const body = await request.json()
    const { status, notes } = body

    // Validate the status
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Build the update object
    const updateData: any = { status }
    
    // Add notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // If status is completed, add completed_at timestamp
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Update the commission
    const { data, error } = await supabase
      .from('commissions')
      .update(updateData)
      .eq('id', commissionId)
      .select(`
        id,
        status,
        completed_at,
        notes
      `)
      .single()

    if (error) {
      console.error('Error updating commission:', error)
      return NextResponse.json(
        { error: 'Failed to update commission' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    // Invalidate cache after successful update
    invalidateCache()

    return NextResponse.json({ 
      success: true,
      commission: data
    })

  } catch (error) {
    console.error('Commission update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const { commissionId } = await params
    const supabase = getSupabaseAdmin()

    // First, get the commission to check if it's a free tier commission
    const { data: commission, error: fetchError } = await supabase
      .from('commissions')
      .select('id, is_free_tier, status')
      .eq('id', commissionId)
      .single()

    if (fetchError || !commission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of completed free-tier commissions
    if (commission.is_free_tier && commission.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed free-tier commissions. Use archive instead.' },
        { status: 400 }
      )
    }

    // Delete the commission
    const { error } = await supabase
      .from('commissions')
      .delete()
      .eq('id', commissionId)

    if (error) {
      console.error('Error deleting commission:', error)
      return NextResponse.json(
        { error: 'Failed to delete commission' },
        { status: 500 }
      )
    }

    // Invalidate cache after successful deletion
    invalidateCache()

    return NextResponse.json({ 
      success: true
    })

  } catch (error) {
    console.error('Commission delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      )
    }

    const { commissionId } = await params
    const supabase = getSupabaseAdmin()

    // Get full commission details for single view
    const { data: commission, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .single()

    if (error || !commission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ commission })

  } catch (error) {
    console.error('Commission GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}