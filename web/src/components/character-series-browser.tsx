// src/components/character-series-browser.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Character, Series } from '@/types/database'

interface CharacterWithSeries extends Character {
  series: Series | null
}

interface CharacterSeriesBrowserProps {
  selectedCharacters: string[]
  onSelectionChange: (characterIds: string[]) => void
  selectedSeries?: string | null
  onSeriesChange?: (seriesId: string | null) => void
}

export function CharacterSeriesBrowser({
  selectedCharacters,
  onSelectionChange,
  selectedSeries,
  onSeriesChange
}: CharacterSeriesBrowserProps) {
  const [characters, setCharacters] = useState<CharacterWithSeries[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'series' | 'characters'>('series')
  const [selectedSeriesInternal, setSelectedSeriesInternal] = useState<string | null>(selectedSeries || null)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      // Load series
      const { data: seriesData } = await supabase
        .from('series')
        .select('*')
        .order('name')
      
      if (seriesData) {
        setSeries(seriesData)
      }
      
      // Load characters with series
      const { data: charactersData } = await supabase
        .from('characters')
        .select(`
          *,
          series:series_id (*)
        `)
        .order('name')
      
      if (charactersData) {
        setCharacters(charactersData as CharacterWithSeries[])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter characters based on selected series and search
  const filteredCharacters = useMemo(() => {
    let filtered = characters
    
    // Filter by series if one is selected
    if (selectedSeriesInternal && selectedSeriesInternal !== 'mixed') {
      filtered = filtered.filter(char => char.series_id === selectedSeriesInternal)
    }
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(char => 
        char.name.toLowerCase().includes(search) ||
        char.series?.name.toLowerCase().includes(search)
      )
    }
    
    return filtered
  }, [characters, selectedSeriesInternal, searchTerm])

  // Group characters by series
  const charactersBySeries = useMemo(() => {
    const grouped = new Map<string, CharacterWithSeries[]>()
    
    // Add "No Series" group
    grouped.set('none', [])
    
    // Group characters
    filteredCharacters.forEach(char => {
      if (char.series_id && char.series) {
        if (!grouped.has(char.series_id)) {
          grouped.set(char.series_id, [])
        }
        grouped.get(char.series_id)!.push(char)
      } else {
        grouped.get('none')!.push(char)
      }
    })
    
    // Remove empty groups
    Array.from(grouped.keys()).forEach(key => {
      if (grouped.get(key)!.length === 0) {
        grouped.delete(key)
      }
    })
    
    return grouped
  }, [filteredCharacters])

  // Handle character selection
  const toggleCharacter = useCallback((characterId: string) => {
    const newSelection = selectedCharacters.includes(characterId)
      ? selectedCharacters.filter(id => id !== characterId)
      : [...selectedCharacters, characterId]
    
    onSelectionChange(newSelection)
  }, [selectedCharacters, onSelectionChange])

  // Handle series selection
  const selectSeries = useCallback((seriesId: string | null) => {
    setSelectedSeriesInternal(seriesId)
    onSeriesChange?.(seriesId)
    
    if (seriesId && seriesId !== 'mixed') {
      // Auto-expand the selected series
      setExpandedSeries(prev => new Set(prev).add(seriesId))
      setActiveTab('characters')
    }
  }, [onSeriesChange])

  // Toggle series expansion
  const toggleSeriesExpansion = useCallback((seriesId: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev)
      if (next.has(seriesId)) {
        next.delete(seriesId)
      } else {
        next.add(seriesId)
      }
      return next
    })
  }, [])

  // Select all characters from a series
  const selectAllFromSeries = useCallback((seriesId: string) => {
    const seriesCharacters = charactersBySeries.get(seriesId) || []
    const seriesCharacterIds = seriesCharacters.map(c => c.id)
    
    // Add all characters from this series
    const newSelection = Array.from(new Set([...selectedCharacters, ...seriesCharacterIds]))
    onSelectionChange(newSelection)
  }, [charactersBySeries, selectedCharacters, onSelectionChange])

  // Deselect all characters from a series
  const deselectAllFromSeries = useCallback((seriesId: string) => {
    const seriesCharacters = charactersBySeries.get(seriesId) || []
    const seriesCharacterIds = new Set(seriesCharacters.map(c => c.id))
    
    // Remove all characters from this series
    const newSelection = selectedCharacters.filter(id => !seriesCharacterIds.has(id))
    onSelectionChange(newSelection)
  }, [charactersBySeries, selectedCharacters, onSelectionChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600/20 rounded-full animate-spin border-t-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search characters or series..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-12 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-800/30 rounded-xl">
        <button
          onClick={() => setActiveTab('series')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'series'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Series
          </span>
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'characters'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-700/50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Characters ({selectedCharacters.length})
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900/30 rounded-xl border border-zinc-800 p-4 max-h-[600px] overflow-y-auto scrollbar-thin">
        {activeTab === 'series' ? (
          // Series View
          <div className="space-y-3">
            {/* Mixed Series Option */}
            <button
              onClick={() => selectSeries('mixed')}
              className={`w-full p-4 rounded-xl border transition-all ${
                selectedSeriesInternal === 'mixed'
                  ? 'bg-purple-600/20 border-purple-600 text-cyan-400'
                  : 'bg-zinc-800/30 border-zinc-700 hover:border-purple-600/50 text-gray-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Mixed Series</h3>
                    <p className="text-sm text-gray-500">Select characters from multiple series</p>
                  </div>
                </div>
                {selectedSeriesInternal === 'mixed' && (
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>

            {/* Series List */}
            {series.map(s => {
              const seriesCharacters = characters.filter(c => c.series_id === s.id)
              const selectedCount = seriesCharacters.filter(c => selectedCharacters.includes(c.id)).length
              
              return (
                <button
                  key={s.id}
                  onClick={() => selectSeries(s.id)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedSeriesInternal === s.id
                      ? 'bg-purple-600/20 border-purple-600'
                      : selectedCount > 0
                      ? 'bg-purple-600/10 border-cyan-600/30'
                      : 'bg-zinc-800/30 border-zinc-700 hover:border-purple-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{s.name}</h3>
                      <p className="text-sm text-gray-500">
                        {seriesCharacters.length} character{seriesCharacters.length !== 1 ? 's' : ''}
                        {selectedCount > 0 && ` • ${selectedCount} selected`}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          // Characters View
          <div className="space-y-6">
            {/* Selected Series Header */}
            {selectedSeriesInternal && selectedSeriesInternal !== 'mixed' && (
              <div className="bg-purple-600/10 border border-cyan-600/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-400 mb-1">Viewing characters from</p>
                    <h3 className="text-lg font-semibold text-white">
                      {series.find(s => s.id === selectedSeriesInternal)?.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => selectSeries(null)}
                    className="text-cyan-400 hover:text-purple-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Character Groups */}
            {Array.from(charactersBySeries.entries()).map(([seriesId, chars]) => {
              const seriesData = series.find(s => s.id === seriesId)
              const isExpanded = expandedSeries.has(seriesId) || selectedSeriesInternal === seriesId
              const selectedCount = chars.filter(c => selectedCharacters.includes(c.id)).length
              const allSelected = selectedCount === chars.length && chars.length > 0
              
              return (
                <div key={seriesId} className="space-y-3">
                  {/* Series Header */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSeriesExpansion(seriesId)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h3 className="font-medium">
                        {seriesData?.name || 'No Series'} 
                        <span className="text-sm text-gray-500 ml-2">
                          ({chars.length})
                          {selectedCount > 0 && <span className="text-cyan-400"> • {selectedCount} selected</span>}
                        </span>
                      </h3>
                    </button>
                    
                    {isExpanded && chars.length > 1 && (
                      <button
                        onClick={() => allSelected ? deselectAllFromSeries(seriesId) : selectAllFromSeries(seriesId)}
                        className="text-sm text-cyan-400 hover:text-purple-300 transition-colors"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {/* Character Grid */}
                  {isExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {chars.map(char => {
                        const isSelected = selectedCharacters.includes(char.id)
                        
                        return (
                          <button
                            key={char.id}
                            onClick={() => toggleCharacter(char.id)}
                            className={`p-3 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-purple-600/20 border-purple-600 text-cyan-400'
                                : 'bg-zinc-800/30 border-zinc-700 hover:border-purple-600/50 text-gray-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate flex-1">{char.name}</span>
                              {isSelected && (
                                <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Characters Summary */}
      {selectedCharacters.length > 0 && (
        <div className="bg-purple-600/10 border border-cyan-600/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-cyan-400">
              Selected Characters ({selectedCharacters.length})
            </h4>
            <button
              onClick={() => onSelectionChange([])}
              className="text-sm text-cyan-400 hover:text-purple-300 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCharacters.map(charId => {
              const char = characters.find(c => c.id === charId)
              if (!char) return null
              
              return (
                <div
                  key={charId}
                  className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 rounded-full text-sm"
                >
                  <span className="text-purple-300">{char.name}</span>
                  {char.series && (
                    <span className="text-cyan-500">({char.series.name})</span>
                  )}
                  <button
                    onClick={() => toggleCharacter(charId)}
                    className="text-cyan-400 hover:text-purple-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}