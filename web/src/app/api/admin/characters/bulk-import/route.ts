// src/app/api/admin/characters/bulk-import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.isCreator) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { series = [], characters = [] } = await request.json()

    const results = {
      series: { created: 0, errors: [] as string[] },
      characters: { created: 0, errors: [] as string[] },
    }

    // Process series first
    for (const seriesData of series) {
      const slug = generateSlug(seriesData.name)
      
      try {
        // Check if series already exists
        const { data: existing } = await supabase
          .from('series')
          .select('id')
          .eq('slug', slug)
          .single()

        if (!existing) {
          const { error } = await supabase
            .from('series')
            .insert({
              name: seriesData.name,
              slug,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (error) {
            results.series.errors.push(`Failed to create series "${seriesData.name}": ${error.message}`)
          } else {
            results.series.created++
          }
        }
      } catch (error) {
        results.series.errors.push(`Error processing series "${seriesData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Process characters
    for (const charData of characters) {
      const slug = generateSlug(charData.name)
      
      try {
        // Check if character already exists
        const { data: existing } = await supabase
          .from('characters')
          .select('id')
          .eq('slug', slug)
          .single()

        if (!existing) {
          let series_id = null

          // If character has a series, find or create it
          if (charData.series) {
            const seriesSlug = generateSlug(charData.series)
            
            // Check if series exists
            const { data: seriesData } = await supabase
              .from('series')
              .select('id')
              .eq('slug', seriesSlug)
              .single()

            if (seriesData) {
              series_id = seriesData.id
            } else {
              // Create the series if it doesn't exist
              const { data: newSeries, error: seriesError } = await supabase
                .from('series')
                .insert({
                  name: charData.series,
                  slug: seriesSlug,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select('id')
                .single()

              if (seriesError) {
                results.characters.errors.push(`Failed to create series for character "${charData.name}": ${seriesError.message}`)
                continue
              }
              
              series_id = newSeries?.id
              results.series.created++
            }
          }

          // Create the character
          const { error } = await supabase
            .from('characters')
            .insert({
              name: charData.name,
              slug,
              series_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (error) {
            results.characters.errors.push(`Failed to create character "${charData.name}": ${error.message}`)
          } else {
            results.characters.created++
          }
        }
      } catch (error) {
        results.characters.errors.push(`Error processing character "${charData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    )
  }
}