// src/app/api/gallery/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ContentSetWithRelations } from '@/types/database'
import { getCachedGallery, setCachedGallery, generateCacheKey } from '@/lib/cache'

interface QueryFilters {
  search?: string
  characters?: string[]
  series?: string[]
  tags?: string[]
  sort?: 'newest' | 'oldest' | 'most_viewed' | 'most_liked'
  page?: number
  limit?: number
}

// FIXED SORTING FUNCTION WITH CORRECTED FALLBACK LOGIC
function sortContentSets(sets: ContentSetWithRelations[], sortBy: 'newest' | 'oldest' | 'most_viewed' | 'most_liked' = 'newest') {
  return [...sets].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        // Use scheduled_time if available, otherwise published_at, otherwise created_at
        // This better represents the intended publication order
        const effectiveDateA = a.scheduled_time 
          ? new Date(a.scheduled_time)
          : a.published_at 
            ? new Date(a.published_at)
            : new Date(a.created_at)
        
        const effectiveDateB = b.scheduled_time
          ? new Date(b.scheduled_time)
          : b.published_at
            ? new Date(b.published_at)
            : new Date(b.created_at)
        
        const dateDiff = effectiveDateB.getTime() - effectiveDateA.getTime()
        
        // If dates are still identical, use ID as tiebreaker
        if (dateDiff === 0 && a.id && b.id) {
          return b.id.localeCompare(a.id)
        }
        
        return dateDiff
        
      case 'oldest':
        const oldEffectiveDateA = a.scheduled_time
          ? new Date(a.scheduled_time)
          : a.published_at
            ? new Date(a.published_at)
            : new Date(a.created_at)
        
        const oldEffectiveDateB = b.scheduled_time
          ? new Date(b.scheduled_time)
          : b.published_at
            ? new Date(b.published_at)
            : new Date(b.created_at)
        
        const oldDateDiff = oldEffectiveDateA.getTime() - oldEffectiveDateB.getTime()
        
        if (oldDateDiff === 0 && a.id && b.id) {
          return a.id.localeCompare(b.id)
        }
        
        return oldDateDiff
        
      case 'most_viewed':
        const viewDiff = (b.view_count || 0) - (a.view_count || 0)
        if (viewDiff === 0) {
          // Fall back to newest logic
          const dateA = a.scheduled_time
            ? new Date(a.scheduled_time)
            : a.published_at
              ? new Date(a.published_at)
              : new Date(a.created_at)
          const dateB = b.scheduled_time
            ? new Date(b.scheduled_time)
            : b.published_at
              ? new Date(b.published_at)
              : new Date(b.created_at)
          return dateB.getTime() - dateA.getTime()
        }
        return viewDiff
        
      case 'most_liked':
        const likeDiff = (b.like_count || 0) - (a.like_count || 0)
        if (likeDiff === 0) {
          // Fall back to newest logic
          const dateA = a.scheduled_time
            ? new Date(a.scheduled_time)
            : a.published_at
              ? new Date(a.published_at)
              : new Date(a.created_at)
          const dateB = b.scheduled_time
            ? new Date(b.scheduled_time)
            : b.published_at
              ? new Date(b.published_at)
              : new Date(b.created_at)
          return dateB.getTime() - dateA.getTime()
        }
        return likeDiff
        
      default:
        return 0
    }
  })
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get authenticated user
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = token.sub
    const isCreator = token.isCreator || false
    const supabase = getSupabaseAdmin()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const filters: QueryFilters = {
      search: searchParams.get('search') || undefined,
      characters: searchParams.getAll('character'),
      series: searchParams.getAll('series'),
      tags: searchParams.getAll('tag'),
      sort: (searchParams.get('sort') as QueryFilters['sort']) || 'newest',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '0'), // 0 means all
    }

    // OPTIMIZED: Generate cache key from filters (exclude userId for shared cache)
    const cacheKey = generateCacheKey({
      search: filters.search,
      characters: filters.characters,
      series: filters.series,
      tags: filters.tags,
      sort: filters.sort,
      page: filters.page,
      limit: filters.limit
    })

    // OPTIMIZED: Check Redis cache first
    const cachedData = await getCachedGallery(cacheKey)
    if (cachedData) {
      console.log(`[Gallery] Cache HIT for filters: ${cacheKey}`)

      // Still need to fetch user-specific data (not cached)
      const setIds = cachedData.sets.map((s: any) => s.id)
      const userData = await fetchUserSpecificData(supabase, userId, setIds)
      const setsWithUserData = mergeSetsWithUserData(cachedData.sets, userData)

      return NextResponse.json(
        {
          ...cachedData,
          sets: cachedData.limit ? setsWithUserData.slice(((cachedData.pagination?.page || 1) - 1) * cachedData.limit, (cachedData.pagination?.page || 1) * cachedData.limit) : setsWithUserData,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
            'X-Cache': 'HIT',
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      )
    }

    console.log(`[Gallery] Cache MISS for filters: ${cacheKey}`)
    const queryStartTime = Date.now()

    // Build the base query - OPTIMIZED: Only fetch what's needed for gallery view
    // For gallery listing, we only need the thumbnail image, not all images
    let query = supabase
      .from('content_sets')
      .select(`
        id,
        title,
        description,
        slug,
        published_at,
        scheduled_time,
        created_at,
        view_count,
        like_count,
        image_count,
        thumbnail_image_id,
        tags,
        thumbnail_image:images!thumbnail_image_id (
          id,
          filename,
          r2_key,
          width,
          height
        ),
        set_characters (
          character:characters (
            id,
            name,
            slug,
            series:series_id (
              id,
              name,
              slug
            )
          )
        )
      `)
      .order('scheduled_time', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200) // OPTIMIZED: Reasonable limit to prevent over-fetching

    // Apply filters
    // Show both published content AND scheduled content that's past its time
    const now = new Date().toISOString()
    query = query.or(`published_at.not.is.null,scheduled_time.lte.${now}`)

    // Search filter
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    // Execute query first to get all data
    const { data: sets, error } = await query
    console.log(`[Gallery] Query executed in ${Date.now() - queryStartTime}ms, returned ${sets?.length || 0} sets`)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch content sets', details: error.message },
        { status: 500 }
      )
    }

    // Transform and filter the data - OPTIMIZED: Simpler transformation
    let transformedSets: ContentSetWithRelations[] = (sets || []).map(set => {
      // We only have the thumbnail image now, not all images
      const thumbnail = set.thumbnail_image || null

      return {
        ...set,
        characters: set.set_characters?.map((sc: any) => sc.character).filter(Boolean) || [],
        images: thumbnail ? [thumbnail] : [], // Gallery only needs thumbnail, not all images
        thumbnail: thumbnail
      }
    })

    // Apply character and series filters (these need to be done in memory due to the complex joins)
    if (filters.characters && filters.characters.length > 0) {
      transformedSets = transformedSets.filter(set =>
        filters.characters!.some(charId =>
          set.characters?.some(char => char.id === charId)
        )
      )
    }

    if (filters.series && filters.series.length > 0) {
      transformedSets = transformedSets.filter(set =>
        filters.series!.some(seriesId =>
          set.characters?.some(char => char.series?.id === seriesId)
        )
      )
    }

    // OPTIMIZED: Fetch user-specific data in parallel
    const setIds = transformedSets.map(set => set.id)
    const userDataStartTime = Date.now()

    // Batch all user data queries in parallel for better performance
    const [
      { data: userViews },
      { data: userDownloads },
      { data: userLikes }
    ] = await Promise.all([
      supabase
        .from('user_set_views')
        .select('set_id, view_count, last_viewed_at')
        .eq('user_id', userId)
        .in('set_id', setIds),
      supabase
        .from('user_set_downloads')
        .select('set_id, download_count, downloaded_at')
        .eq('user_id', userId)
        .in('set_id', setIds),
      supabase
        .from('content_likes')
        .select('set_id')
        .eq('user_id', userId)
        .in('set_id', setIds)
    ])
    console.log(`[Gallery] User data fetched in ${Date.now() - userDataStartTime}ms`)

    // Create maps for quick lookup
    const viewMap = new Map(userViews?.map(v => [v.set_id, v]) || [])
    const downloadMap = new Map(userDownloads?.map(d => [d.set_id, d]) || [])
    const likeMap = new Map(userLikes?.map(l => [l.set_id, true]) || [])

    // Add user-specific data to each set
    const setsWithUserData = transformedSets.map(set => ({
      ...set,
      userHasViewed: viewMap.has(set.id),
      userHasDownloaded: downloadMap.has(set.id),
      userHasLiked: likeMap.has(set.id),
      userViewCount: viewMap.get(set.id)?.view_count || 0,
      userLastViewed: viewMap.get(set.id)?.last_viewed_at,
      userDownloadCount: downloadMap.get(set.id)?.download_count || 0,
    }))

    // Use the fixed sorting function for all sorting operations
    const sortedSets = sortContentSets(setsWithUserData, filters.sort || 'newest')

    // Get recent sets using the same fixed sorting
    const recentSets = sortContentSets(setsWithUserData, 'newest').slice(0, 10)

    // Apply pagination if requested
    let paginatedSets = sortedSets
    let totalPages = 1
    let hasMore = false

    if (filters.limit && filters.limit > 0) {
      const startIndex = ((filters.page || 1) - 1) * filters.limit
      paginatedSets = sortedSets.slice(startIndex, startIndex + filters.limit)
      totalPages = Math.ceil(sortedSets.length / filters.limit)
      hasMore = (filters.page || 1) < totalPages
    }

    // Get available filter options from all sets (not just paginated)
    const availableFilters = extractAvailableFilters(sortedSets)

    const responseData = {
      sets: paginatedSets,
      recentSets: recentSets, // Include properly sorted recent sets
      totalSets: sortedSets.length,
      pagination: filters.limit ? {
        page: filters.page || 1,
        limit: filters.limit,
        totalPages,
        hasMore
      } : null,
      filters: availableFilters
    }

    // OPTIMIZED: Cache the gallery data (without user-specific data)
    const cacheData = {
      sets: sortedSets.map(set => {
        // Remove user-specific fields before caching
        const { userHasViewed, userHasDownloaded, userHasLiked, userViewCount, userLastViewed, userDownloadCount, ...setWithoutUserData } = set
        return setWithoutUserData
      }),
      recentSets: recentSets.map(set => {
        const { userHasViewed, userHasDownloaded, userHasLiked, userViewCount, userLastViewed, userDownloadCount, ...setWithoutUserData } = set
        return setWithoutUserData
      }),
      totalSets: sortedSets.length,
      pagination: responseData.pagination,
      filters: availableFilters,
      limit: filters.limit
    }
    await setCachedGallery(cacheKey, cacheData)

    const responseSize = JSON.stringify(responseData).length
    const totalTime = Date.now() - startTime
    console.log(`[Gallery] Response size: ${(responseSize / 1024).toFixed(2)}KB, Total time: ${totalTime}ms`)

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
        'X-Cache': 'MISS',
        'X-Response-Time': `${totalTime}ms`,
        'X-Response-Size': `${(responseSize / 1024).toFixed(2)}KB`
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// OPTIMIZED: Helper function to fetch user-specific data
async function fetchUserSpecificData(supabase: any, userId: string, setIds: string[]) {
  if (!setIds.length) return { views: [], downloads: [], likes: [] }

  const [viewsData, downloadsData, likesData] = await Promise.all([
    supabase
      .from('user_set_views')
      .select('set_id, view_count, last_viewed_at')
      .eq('user_id', userId)
      .in('set_id', setIds),
    supabase
      .from('user_set_downloads')
      .select('set_id, download_count, downloaded_at')
      .eq('user_id', userId)
      .in('set_id', setIds),
    supabase
      .from('content_likes')
      .select('set_id')
      .eq('user_id', userId)
      .in('set_id', setIds),
  ])

  return {
    views: viewsData.data || [],
    downloads: downloadsData.data || [],
    likes: likesData.data || []
  }
}

