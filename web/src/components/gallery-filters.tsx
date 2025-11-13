// src/components/gallery-filters.tsx
"use client"

import { useState } from 'react'

interface FilterOptions {
  characters: { id: string; name: string; count: number }[]
  series: { id: string; name: string; count: number }[]
  tags: { tag: string; count: number }[]
}

interface GalleryFiltersProps {
  filterOptions: FilterOptions
  selectedCharacters: string[]
  selectedSeries: string[]
  selectedTags: string[]
  viewFilter: 'all' | 'unseen' | 'downloaded' | 'not_downloaded'
  sortBy: 'newest' | 'oldest' | 'most_viewed' | 'most_liked' | 'recently_viewed'
  searchQuery: string
  onCharacterChange: (ids: string[]) => void
  onSeriesChange: (ids: string[]) => void
  onTagChange: (tags: string[]) => void
  onViewFilterChange: (filter: 'all' | 'unseen' | 'downloaded' | 'not_downloaded') => void
  onSortChange: (sort: 'newest' | 'oldest' | 'most_viewed' | 'most_liked' | 'recently_viewed') => void
  onSearchChange: (query: string) => void
  stats: {
    total: number
    filtered: number
    unseen: number
    downloaded: number
  }
}

export function GalleryFilters({
  filterOptions,
  selectedCharacters,
  selectedSeries,
  selectedTags,
  viewFilter,
  sortBy,
  searchQuery,
  onCharacterChange,
  onSeriesChange,
  onTagChange,
  onViewFilterChange,
  onSortChange,
  onSearchChange,
  stats
}: GalleryFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    status: true,
    sort: true,
    characters: true,
    series: true,
    tags: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const viewFilterOptions = [
    { value: 'all', label: 'All Sets', count: stats.total },
    { value: 'unseen', label: 'New Sets', count: stats.unseen, color: 'text-green-400' },
    { value: 'downloaded', label: 'Downloaded', count: stats.downloaded },
    { value: 'not_downloaded', label: 'Not Downloaded', count: stats.total - stats.downloaded }
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'most_viewed', label: 'Most Viewed' },
    { value: 'most_liked', label: 'Most Liked' },
    { value: 'recently_viewed', label: 'Recently Viewed' }
  ]

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <button
          onClick={() => toggleSection('search')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </h3>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.search ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.search && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search sets, characters, tags..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors"
          />
        )}
      </div>

      {/* View Status Filter */}
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <button
          onClick={() => toggleSection('status')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Status
          </h3>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.status ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.status && (
          <div className="space-y-2">
            {viewFilterOptions.map(option => {
              const isActive = viewFilter === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => onViewFilterChange(option.value as any)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-red-600/20 border border-red-600/30 text-red-500' 
                      : 'hover:bg-zinc-700 text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className={`text-xs ${option.color || 'text-gray-500'}`}>
                    {option.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Sort Options */}
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Sort By
          </h3>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.sort ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.sort && (
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Characters Filter */}
      {filterOptions.characters.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <button
            onClick={() => toggleSection('characters')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Characters
              {selectedCharacters.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded-full">
                  {selectedCharacters.length}
                </span>
              )}
            </h3>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.characters ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.characters && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filterOptions.characters.slice(0, 10).map(character => {
                const isSelected = selectedCharacters.includes(character.id)
                return (
                  <label
                    key={character.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700/50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onCharacterChange([...selectedCharacters, character.id])
                        } else {
                          onCharacterChange(selectedCharacters.filter(id => id !== character.id))
                        }
                      }}
                      className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-red-600 focus:ring-red-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-300 flex-1">{character.name}</span>
                    <span className="text-xs text-gray-500">{character.count}</span>
                  </label>
                )
              })}
              {filterOptions.characters.length > 10 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  +{filterOptions.characters.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Series Filter */}
      {filterOptions.series.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <button
            onClick={() => toggleSection('series')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Series
              {selectedSeries.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded-full">
                  {selectedSeries.length}
                </span>
              )}
            </h3>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.series ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.series && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filterOptions.series.map(series => {
                const isSelected = selectedSeries.includes(series.id)
                return (
                  <label
                    key={series.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700/50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSeriesChange([...selectedSeries, series.id])
                        } else {
                          onSeriesChange(selectedSeries.filter(id => id !== series.id))
                        }
                      }}
                      className="w-4 h-4 bg-zinc-800 border-zinc-600 rounded text-red-600 focus:ring-red-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-300 flex-1">{series.name}</span>
                    <span className="text-xs text-gray-500">{series.count}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tags Filter */}
      {filterOptions.tags.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <button
            onClick={() => toggleSection('tags')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tags
              {selectedTags.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded-full">
                  {selectedTags.length}
                </span>
              )}
            </h3>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.tags ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.tags && (
            <div className="flex flex-wrap gap-2">
              {filterOptions.tags.slice(0, 20).map(({ tag, count }) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        onTagChange(selectedTags.filter(t => t !== tag))
                      } else {
                        onTagChange([...selectedTags, tag])
                      }
                    }}
                    className={`
                      px-3 py-1 text-xs rounded-full transition-all
                      ${isSelected 
                        ? 'bg-red-600 text-white' 
                        : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                      }
                    `}
                  >
                    {tag} ({count})
                  </button>
                )
              })}
              {filterOptions.tags.length > 20 && (
                <p className="text-xs text-gray-500 w-full text-center">
                  +{filterOptions.tags.length - 20} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clear Filters */}
      {(selectedCharacters.length > 0 || selectedSeries.length > 0 || selectedTags.length > 0 || searchQuery || viewFilter !== 'all') && (
        <button
          onClick={() => {
            onCharacterChange([])
            onSeriesChange([])
            onTagChange([])
            onSearchChange('')
            onViewFilterChange('all')
          }}
          className="w-full px-4 py-2 bg-red-600/20 text-red-500 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors font-medium"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )
}
