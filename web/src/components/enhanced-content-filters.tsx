// src/components/enhanced-content-filters.tsx
"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FilterOption {
  id: string
  label: string
  count?: number
}

interface EnhancedContentFiltersProps {
  characters?: FilterOption[]
  series?: FilterOption[]
  tags?: FilterOption[]
  onFilterChange: (filters: {
    characters: string[]
    series: string[]
    tags: string[]
    dateRange?: 'today' | 'week' | 'month' | 'all'
  }) => void
}

export function EnhancedContentFilters({
  characters = [],
  series = [],
  tags = [],
  onFilterChange
}: EnhancedContentFiltersProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const handleFilterChange = () => {
    onFilterChange({
      characters: selectedCharacters,
      series: selectedSeries,
      tags: selectedTags,
      dateRange
    })
  }

  const toggleCharacter = (id: string) => {
    setSelectedCharacters(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
    handleFilterChange()
  }

  const toggleSeries = (id: string) => {
    setSelectedSeries(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
    handleFilterChange()
  }

  const toggleTag = (id: string) => {
    setSelectedTags(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
    handleFilterChange()
  }

  const clearAllFilters = () => {
    setSelectedCharacters([])
    setSelectedSeries([])
    setSelectedTags([])
    setDateRange('all')
    onFilterChange({
      characters: [],
      series: [],
      tags: [],
      dateRange: 'all'
    })
  }

  const activeFilterCount = selectedCharacters.length + selectedSeries.length + selectedTags.length + (dateRange !== 'all' ? 1 : 0)

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 bg-red-600/20 text-red-500 text-xs font-medium rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Date Range Quick Filters */}
      <div className="p-4 border-b border-white/5">
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setDateRange(range)
                handleFilterChange()
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === range
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Filter Sections */}
      <div className="divide-y divide-white/5">
        {/* Characters Section */}
        {characters.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'characters' ? null : 'characters')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Characters</span>
                {selectedCharacters.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-600/20 text-red-500 text-xs rounded-full">
                    {selectedCharacters.length}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSection === 'characters' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <AnimatePresence>
              {expandedSection === 'characters' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {characters.map((character) => (
                        <label
                          key={character.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCharacters.includes(character.id)}
                            onChange={() => toggleCharacter(character.id)}
                            className="w-4 h-4 rounded border-gray-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-0"
                          />
                          <span className="text-gray-300 flex-1">{character.label}</span>
                          {character.count !== undefined && (
                            <span className="text-xs text-gray-500">{character.count}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Series Section */}
        {series.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'series' ? null : 'series')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Series</span>
                {selectedSeries.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-600/20 text-red-500 text-xs rounded-full">
                    {selectedSeries.length}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSection === 'series' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <AnimatePresence>
              {expandedSection === 'series' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {series.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSeries.includes(s.id)}
                            onChange={() => toggleSeries(s.id)}
                            className="w-4 h-4 rounded border-gray-600 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-0"
                          />
                          <span className="text-gray-300 flex-1">{s.label}</span>
                          {s.count !== undefined && (
                            <span className="text-xs text-gray-500">{s.count}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tags Section */}
        {tags.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'tags' ? null : 'tags')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Tags</span>
                {selectedTags.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-600/20 text-red-500 text-xs rounded-full">
                    {selectedTags.length}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSection === 'tags' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <AnimatePresence>
              {expandedSection === 'tags' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 max-h-64 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedTags.includes(tag.id)
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                          }`}
                        >
                          {tag.label}
                          {tag.count !== undefined && (
                            <span className="ml-1 opacity-70">({tag.count})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}