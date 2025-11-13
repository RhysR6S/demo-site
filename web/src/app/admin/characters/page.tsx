// src/app/admin/characters/page.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import type { Character, Series } from '@/types/database'

interface CharacterWithSeries extends Character {
  series?: Series | null
}

type TabType = 'characters' | 'series'

export default function CharactersAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('characters')
  const [characters, setCharacters] = useState<CharacterWithSeries[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Form states
  const [showCharacterForm, setShowCharacterForm] = useState(false)
  const [showSeriesForm, setShowSeriesForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<CharacterWithSeries | null>(null)
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)
  
  // Bulk import state
  const [bulkImportData, setBulkImportData] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  
  // Character form
  const [characterForm, setCharacterForm] = useState({
    name: '',
    series_id: '',
    slug: ''
  })
  
  // Series form
  const [seriesForm, setSeriesForm] = useState({
    name: '',
    slug: ''
  })

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load series first
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .select('*')
        .order('name')
      
      if (seriesError) throw seriesError
      setSeries(seriesData || [])
      
      // Load characters with series
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select(`
          *,
          series:series_id (*)
        `)
        .order('name')
      
      if (charactersError) throw charactersError
      setCharacters(charactersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  // Handle character form submit
  const handleCharacterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const slug = characterForm.slug || generateSlug(characterForm.name)
      
      if (editingCharacter) {
        // Update existing character
        const { error } = await supabase
          .from('characters')
          .update({
            name: characterForm.name,
            series_id: characterForm.series_id || null,
            slug
          })
          .eq('id', editingCharacter.id)
        
        if (error) throw error
      } else {
        // Create new character
        const { error } = await supabase
          .from('characters')
          .insert({
            name: characterForm.name,
            series_id: characterForm.series_id || null,
            slug
          })
        
        if (error) throw error
      }
      
      // Reset form and reload data
      setCharacterForm({ name: '', series_id: '', slug: '' })
      setShowCharacterForm(false)
      setEditingCharacter(null)
      loadData()
    } catch (error) {
      console.error('Error saving character:', error)
      alert('Failed to save character')
    }
  }

  // Handle series form submit
  const handleSeriesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const slug = seriesForm.slug || generateSlug(seriesForm.name)
      
      if (editingSeries) {
        // Update existing series
        const { error } = await supabase
          .from('series')
          .update({
            name: seriesForm.name,
            slug
          })
          .eq('id', editingSeries.id)
        
        if (error) throw error
      } else {
        // Create new series
        const { error } = await supabase
          .from('series')
          .insert({
            name: seriesForm.name,
            slug
          })
        
        if (error) throw error
      }
      
      // Reset form and reload data
      setSeriesForm({ name: '', slug: '' })
      setShowSeriesForm(false)
      setEditingSeries(null)
      loadData()
    } catch (error) {
      console.error('Error saving series:', error)
      alert('Failed to save series')
    }
  }

  // Delete character
  const deleteCharacter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return
    
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting character:', error)
      alert('Failed to delete character')
    }
  }

  // Delete series
  const deleteSeries = async (id: string) => {
    if (!confirm('Are you sure you want to delete this series? This will not delete associated characters.')) return
    
    try {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting series:', error)
      alert('Failed to delete series')
    }
  }

  // Edit character
  const editCharacter = (character: CharacterWithSeries) => {
    setEditingCharacter(character)
    setCharacterForm({
      name: character.name,
      series_id: character.series_id || '',
      slug: character.slug
    })
    setShowCharacterForm(true)
  }

  // Edit series
  const editSeries = (s: Series) => {
    setEditingSeries(s)
    setSeriesForm({
      name: s.name,
      slug: s.slug
    })
    setShowSeriesForm(true)
  }

  // Handle bulk import
  const handleBulkImport = async () => {
    setBulkImporting(true)
    
    try {
      // Parse the input data
      const lines = bulkImportData.trim().split('\n').filter(line => line.trim())
      const importData: any = { series: [], characters: [] }
      
      for (const line of lines) {
        const trimmed = line.trim()
        
        // Skip empty lines
        if (!trimmed) continue
        
        // Check if it's a series line (starts with "Series:" or just a single name without series indicator)
        if (trimmed.startsWith('Series:')) {
          const seriesName = trimmed.replace('Series:', '').trim()
          if (seriesName) {
            importData.series.push({ name: seriesName })
          }
        } else if (trimmed.includes(' - ')) {
          // Character with series format: "Character Name - Series Name"
          const [charName, seriesName] = trimmed.split(' - ').map(s => s.trim())
          if (charName) {
            importData.characters.push({ 
              name: charName, 
              series: seriesName || undefined 
            })
            // Also add the series if not already added
            if (seriesName && !importData.series.find((s: any) => s.name === seriesName)) {
              importData.series.push({ name: seriesName })
            }
          }
        } else {
          // Just a character name without series
          importData.characters.push({ name: trimmed })
        }
      }
      
      // Call the bulk import API
      const response = await fetch('/api/admin/characters/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`Import complete!\n\nSeries created: ${result.results.series.created}\nCharacters created: ${result.results.characters.created}\n\nErrors:\n${[...result.results.series.errors, ...result.results.characters.errors].join('\n') || 'None'}`)
        setBulkImportData('')
        setShowBulkImport(false)
        loadData()
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Bulk import error:', error)
      alert('Bulk import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setBulkImporting(false)
    }
  }

  // Filter data based on search
  const filteredCharacters = characters.filter(char => 
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.series?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const filteredSeries = series.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Characters & Series</h1>
        <p className="text-gray-400">Manage characters and series for your content</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('characters')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'characters'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Characters
        </button>
        <button
          onClick={() => setActiveTab('series')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'series'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Series
        </button>
      </div>

      {/* Search and Add */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" />
            </svg>
            Bulk Import
          </button>
          
          <button
            onClick={() => {
              if (activeTab === 'characters') {
                setEditingCharacter(null)
                setCharacterForm({ name: '', series_id: '', slug: '' })
                setShowCharacterForm(true)
              } else {
                setEditingSeries(null)
                setSeriesForm({ name: '', slug: '' })
                setShowSeriesForm(true)
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            Add {activeTab === 'characters' ? 'Character' : 'Series'}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-16 h-16 border-4 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'characters' ? (
            <motion.div
              key="characters"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {filteredCharacters.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-white/5">
                  <p className="text-gray-400">No characters found</p>
                </div>
              ) : (
                filteredCharacters.map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-white/5 hover:border-purple-600/30 transition-all"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-white">{character.name}</h3>
                      {character.series && (
                        <p className="text-sm text-gray-400">Series: {character.series.name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 font-mono">Slug: {character.slug}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editCharacter(character)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteCharacter(character.id)}
                        className="p-2 hover:bg-red-600/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="series"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {filteredSeries.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-white/5">
                  <p className="text-gray-400">No series found</p>
                </div>
              ) : (
                filteredSeries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-white/5 hover:border-purple-600/30 transition-all"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-white">{s.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 font-mono">Slug: {s.slug}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {characters.filter(c => c.series_id === s.id).length} characters
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editSeries(s)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteSeries(s.id)}
                        className="p-2 hover:bg-red-600/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Character Form Modal */}
      <AnimatePresence>
        {showCharacterForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCharacterForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingCharacter ? 'Edit Character' : 'Add New Character'}
              </h2>
              
              <form onSubmit={handleCharacterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Character Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={characterForm.name}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all"
                    placeholder="e.g., Boa Hancock"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Series (Optional)
                  </label>
                  <select
                    value={characterForm.series_id}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, series_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-600/50 transition-all"
                  >
                    <option value="">No Series</option>
                    {series.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={characterForm.slug}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all font-mono text-sm"
                    placeholder="auto-generated-from-name"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from name</p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    {editingCharacter ? 'Update' : 'Add'} Character
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCharacterForm(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Series Form Modal */}
      <AnimatePresence>
        {showSeriesForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSeriesForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingSeries ? 'Edit Series' : 'Add New Series'}
              </h2>
              
              <form onSubmit={handleSeriesSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Series Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={seriesForm.name}
                    onChange={(e) => setSeriesForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all"
                    placeholder="e.g., One Piece"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={seriesForm.slug}
                    onChange={(e) => setSeriesForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all font-mono text-sm"
                    placeholder="auto-generated-from-name"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from name</p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    {editingSeries ? 'Update' : 'Add'} Series
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSeriesForm(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkImport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBulkImport(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Bulk Import Characters & Series</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Import Data
                  </label>
                  <textarea
                    value={bulkImportData}
                    onChange={(e) => setBulkImportData(e.target.value)}
                    className="w-full h-64 px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all font-mono text-sm"
                    placeholder="Enter one item per line..."
                    disabled={bulkImporting}
                  />
                </div>
                
                <div className="bg-zinc-800/50 rounded-xl p-4 text-sm text-gray-400">
                  <p className="font-medium text-white mb-2">Format Instructions:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>For series only: <code className="text-purple-400">Series: Series Name</code></li>
                    <li>For character with series: <code className="text-purple-400">Character Name - Series Name</code></li>
                    <li>For character without series: <code className="text-purple-400">Character Name</code></li>
                  </ul>
                  
                  <p className="font-medium text-white mt-4 mb-2">Example:</p>
                  <pre className="text-xs bg-black/50 p-3 rounded-lg overflow-x-auto">
{`Series: One Piece
Series: My Hero Academia
Monkey D. Luffy - One Piece
Roronoa Zoro - One Piece
Nami - One Piece
Izuku Midoriya - My Hero Academia
Katsuki Bakugo - My Hero Academia
Solo Character`}
                  </pre>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleBulkImport}
                    disabled={bulkImporting || !bulkImportData.trim()}
                    className={`flex-1 py-3 font-medium rounded-xl transition-all duration-200 ${
                      bulkImporting || !bulkImportData.trim()
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {bulkImporting ? 'Importing...' : 'Import'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkImport(false)}
                    disabled={bulkImporting}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