// OPTIMIZED: Helper function to merge sets with user data
function mergeSetsWithUserData(sets: any[], userData: any) {
  const viewMap = new Map(userData.views.map((v: any) => [v.set_id, v]))
  const downloadMap = new Map(userData.downloads.map((d: any) => [d.set_id, d]))
  const likeMap = new Map(userData.likes.map((l: any) => [l.set_id, true]))

  return sets.map(set => ({
    ...set,
    userHasViewed: viewMap.has(set.id),
    userHasDownloaded: downloadMap.has(set.id),
    userHasLiked: likeMap.has(set.id),
    userViewCount: viewMap.get(set.id)?.view_count || 0,
    userLastViewed: viewMap.get(set.id)?.last_viewed_at,
    userDownloadCount: downloadMap.get(set.id)?.download_count || 0,
  }))
}

function extractAvailableFilters(sets: ContentSetWithRelations[]) {
  const characterMap = new Map<string, { id: string, name: string, series: string, count: number }>()
  const seriesMap = new Map<string, { id: string, name: string, count: number }>()
  const tagsSet = new Set<string>()

  sets.forEach(set => {
    // Extract characters and series
    set.characters?.forEach(char => {
      const key = char.id
      const existing = characterMap.get(key)
      characterMap.set(key, {
        id: char.id,
        name: char.name,
        series: char.series?.name || 'Unknown',
        count: (existing?.count || 0) + 1
      })
      
      if (char.series) {
        const seriesKey = char.series.id
        const existingSeries = seriesMap.get(seriesKey)
        seriesMap.set(seriesKey, {
          id: char.series.id,
          name: char.series.name,
          count: (existingSeries?.count || 0) + 1
        })
      }
    })
    
    // Extract tags
    set.tags?.forEach(tag => tagsSet.add(tag))
  })

  return {
    characters: Array.from(characterMap.values()).sort((a, b) => b.count - a.count),
    series: Array.from(seriesMap.values()).sort((a, b) => b.count - a.count),
    tags: Array.from(tagsSet).sort()
  }
}
