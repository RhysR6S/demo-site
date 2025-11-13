// src/components/admin/content-manager.tsx
"use client"

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ContentSetWithRelations } from '@/types/database'

// Types
interface FilterOptions {
  status: 'all' | 'published' | 'scheduled' | 'draft'
  characters: string[]
  tags: string[]
  sortBy: 'created_at' | 'published_at' | 'scheduled_time' | 'title' | 'view_count'
  sortOrder: 'asc' | 'desc'
}

type ViewMode = 'grid' | 'list' | 'kanban'

interface BulkAction {
  id: string
  label: string
  icon: React.ReactNode
  variant: 'primary' | 'danger' | 'warning'
  action: (selectedIds: string[]) => Promise<void>
}

export interface ContentManagerRef {
  loadContent: (forceRefresh?: boolean) => Promise<void>
  refreshContent: () => Promise<void>
}

interface ContentManagerProps {
  onEdit: (set: ContentSetWithRelations) => void
}

export const ContentManager = forwardRef<ContentManagerRef, ContentManagerProps>(({ onEdit }, ref) => {
  // Core state
  const [contentSets, setContentSets] = useState<ContentSetWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    characters: [],
    tags: [],
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  
  // Available filter options (extracted from loaded content)
  const availableFilters = useMemo(() => {
    const characters = new Set<string>()
    const tags = new Set<string>()
    
    contentSets.forEach(set => {
      set.characters?.forEach(char => characters.add(char.name))
      set.tags?.forEach(tag => tags.add(tag))
    })
    
    return {
      characters: Array.from(characters).sort(),
      tags: Array.from(tags).sort()
    }
  }, [contentSets])

  // Load content with optimized caching
  const loadContent = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const url = new URL('/api/admin/content', window.location.origin)
      url.searchParams.set('page', currentPage.toString())
      url.searchParams.set('limit', pageSize.toString())
      url.searchParams.set('sortBy', filters.sortBy)
      url.searchParams.set('sortOrder', filters.sortOrder)
      
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true')
      }
      
      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }
      
      const data = await response.json()
      setContentSets(data.sets || [])
      setTotalCount(data.total || 0)
      setTotalPages(data.totalPages || 1)
      
      console.log('[ContentManager] Loaded:', {
        count: data.sets?.length || 0,
        page: currentPage,
        total: data.total
      })
    } catch (err) {
      console.error('[ContentManager] Error loading content:', err)
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, filters.sortBy, filters.sortOrder])

  // Refresh helper
  const refreshContent = useCallback(() => loadContent(true), [loadContent])

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    loadContent,
    refreshContent
  }), [loadContent, refreshContent])

  // Initial load
  useEffect(() => {
    loadContent()
  }, [currentPage, filters.sortBy, filters.sortOrder])

  // Filtered and sorted content
  const filteredContent = useMemo(() => {
    let filtered = [...contentSets]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(set => 
        set.title.toLowerCase().includes(term) ||
        set.description?.toLowerCase().includes(term) ||
        set.tags?.some(tag => tag.toLowerCase().includes(term)) ||
        set.characters?.some(char => char.name.toLowerCase().includes(term))
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(set => {
        const status = getContentStatus(set)
        return status === filters.status
      })
    }

    // Character filter
    if (filters.characters.length > 0) {
      filtered = filtered.filter(set =>
        set.characters?.some(char => filters.characters.includes(char.name))
      )
    }

    // Tag filter  
    if (filters.tags.length > 0) {
      filtered = filtered.filter(set =>
        filters.tags.every(tag => set.tags?.includes(tag))
      )
    }

    return filtered
  }, [contentSets, searchTerm, filters])

  // Get content status
  const getContentStatus = (set: ContentSetWithRelations): 'published' | 'scheduled' | 'draft' => {
    if (set.published_at) return 'published'
    if (set.scheduled_time) return 'scheduled'
    return 'draft'
  }

  // Get status badge styling
  const getStatusBadge = (set: ContentSetWithRelations) => {
    const status = getContentStatus(set)
    const configs = {
      published: {
        label: 'Published',
        className: 'bg-green-600/20 text-green-400 border-green-600/20',
        dotColor: 'bg-green-500'
      },
      scheduled: {
        label: 'Scheduled',
        className: 'bg-blue-600/20 text-blue-400 border-blue-600/20',
        dotColor: 'bg-blue-500'
      },
      draft: {
        label: 'Draft',
        className: 'bg-gray-600/20 text-gray-400 border-gray-600/20',
        dotColor: 'bg-gray-500'
      }
    }
    return configs[status]
  }

  // Delete with optimistic update
  const handleDelete = useCallback(async (setId: string) => {
    const set = contentSets.find(s => s.id === setId)
    if (!set) return
    
    if (!confirm(`Delete "${set.title}"? This action cannot be undone.`)) {
      return
    }

    // Add to deleting set for UI feedback
    setDeletingIds(prev => new Set(prev).add(setId))
    
    // Optimistic update
    const previousSets = [...contentSets]
    setContentSets(prev => prev.filter(s => s.id !== setId))
    setTotalCount(prev => Math.max(0, prev - 1))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(setId)
      return next
    })

    try {
      const response = await fetch(`/api/admin/content?id=${setId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // Revert on failure
        setContentSets(previousSets)
        setTotalCount(prev => prev + 1)
        throw new Error('Failed to delete content set')
      }

      console.log('[ContentManager] Deleted:', setId)
    } catch (err) {
      console.error('[ContentManager] Delete error:', err)
      alert('Failed to delete. Please try again.')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(setId)
        return next
      })
    }
  }, [contentSets])

  // Bulk actions
  const bulkActions: BulkAction[] = useMemo(() => [
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger',
      action: async (ids: string[]) => {
        if (!confirm(`Delete ${ids.length} items? This cannot be undone.`)) return
        
        for (const id of ids) {
          await handleDelete(id)
        }
        setSelectedIds(new Set())
        setBulkMode(false)
      }
    }
  ], [handleDelete])

  // Toggle selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all toggle
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredContent.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContent.map(s => s.id)))
    }
  }, [selectedIds.size, filteredContent])

  // Format date helper
  const formatDate = (date: string | null) => {
    if (!date) return 'Not set'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Kanban columns for kanban view
  const kanbanColumns = [
    { id: 'draft', title: 'Drafts', status: 'draft' as const },
    { id: 'scheduled', title: 'Scheduled', status: 'scheduled' as const },
    { id: 'published', title: 'Published', status: 'published' as const }
  ]

  // Loading state
  if (loading && contentSets.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-white/5"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-zinc-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-600/20'
                  : 'bg-zinc-800/50 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(filters.characters.length > 0 || filters.tags.length > 0) && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full">
                  {filters.characters.length + filters.tags.length}
                </span>
              )}
            </button>

            {/* View modes */}
            <div className="flex bg-zinc-800/50 rounded-lg border border-white/10 p-1">
              {(['grid', 'list', 'kanban'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded text-sm capitalize transition-all ${
                    viewMode === mode
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Bulk mode */}
            <button
              onClick={() => {
                setBulkMode(!bulkMode)
                setSelectedIds(new Set())
              }}
              className={`px-4 py-2 rounded-lg transition-all ${
                bulkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800/50 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>

            {/* Refresh */}
            <button
              onClick={() => loadContent(true)}
              className="px-4 py-2 bg-zinc-800/50 text-purple-400 hover:text-purple-300 border border-white/10 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filters expanded */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/5"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>

                {/* Sort */}
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="created_at">Created</option>
                  <option value="published_at">Published</option>
                  <option value="scheduled_time">Scheduled</option>
                  <option value="title">Title</option>
                  <option value="view_count">Views</option>
                </select>

                {/* Order */}
                <select
                  value={filters.sortOrder}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>

                {/* Clear */}
                <button
                  onClick={() => {
                    setFilters({
                      status: 'all',
                      characters: [],
                      tags: [],
                      sortBy: 'created_at',
                      sortOrder: 'desc'
                    })
                    setSearchTerm('')
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Stats */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <div className="flex gap-4">
            <span>Total: {totalCount}</span>
            <span>Showing: {filteredContent.length}</span>
            {currentPage > 1 && <span>Page {currentPage} of {totalPages}</span>}
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-900/50 rounded-lg p-4"
        >
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => loadContent(true)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Bulk Actions */}
      <AnimatePresence>
        {bulkMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-purple-600/10 backdrop-blur-sm rounded-xl p-4 border border-purple-600/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {selectedIds.size} selected
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                {selectedIds.size === filteredContent.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex gap-2">
              {bulkActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => action.action(Array.from(selectedIds))}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                    action.variant === 'danger'
                      ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                      : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Display */}
      <AnimatePresence mode="wait">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredContent.map((set, index) => {
              const isDeleting = deletingIds.has(set.id)
              const isSelected = selectedIds.has(set.id)
              const status = getStatusBadge(set)
              
              return (
                <motion.div
                  key={set.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  className={`relative bg-zinc-900/50 backdrop-blur-sm rounded-xl border overflow-hidden group transition-all duration-300 ${
                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                  } ${
                    isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/5 hover:border-purple-500/50'
                  }`}
                >
                  {/* Selection checkbox */}
                  {bulkMode && (
                    <div className="absolute top-4 left-4 z-20">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(set.id)}
                        className="w-5 h-5 bg-zinc-800 border-zinc-600 rounded text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`px-2 py-1 text-xs rounded-full border flex items-center gap-1 ${status.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                      {status.label}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  {set.thumbnail_image_id ? (
                    <div className="aspect-video bg-zinc-800 relative">
                      <img
                        src={`/api/images/${set.thumbnail_image_id}`}
                        alt={set.title}
                        className="w-full h-full object-cover"
                        loading={index < 8 ? "eager" : "lazy"}
                      />
                      {isDeleting && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-8 h-8 border-3 border-white/20 rounded-full animate-spin border-t-white"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-purple-600/20 flex items-center justify-center">
                      <svg className="w-16 h-16 text-purple-600/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-white font-medium line-clamp-1">{set.title}</h3>
                    
                    {set.characters && set.characters.length > 0 && (
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {set.characters.map(c => c.name).join(', ')}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(set.scheduled_time || set.published_at || set.created_at)}</span>
                      <span>{set.image_count || 0} images</span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-white/5">
                      <button
                        onClick={() => onEdit(set)}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(set.id)}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden"
          >
            <div className="divide-y divide-white/5">
              {filteredContent.map((set, index) => {
                const isDeleting = deletingIds.has(set.id)
                const isSelected = selectedIds.has(set.id)
                const status = getStatusBadge(set)
                
                return (
                  <motion.div
                    key={set.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`p-6 hover:bg-zinc-900/70 transition-all flex items-center gap-4 ${
                      isDeleting ? 'opacity-50' : ''
                    } ${
                      isSelected ? 'bg-purple-600/5' : ''
                    }`}
                  >
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(set.id)}
                        disabled={isDeleting}
                        className="w-5 h-5 bg-zinc-800 border-zinc-600 rounded text-purple-600"
                      />
                    )}

                    {/* Thumbnail */}
                    {set.thumbnail_image_id ? (
                      <img
                        src={`/api/images/${set.thumbnail_image_id}`}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg"
                        loading={index < 10 ? "eager" : "lazy"}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white truncate">{set.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full border ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      {set.characters && set.characters.length > 0 && (
                        <p className="text-xs text-gray-400 mb-2">
                          {set.characters.map(c => c.name).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDate(set.scheduled_time || set.published_at || set.created_at)}</span>
                        <span>{set.image_count || 0} images</span>
                        {set.view_count > 0 && <span>{set.view_count} views</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(set)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(set.id)}
                        disabled={isDeleting}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {kanbanColumns.map(column => {
              const columnSets = filteredContent.filter(set => getContentStatus(set) === column.status)
              
              return (
                <div key={column.id} className="bg-zinc-900/30 rounded-xl border border-white/5">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <span className="px-2 py-1 bg-zinc-800 text-gray-400 text-xs rounded-full">
                      {columnSets.length}
                    </span>
                  </div>
                  <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {columnSets.map((set, index) => (
                      <motion.div
                        key={set.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800/70 transition-colors cursor-pointer"
                        onClick={() => onEdit(set)}
                      >
                        <h4 className="text-sm font-medium text-white mb-1">{set.title}</h4>
                        {set.characters && set.characters.length > 0 && (
                          <p className="text-xs text-gray-500 mb-1">
                            {set.characters.map(c => c.name).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{formatDate(set.created_at)}</p>
                        <div className="mt-2 flex gap-2 text-xs text-gray-400">
                          <span>{set.image_count || 0} images</span>
                          {set.view_count > 0 && <span>{set.view_count} views</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center gap-2"
        >
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-900/50 hover:bg-zinc-900 text-gray-400'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-zinc-900/50 hover:bg-zinc-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </motion.div>
      )}

      {/* Empty state */}
      {filteredContent.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <svg className="w-24 h-24 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-lg">No content found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search term</p>
        </motion.div>
      )}
    </div>
  )
})

ContentManager.displayName = 'ContentManager'
