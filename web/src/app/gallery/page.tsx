// src/app/gallery/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { ContentThumbnail } from "@/components/content-thumbnail"
import { MainLayout } from "@/components/main-layout"
import { AuthWrapper } from "@/components/auth-wrapper"
import { useMobileContext } from '@/providers/mobile-provider'

import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import type { ContentSetWithRelations } from "@/types/database"

type SortOption = 'newest' | 'oldest' | 'most_viewed' | 'most_liked'
type ViewMode = 'grid' | 'list'
type ViewStatus = 'all' | 'unseen' | 'seen' | 'favorites'

interface FilterState {
  characters: string[]
  series: string[]
  tags: string[]
  searchQuery: string
  sortBy: SortOption
  viewMode: ViewMode
  viewStatus: ViewStatus
}

interface FilterOption {
  id: string
  name: string
  count: number
  series?: string
}

interface UserSetData {
  [setId: string]: {
    viewed?: boolean
    downloaded?: boolean
    liked?: boolean
    lastViewed?: string
    viewCount?: number
  }
}

function GalleryContent() {
  const { data: session } = useSession()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  
  // Content state
  const [allSets, setAllSets] = useState<ContentSetWithRelations[]>([])
  const [recentSets, setRecentSets] = useState<ContentSetWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [userSetData, setUserSetData] = useState<UserSetData>({})
  const [markingAllSeen, setMarkingAllSeen] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    characters: [],
    series: [],
    tags: [],
    searchQuery: '',
    sortBy: 'newest',
    viewMode: 'grid',
    viewStatus: 'all'
  })
  
  // Filter options
  const [availableCharacters, setAvailableCharacters] = useState<FilterOption[]>([])
  const [availableSeries, setAvailableSeries] = useState<FilterOption[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  
  // UI state
  const [showFilters, setShowFilters] = useState(true)
  const [filterSearchQuery, setFilterSearchQuery] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const itemsPerPage = isSmallScreen ? 12 : 24

  // FIXED SORT FUNCTION WITH CORRECTED FALLBACK LOGIC
  const sortContentSets = useCallback((sets: ContentSetWithRelations[], sortBy: SortOption = 'newest') => {
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
  }, [])

  // Calculate counts
  const unseenCount = useMemo(() => {
    return allSets.filter(set => !userSetData[set.id]?.viewed).length
  }, [allSets, userSetData])

  const seenCount = useMemo(() => {
    return allSets.filter(set => userSetData[set.id]?.viewed).length
  }, [allSets, userSetData])

  const favoritesCount = useMemo(() => {
    return allSets.filter(set => userSetData[set.id]?.liked).length
  }, [allSets, userSetData])

  // Listen for favorite toggle events
  useEffect(() => {
    const handleFavoriteToggle = (event: CustomEvent) => {
      const { setId, isFavorited } = event.detail
      setUserSetData(prev => ({
        ...prev,
        [setId]: {
          ...prev[setId],
          liked: isFavorited
        }
      }))
    }

    window.addEventListener('favorite-toggled', handleFavoriteToggle as EventListener)
    return () => {
      window.removeEventListener('favorite-toggled', handleFavoriteToggle as EventListener)
    }
  }, [])

  // Fetch all content and filter options
  useEffect(() => {
    if (session?.user?.id) {
      fetchContent()
    }
  }, [session?.user?.id])

  async function fetchContent() {
    try {
      setLoading(true)
      
      const response = await fetch('/api/gallery')
      
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }
      
      const data = await response.json()
      
      if (data.sets) {
        const sets = data.sets as ContentSetWithRelations[]
        
        // Debug: Check if all required fields are present
        console.log('Sample set data:', sets[0] ? {
          title: sets[0].title,
          published_at: sets[0].published_at,
          scheduled_time: sets[0].scheduled_time,
          created_at: sets[0].created_at
        } : 'No sets')
        
        // Sort all sets with our fixed logic before storing
        const sortedAllSets = sortContentSets(sets, 'newest')
        setAllSets(sortedAllSets)
        
        // ALWAYS apply our sorting logic, even if API provides recentSets
        if (data.recentSets) {
          // Sort the API-provided recent sets with our fixed logic
          const sortedRecentSets = sortContentSets(data.recentSets as ContentSetWithRelations[], 'newest')
          console.log('Recent sets order after sorting:', sortedRecentSets.slice(0, 5).map(s => s.title))
          setRecentSets(sortedRecentSets)
        } else {
          // Fallback: use first 10 from already sorted allSets
          console.log('Using fallback recent sets from sorted all sets')
          setRecentSets(sortedAllSets.slice(0, 10))
        }
        
        if (data.filters) {
          setAvailableCharacters(data.filters.characters || [])
          setAvailableSeries(data.filters.series || [])
          setAvailableTags(data.filters.tags || [])
        } else {
          extractFilterOptions(sets)
        }
        
        const userData: UserSetData = {}
        sets.forEach(set => {
          const apiSet = set as any
          if (apiSet.userHasViewed !== undefined || apiSet.userHasDownloaded !== undefined || apiSet.userHasLiked !== undefined) {
            userData[set.id] = {
              viewed: apiSet.userHasViewed || false,
              downloaded: apiSet.userHasDownloaded || false,
              liked: apiSet.userHasLiked || false,
              viewCount: apiSet.userViewCount || 0,
              lastViewed: apiSet.userLastViewed
            }
          }
        })
        setUserSetData(userData)
        
        window.dispatchEvent(new Event('refresh-badges'))
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAllAsSeen() {
    if (markingAllSeen || unseenCount === 0) return

    try {
      setMarkingAllSeen(true)
      
      const response = await fetch('/api/user/views/mark-all-seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const updatedUserData = { ...userSetData }
        allSets.forEach(set => {
          updatedUserData[set.id] = {
            ...updatedUserData[set.id],
            viewed: true
          }
        })
        setUserSetData(updatedUserData)
        
        window.dispatchEvent(new Event('refresh-badges'))
      } else {
        console.error('Failed to mark all as seen')
      }
    } catch (error) {
      console.error('Error marking all as seen:', error)
    } finally {
      setMarkingAllSeen(false)
    }
  }

  function extractFilterOptions(sets: ContentSetWithRelations[]) {
    const characterMap = new Map<string, { name: string, series: string, count: number }>()
    const seriesMap = new Map<string, { name: string, count: number }>()
    const tagsSet = new Set<string>()

    sets.forEach(set => {
      set.characters?.forEach(char => {
        const key = char.id
        const existing = characterMap.get(key)
        characterMap.set(key, {
          name: char.name,
          series: char.series?.name || 'Unknown',
          count: (existing?.count || 0) + 1
        })
        
        if (char.series) {
          const seriesKey = char.series.id
          const existingSeries = seriesMap.get(seriesKey)
          seriesMap.set(seriesKey, {
            name: char.series.name,
            count: (existingSeries?.count || 0) + 1
          })
        }
      })
      
      set.tags?.forEach(tag => tagsSet.add(tag))
    })

    setAvailableCharacters(
      Array.from(characterMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
    )
    
    setAvailableSeries(
      Array.from(seriesMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
    )
    
    setAvailableTags(Array.from(tagsSet).sort())
  }

  // Filter and sort content using the fixed sort function
  const filteredAndSortedSets = useMemo(() => {
    let filtered = [...allSets]

    if (filters.viewStatus === 'unseen') {
      filtered = filtered.filter(set => !userSetData[set.id]?.viewed)
    } else if (filters.viewStatus === 'seen') {
      filtered = filtered.filter(set => userSetData[set.id]?.viewed)
    } else if (filters.viewStatus === 'favorites') {
      filtered = filtered.filter(set => userSetData[set.id]?.liked)
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(set =>
        set.title.toLowerCase().includes(query) ||
        set.description?.toLowerCase().includes(query) ||
        set.characters?.some(char => char.name.toLowerCase().includes(query))
      )
    }

    if (filters.characters.length > 0) {
      filtered = filtered.filter(set =>
        filters.characters.some(charId =>
          set.characters?.some(char => char.id === charId)
        )
      )
    }

    if (filters.series.length > 0) {
      filtered = filtered.filter(set =>
        filters.series.some(seriesId =>
          set.characters?.some(char => char.series?.id === seriesId)
        )
      )
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(set =>
        filters.tags.every(tag => set.tags?.includes(tag))
      )
    }

    // Use the fixed sort function
    return sortContentSets(filtered, filters.sortBy)
  }, [allSets, filters, userSetData, sortContentSets])

  // Paginated results
  const paginatedSets = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage
    return filteredAndSortedSets.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedSets, page, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedSets.length / itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])

  // Filter helpers
  const toggleCharacter = (characterId: string) => {
    setFilters(prev => ({
      ...prev,
      characters: prev.characters.includes(characterId)
        ? prev.characters.filter(id => id !== characterId)
        : [...prev.characters, characterId]
    }))
  }

  const toggleSeries = (seriesId: string) => {
    setFilters(prev => ({
      ...prev,
      series: prev.series.includes(seriesId)
        ? prev.series.filter(id => id !== seriesId)
        : [...prev.series, seriesId]
    }))
  }

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      characters: [],
      series: [],
      tags: [],
      searchQuery: '',
      sortBy: 'newest',
      viewMode: 'grid',
      viewStatus: 'all'
    })
    setFilterSearchQuery('')
  }

  const hasActiveFilters = filters.characters.length > 0 || filters.series.length > 0 || filters.tags.length > 0 || filters.searchQuery || filters.viewStatus !== 'all'

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-sky-600/20 rounded-full animate-spin border-t-sky-500"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin border-t-purple-600 animation-delay-150"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-x-hidden max-w-full">
        {/* Background Effects */}
        <div className="fixed inset-0 -z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Recent Posts Section */}
        <section className="border-b border-white/5 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
          <div className="py-6 sm:py-8">
            <div className={`${isSmallScreen ? 'px-4' : 'max-w-[1600px] mx-auto px-6'} mb-4 sm:mb-6`}>
              <div className="flex items-center justify-between">
                <h2 className={`${isSmallScreen ? 'text-xl' : 'text-2xl'} font-bold text-white flex items-center gap-2 sm:gap-3`}>
                  <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                  Recent Posts
                </h2>
                <span className="text-xs sm:text-sm text-gray-400">Latest uploads</span>
              </div>
            </div>
            
            {/* Horizontal scroll container */}
            <div className={`relative ${isSmallScreen ? 'w-screen' : 'max-w-[1600px] mx-auto px-6'}`}>
              <div className={`overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2 sm:pb-4`}>
                <div className={`flex gap-2 sm:gap-4 ${isSmallScreen ? 'px-4' : ''}`} style={{ width: 'max-content' }}>
                  {recentSets.map((set, index) => (
                    <motion.div
                      key={set.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex-shrink-0`}
                      style={{
                        width: isMobile 
                          ? `calc((100vw - 32px - 16px) / 3)`
                          : isTablet 
                            ? '144px' 
                            : '192px'
                      }}
                    >
                      <ContentThumbnail
                        contentSet={set}
                        priority={index < 5}
                        userHasViewed={userSetData[set.id]?.viewed}
                        userHasDownloaded={userSetData[set.id]?.downloaded}
                        userHasFavorited={userSetData[set.id]?.liked}
                      />
                    </motion.div>
                  ))}
                  {isSmallScreen && <div className="w-4 flex-shrink-0" />}
                </div>
              </div>
              
              {/* Edge indicators for mobile */}
              {isSmallScreen && recentSets.length > 3 && (
                <>
                  <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-zinc-900 to-transparent pointer-events-none z-10" />
                  <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-zinc-900 to-transparent pointer-events-none z-10" />
                </>
              )}
              
              {/* Gradient fade on edges - Desktop */}
              {!isSmallScreen && (
                <>
                  <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-zinc-900/30 to-transparent pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-zinc-900/30 to-transparent pointer-events-none"></div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Main Gallery Section */}
        <section className={`${isSmallScreen ? 'px-4' : 'max-w-[1600px] mx-auto px-6'} py-6 sm:py-8`}>
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Header with search and view controls */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <h1 className={`${isSmallScreen ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>All Posts</h1>
                    <span className="text-xs sm:text-sm text-gray-400 bg-zinc-800/50 px-2 sm:px-3 py-1 rounded-full">
                      {filteredAndSortedSets.length}
                    </span>
                  </div>
                  
                  {/* Mobile Search Toggle */}
                  {isSmallScreen && (
                    <button
                      onClick={() => setShowMobileSearch(!showMobileSearch)}
                      className="p-2 bg-slate-900/50 border border-white/10 rounded-lg text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Mobile Search Bar */}
                {isSmallScreen && showMobileSearch && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      type="text"
                      placeholder="Search posts..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
                    />
                  </motion.div>
                )}

                {/* Mark All Seen - Mobile */}
                {isSmallScreen && unseenCount > 0 && filters.viewStatus !== 'seen' && filters.viewStatus !== 'favorites' && (
                  <button
                    onClick={markAllAsSeen}
                    disabled={markingAllSeen}
                    className="w-full text-sm text-sky-500 bg-zinc-800/50 hover:bg-zinc-800/70 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    {markingAllSeen ? 'Marking...' : `Mark all ${filters.viewStatus === 'unseen' ? filteredAndSortedSets.length : unseenCount} as seen`}
                  </button>
                )}

                {/* Controls Row */}
                <div className={`flex items-center gap-2 sm:gap-3 ${isSmallScreen ? 'w-full' : ''}`}>
                  {isSmallScreen ? (
                    <>
                      {/* Mobile controls */}
                      <button
                        onClick={() => setMobileFiltersOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>Filters</span>
                        {hasActiveFilters && (
                          <span className="px-1.5 py-0.5 bg-sky-600 text-white text-xs rounded-full">
                            {filters.characters.length + filters.series.length + filters.tags.length + (filters.viewStatus !== 'all' ? 1 : 0)}
                          </span>
                        )}
                      </button>
                      
                      {/* View Mode Toggle - Mobile */}
                      <div className="flex items-center bg-slate-900/50 border border-white/10 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
                          className={`p-2 transition-all ${filters.viewMode === 'grid' ? 'bg-sky-600 text-white' : 'text-gray-400'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
                          className={`p-2 transition-all ${filters.viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-gray-400'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SortOption }))}
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="most_viewed">Most Viewed</option>
                        <option value="most_liked">Most Liked</option>
                      </select>
                    </>
                  ) : (
                    <>
                      {/* Desktop controls */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search posts..."
                          value={filters.searchQuery}
                          onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                          className="w-64 px-4 py-2 pl-10 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 transition-all"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SortOption }))}
                        className="px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sky-500/50 transition-all"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="most_viewed">Most Viewed</option>
                        <option value="most_liked">Most Liked</option>
                      </select>
                      
                      <div className="flex items-center bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
                          className={`p-2 transition-all ${filters.viewMode === 'grid' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
                          className={`p-2 transition-all ${filters.viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden p-2 bg-slate-900/50 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </button>
                      
                      {unseenCount > 0 && filters.viewStatus !== 'seen' && filters.viewStatus !== 'favorites' && (
                        <button
                          onClick={markAllAsSeen}
                          disabled={markingAllSeen}
                          className="text-sm text-sky-500 hover:text-sky-400 bg-zinc-800/50 hover:bg-zinc-800/70 px-4 py-1.5 rounded-full transition-all disabled:opacity-50"
                        >
                          {markingAllSeen ? 'Marking...' : `Mark all ${filters.viewStatus === 'unseen' ? filteredAndSortedSets.length : unseenCount} as seen`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className={`mb-6 p-3 sm:p-4 bg-slate-900/30 backdrop-blur-sm rounded-xl border border-white/5`}>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-gray-400">Active filters:</span>
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-sky-500 hover:text-sky-400 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {filters.viewStatus !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-green-600/20 text-green-400 rounded-lg text-xs sm:text-sm">
                        {filters.viewStatus === 'unseen' ? 'Unseen' : filters.viewStatus === 'seen' ? 'Seen' : 'Favorites'}
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, viewStatus: 'all' }))}
                          className="hover:text-green-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {filters.characters.map(charId => {
                      const char = availableCharacters.find(c => c.id === charId)
                      return char ? (
                        <span
                          key={charId}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-sky-600/20 text-sky-400 rounded-lg text-xs sm:text-sm"
                        >
                          {char.name}
                          <button
                            onClick={() => toggleCharacter(charId)}
                            className="hover:text-red-300"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ) : null
                    })}
                    {filters.series.map(seriesId => {
                      const series = availableSeries.find(s => s.id === seriesId)
                      return series ? (
                        <span
                          key={seriesId}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-600/20 text-cyan-400 rounded-lg text-xs sm:text-sm"
                        >
                          {series.name}
                          <button
                            onClick={() => toggleSeries(seriesId)}
                            className="hover:text-purple-300"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ) : null
                    })}
                    {filters.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs sm:text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => toggleTag(tag)}
                          className="hover:text-blue-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Grid/List */}
              {filteredAndSortedSets.length === 0 ? (
                <div className="text-center py-16 sm:py-20">
                  <div className="inline-block p-6 sm:p-8 bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-white/5">
                    <svg className="w-12 sm:w-16 h-12 sm:h-16 text-gray-600 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No posts found</h3>
                    <p className="text-sm sm:text-base text-gray-400">Try adjusting your filters or search query</p>
                  </div>
                </div>
              ) : filters.viewMode === 'grid' ? (
                <div className={`grid ${
                  isMobile ? 'grid-cols-2 gap-2' : 
                  isTablet ? 'grid-cols-3 gap-3' : 
                  'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                } max-w-full`}>
                  <AnimatePresence mode="popLayout">
                    {paginatedSets.map((set, index) => (
                      <motion.div
                        key={set.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="min-w-0"
                      >
                        <ContentThumbnail
                          contentSet={set}
                          priority={index < 10}
                          userHasViewed={userSetData[set.id]?.viewed}
                          userHasDownloaded={userSetData[set.id]?.downloaded}
                          userHasFavorited={userSetData[set.id]?.liked}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-w-full overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {paginatedSets.map((set, index) => (
                      <motion.div
                        key={set.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="bg-slate-900/30 backdrop-blur-sm border border-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-white/10 transition-all max-w-full overflow-hidden"
                      >
                        <div className="flex gap-3 sm:gap-4 max-w-full">
                          <div className={`${isMobile ? 'w-16 h-20' : 'w-24 h-32'} flex-shrink-0`}>
                            <ContentThumbnail
                              contentSet={set}
                              priority={index < 5}
                              userHasViewed={userSetData[set.id]?.viewed}
                              userHasDownloaded={userSetData[set.id]?.downloaded}
                              userHasFavorited={userSetData[set.id]?.liked}
                              hideImageCount={true}
                            />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className={`${isSmallScreen ? 'text-sm' : 'text-lg'} font-semibold text-white mb-1 truncate`}>
                              {set.title}
                            </h3>
                            {set.characters && set.characters.length > 0 && (
                              <p className="text-xs sm:text-sm text-gray-400 mb-2 truncate">
                                {set.characters.map(c => c.name).join(', ')}
                              </p>
                            )}
                            <div className={`flex items-center gap-2 sm:gap-4 text-xs text-gray-500 ${isMobile ? 'flex-wrap' : ''}`}>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <svg className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate">{set.image_count}</span>
                              </span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <svg className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="truncate">{set.view_count?.toLocaleString() || 0}</span>
                              </span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <svg className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span className="truncate">{set.like_count?.toLocaleString() || 0}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 sm:mt-8 flex justify-center">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-1.5 sm:p-2 bg-slate-900/50 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/20 transition-all"
                    >
                      <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {isMobile ? (
                        <span className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-400">
                          {page} / {totalPages}
                        </span>
                      ) : (
                        [...Array(Math.min(7, totalPages))].map((_, i) => {
                          let pageNum
                          if (totalPages <= 7) {
                            pageNum = i + 1
                          } else if (page <= 4) {
                            pageNum = i + 1
                          } else if (page >= totalPages - 3) {
                            pageNum = totalPages - 6 + i
                          } else {
                            pageNum = page - 3 + i
                          }
                          
                          return (
                            <button
                              key={i}
                              onClick={() => setPage(pageNum)}
                              className={`w-8 sm:w-10 h-8 sm:h-10 rounded-lg font-medium transition-all text-sm sm:text-base ${
                                pageNum === page
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-900/50 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })
                      )}
                    </div>
                    
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 sm:p-2 bg-slate-900/50 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/20 transition-all"
                    >
                      <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Sidebar - Desktop Only */}
            {!isSmallScreen && (
              <div className={`${showFilters ? 'block' : 'hidden lg:block'} w-full lg:w-80 flex-shrink-0`}>
                <div className="sticky top-20 bg-slate-900/30 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Filters</h3>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-sky-500 hover:text-sky-400 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* View Status Filter */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">View Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, viewStatus: 'all' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.viewStatus === 'all'
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        All ({allSets.length})
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, viewStatus: 'unseen' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.viewStatus === 'unseen'
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        Unseen ({unseenCount})
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, viewStatus: 'seen' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.viewStatus === 'seen'
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        Seen ({seenCount})
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, viewStatus: 'favorites' }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.viewStatus === 'favorites'
                            ? 'bg-sky-600 text-white'
                            : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          {favoritesCount}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Search */}
                  <div className="relative mb-6">
                    <input
                      type="text"
                      placeholder="Search filters..."
                      value={filterSearchQuery}
                      onChange={(e) => setFilterSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 bg-zinc-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50 transition-all text-sm"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Series Filter */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Series</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {availableSeries
                        .filter(series => !filterSearchQuery || series.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                        .map(series => (
                          <label
                            key={series.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={filters.series.includes(series.id)}
                              onChange={() => toggleSeries(series.id)}
                              className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="flex-1 text-sm text-gray-300">{series.name}</span>
                            <span className="text-xs text-gray-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">{series.count}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Characters Filter */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Characters</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {availableCharacters
                        .filter(char => !filterSearchQuery || char.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                        .map(char => (
                          <label
                            key={char.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={filters.characters.includes(char.id)}
                              onChange={() => toggleCharacter(char.id)}
                              className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-sky-600 focus:ring-red-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm text-gray-300 block">{char.name}</span>
                              <span className="text-xs text-gray-500">{char.series}</span>
                            </div>
                            <span className="text-xs text-gray-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">{char.count}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Tags Filter */}
                  {availableTags.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter(tag => !filterSearchQuery || tag.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                filters.tags.includes(tag)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-800 hover:text-white'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Filter Summary */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500">
                      Showing {filteredAndSortedSets.length} of {allSets.length} posts
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {isSmallScreen && mobileFiltersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed right-0 top-0 h-full w-[85vw] max-w-sm bg-slate-900 border-l border-white/10 z-50 overflow-y-auto"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Filters</h3>
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Filter Search */}
                  <div className="relative mb-6">
                    <input
                      type="text"
                      value={filterSearchQuery}
                      onChange={(e) => setFilterSearchQuery(e.target.value)}
                      placeholder="Search filters..."
                      className="w-full px-4 py-3 pl-10 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sky-600 transition-colors"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* View Status */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">View Status</h4>
                    <div className="space-y-2">
                      {(['all', 'unseen', 'seen', 'favorites'] as ViewStatus[]).map(status => (
                        <label key={status} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700">
                          <input
                            type="radio"
                            name="viewStatus"
                            value={status}
                            checked={filters.viewStatus === status}
                            onChange={(e) => setFilters(prev => ({ ...prev, viewStatus: e.target.value as ViewStatus }))}
                            className="w-4 h-4 bg-zinc-800 border-zinc-600 text-sky-600 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-300 capitalize flex-1">
                            {status === 'favorites' ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                Favorites
                              </span>
                            ) : status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {status === 'all' && allSets.length}
                            {status === 'unseen' && unseenCount}
                            {status === 'seen' && seenCount}
                            {status === 'favorites' && favoritesCount}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Series */}
                  {availableSeries.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Series</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableSeries
                          .filter(series => !filterSearchQuery || series.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map(series => (
                            <label
                              key={series.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700"
                            >
                              <input
                                type="checkbox"
                                checked={filters.series.includes(series.id)}
                                onChange={() => toggleSeries(series.id)}
                                className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span className="flex-1 text-sm text-gray-300">{series.name}</span>
                              <span className="text-xs text-gray-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">{series.count}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Characters */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Characters</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableCharacters
                        .filter(char => !filterSearchQuery || char.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                        .map(char => (
                          <label
                            key={char.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700"
                          >
                            <input
                              type="checkbox"
                              checked={filters.characters.includes(char.id)}
                              onChange={() => toggleCharacter(char.id)}
                              className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-sky-600 focus:ring-red-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm text-gray-300 block">{char.name}</span>
                              <span className="text-xs text-gray-500">{char.series}</span>
                            </div>
                            <span className="text-xs text-gray-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">{char.count}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Tags */}
                  {availableTags.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTags
                          .filter(tag => !filterSearchQuery || tag.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                filters.tags.includes(tag)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-zinc-800/50 text-gray-400 border border-zinc-700'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 sticky bottom-0 bg-slate-900 py-4 -mx-4 px-4 border-t border-zinc-800">
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="flex-1 px-4 py-3 bg-sky-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Apply Filters
                    </button>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-gray-300 rounded-lg font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}

export default function GalleryPage() {
  return (
    <AuthWrapper>
      <GalleryContent />
    </AuthWrapper>
  )
}