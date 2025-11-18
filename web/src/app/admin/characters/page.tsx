// src/app/admin/subjects/page.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import type { Subject, Collection } from '@/types/database'

interface SubjectWithCollection extends Subject {
  collection?: Collection | null
}

type TabType = 'subjects' | 'collections'

export default function SubjectsAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('subjects')
  const [subjects, setSubjects] = useState<SubjectWithCollection[]>([])
  const [collection, setCollection] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Form states
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [showCollectionForm, setShowCollectionForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectWithCollection | null>(null)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  
  // Bulk import state
  const [bulkImportData, setBulkImportData] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  
  // Subject form
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    series_id: '',
    slug: ''
  })
  
  // Collection form
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    slug: ''
  })

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load collection first
      const { data: collectionData, error: collectionError } = await supabase
        .from('series')
        .select('*')
        .order('name')
      
      if (collectionError) throw collectionError
      setCollection(collectionData || [])
      
      // Load subjects with collection
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('characters')
        .select(`
          *,
          collection:series_id (*)
        `)
        .order('name')
      
      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])
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

  // Handle subject form submit
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const slug = subjectForm.slug || generateSlug(subjectForm.name)
      
      if (editingSubject) {
        // Update existing subject
        const { error } = await supabase
          .from('characters')
          .update({
            name: subjectForm.name,
            series_id: subjectForm.series_id || null,
            slug
          })
          .eq('id', editingSubject.id)
        
        if (error) throw error
      } else {
        // Create new subject
        const { error } = await supabase
          .from('characters')
          .insert({
            name: subjectForm.name,
            series_id: subjectForm.series_id || null,
            slug
          })
        
        if (error) throw error
      }
      
      // Reset form and reload data
      setSubjectForm({ name: '', series_id: '', slug: '' })
      setShowSubjectForm(false)
      setEditingSubject(null)
      loadData()
    } catch (error) {
      console.error('Error saving subject:', error)
      alert('Failed to save subject')
    }
  }

  // Handle collection form submit
  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const slug = collectionForm.slug || generateSlug(collectionForm.name)
      
      if (editingCollection) {
        // Update existing collection
        const { error } = await supabase
          .from('series')
          .update({
            name: collectionForm.name,
            slug
          })
          .eq('id', editingCollection.id)
        
        if (error) throw error
      } else {
        // Create new collection
        const { error } = await supabase
          .from('series')
          .insert({
            name: collectionForm.name,
            slug
          })
        
        if (error) throw error
      }
      
      // Reset form and reload data
      setCollectionForm({ name: '', slug: '' })
      setShowCollectionForm(false)
      setEditingCollection(null)
      loadData()
    } catch (error) {
      console.error('Error saving collection:', error)
      alert('Failed to save collection')
    }
  }

  // Delete subject
  const deleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return
    
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert('Failed to delete subject')
    }
  }

  // Delete collection
  const deleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection? This will not delete associated subjects.')) return
    
    try {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Failed to delete collection')
    }
  }

  // Edit subject
  const editSubject = (subject: SubjectWithCollection) => {
    setEditingSubject(subject)
    setSubjectForm({
      name: subject.name,
      series_id: subject.series_id || '',
      slug: subject.slug
    })
    setShowSubjectForm(true)
  }

  // Edit collection
  const editCollection = (s: Collection) => {
    setEditingCollection(s)
    setCollectionForm({
      name: s.name,
      slug: s.slug
    })
    setShowCollectionForm(true)
  }

  // Handle bulk import
  const handleBulkImport = async () => {
    setBulkImporting(true)
    
    try {
      // Parse the input data
      const lines = bulkImportData.trim().split('\n').filter(line => line.trim())
      const importData: any = { collection: [], subjects: [] }
      
      for (const line of lines) {
        const trimmed = line.trim()
        
        // Skip empty lines
        if (!trimmed) continue
        
        // Check if it's a collection line (starts with "Collection:" or just a single name without collection indicator)
        if (trimmed.startsWith('Collection:')) {
          const collectionName = trimmed.replace('Collection:', '').trim()
          if (collectionName) {
            importData.collections.push({ name: collectionName })
          }
        } else if (trimmed.includes(' - ')) {
          // Subject with collection format: "Subject Name - Collection Name"
          const [charName, collectionName] = trimmed.split(' - ').map(s => s.trim())
          if (charName) {
            importData.subjects.push({ 
              name: charName, 
              collection: collectionName || undefined 
            })
            // Also add the collection if not already added
            if (collectionName && !importData.collections.find((s: any) => s.name === collectionName)) {
              importData.collections.push({ name: collectionName })
            }
          }
        } else {
          // Just a subject name without collection
          importData.subjects.push({ name: trimmed })
        }
      }
      
      // Call the bulk import API
      const response = await fetch('/api/admin/subjects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`Import complete!\n\nCollection created: ${result.results.collections.created}\nSubjects created: ${result.results.subjects.created}\n\nErrors:\n${[...result.results.collections.errors, ...result.results.subjects.errors].join('\n') || 'None'}`)
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
  const filteredSubjects = subjects.filter(char => 
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.collection?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const filteredCollection = collections.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Subjects & Collections</h1>
        <p className="text-gray-400">Manage subjects and collections for your content</p>
      </div>

      {/* Tabs */}
      <div className="relative flex items-center gap-1 p-1 bg-slate-900/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'subjects'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Subjects
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'collections'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          Collections
        </button>
      </div>

      {/* Search and Add */}
      <div className="relative flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all"
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
              if (activeTab === 'subjects') {
                setEditingSubject(null)
                setSubjectForm({ name: '', series_id: '', slug: '' })
                setShowSubjectForm(true)
              } else {
                setEditingCollection(null)
                setCollectionForm({ name: '', slug: '' })
                setShowCollectionForm(true)
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            Add {activeTab === 'subjects' ? 'Subject' : 'Collection'}
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
          {activeTab === 'subjects' ? (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {filteredSubjects.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-white/5">
                  <p className="text-gray-400">No subjects found</p>
                </div>
              ) : (
                filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-white/5 hover:border-cyan-600/30 transition-all"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-white">{subject.name}</h3>
                      {subject.collection && (
                        <p className="text-sm text-gray-400">Collection: {subject.collections.name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 font-mono">Slug: {subject.slug}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editSubject(subject)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteSubject(subject.id)}
                        className="p-2 hover:bg-sky-600/20 rounded-lg text-gray-400 hover:text-sky-400 transition-colors"
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
              key="collection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              {filteredCollection.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-white/5">
                  <p className="text-gray-400">No collection found</p>
                </div>
              ) : (
                filteredCollection.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-white/5 hover:border-cyan-600/30 transition-all"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-white">{s.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 font-mono">Slug: {s.slug}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {subjects.filter(c => c.series_id === s.id).length} subjects
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editCollection(s)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteCollection(s.id)}
                        className="p-2 hover:bg-sky-600/20 rounded-lg text-gray-400 hover:text-sky-400 transition-colors"
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

      {/* Subject Form Modal */}
      <AnimatePresence>
        {showSubjectForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSubjectForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
              
              <form onSubmit={handleSubjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject Name <span className="text-sky-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all"
                    placeholder="e.g., Professional Model, Lifestyle Subject"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Collection (Optional)
                  </label>
                  <select
                    value={subjectForm.series_id}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, series_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-600/50 transition-all"
                  >
                    <option value="">No Collection</option>
                    {collections.map(s => (
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
                    value={subjectForm.slug}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, slug: e.target.value }))}
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
                    {editingSubject ? 'Update' : 'Add'} Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubjectForm(false)}
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

      {/* Collection Form Modal */}
      <AnimatePresence>
        {showCollectionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCollectionForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingCollection ? 'Edit Collection' : 'Add New Collection'}
              </h2>
              
              <form onSubmit={handleCollectionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Collection Name <span className="text-sky-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={collectionForm.name}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 transition-all"
                    placeholder="e.g., Fashion, Outdoor Lifestyle, Corporate"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={collectionForm.slug}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, slug: e.target.value }))}
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
                    {editingCollection ? 'Update' : 'Add'} Collection
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCollectionForm(false)}
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
              className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Bulk Import Subjects & Collection</h2>
              
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
                    <li>For collection only: <code className="text-cyan-400">Collection: Collection Name</code></li>
                    <li>For subject with collection: <code className="text-cyan-400">Subject Name - Collection Name</code></li>
                    <li>For subject without collection: <code className="text-cyan-400">Subject Name</code></li>
                  </ul>
                  
                  <p className="font-medium text-white mt-4 mb-2">Example:</p>
                  <pre className="text-xs bg-black/50 p-3 rounded-lg overflow-x-auto">
{`Collection: One Piece
Collection: My Hero Academia
Monkey D. Luffy - One Piece
Roronoa Zoro - One Piece
Nami - One Piece
Izuku Midoriya - My Hero Academia
Katsuki Bakugo - My Hero Academia
Solo Subject`}
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