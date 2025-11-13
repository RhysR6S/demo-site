// src/components/admin/content-editor.tsx
"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ContentSetWithRelations, Character } from '@/types/database'

interface ContentEditorProps {
  contentSet: ContentSetWithRelations | null
  onSave: () => void | Promise<void>
  onCancel: () => void
}

export function ContentEditor({ contentSet, onSave, onCancel }: ContentEditorProps) {
  const [loading, setLoading] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    characterIds: [] as string[],
    tags: [] as string[],
    isCommission: false,
    scheduledTime: '',
    published: false
  })

  useEffect(() => {
    loadCharacters()
    
    if (contentSet) {
      // Handle scheduled time conversion
      let localScheduledTime = ''
      if (contentSet.scheduled_time && !contentSet.published_at) {
        // Only show scheduled time if not published
        const date = new Date(contentSet.scheduled_time)
        localScheduledTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      }
      
      setFormData({
        title: contentSet.title,
        description: contentSet.description || '',
        characterIds: contentSet.characters?.map(c => c.id) || [],
        tags: contentSet.tags || [],
        isCommission: contentSet.is_commission,
        scheduledTime: localScheduledTime,
        published: !!contentSet.published_at
      })
    }
  }, [contentSet])

  async function loadCharacters() {
    const { data } = await supabase
      .from('characters')
      .select('*, series:series_id(*)')
      .order('name')
    
    if (data) {
      setCharacters(data)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contentSet) return
    
    console.log('[ContentEditor] Starting save operation...', {
      contentSetId: contentSet.id,
      formData,
      timestamp: new Date().toISOString()
    })
    
    setLoading(true)
    
    try {
      // Prepare update data
      const updateData: any = {
        id: contentSet.id,
        title: formData.title,
        description: formData.description || null,
        is_commission: formData.isCommission,
        tags: formData.tags
      }

      // Handle publishing/scheduling logic
      if (formData.published) {
        // Publishing immediately
        updateData.published_at = contentSet.published_at || new Date().toISOString()
        updateData.scheduled_time = null // Clear any scheduled time
      } else if (formData.scheduledTime) {
        // Scheduling for future
        const scheduledTimeUTC = new Date(formData.scheduledTime).toISOString()
        updateData.scheduled_time = scheduledTimeUTC
        updateData.published_at = null // Ensure not published
      } else {
        // Draft - neither published nor scheduled
        updateData.published_at = null
        updateData.scheduled_time = null
      }
      
      // Use API route for updating
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to update content set')
      }

      console.log('[ContentEditor] Content set updated successfully:', result)

      // Update character associations
      await supabase
        .from('set_characters')
        .delete()
        .eq('set_id', contentSet.id)
      
      if (formData.characterIds.length > 0) {
        const characterRelations = formData.characterIds.map((charId, index) => ({
          set_id: contentSet.id,
          character_id: charId,
          is_primary: index === 0
        }))
        
        await supabase
          .from('set_characters')
          .insert(characterRelations)
      }
      
      console.log('[ContentEditor] Save operation completed successfully')
      
      // Call onSave callback
      await onSave()
    } catch (error) {
      console.error('[ContentEditor] Save operation failed:', error)
      alert(`Failed to update content set: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handlePublishNow() {
    if (!contentSet) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: contentSet.id,
          published_at: new Date().toISOString(),
          scheduled_time: null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to publish')
      }

      await onSave()
    } catch (error) {
      console.error('[ContentEditor] Publish failed:', error)
      alert('Failed to publish content set')
    } finally {
      setLoading(false)
    }
  }

  if (!contentSet) return null

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
      <h3 className="text-xl font-semibold text-white mb-6">Edit Content Set</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            required
          />
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            rows={3}
          />
        </div>
        
        {/* Characters */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Characters
          </label>
          <select
            multiple
            value={formData.characterIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value)
              setFormData(prev => ({ ...prev, characterIds: selected }))
            }}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            size={5}
          >
            {characters.map(char => (
              <option key={char.id} value={char.id}>
                {char.name} ({(char as any).series?.name || 'No Series'})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
        </div>
        
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tags
          </label>
          <input
            type="text"
            placeholder="Comma separated tags..."
            value={formData.tags.join(', ')}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              setFormData(prev => ({ ...prev, tags }))
            }}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        
        {/* Publishing Options */}
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Publishing</h4>
          
          {/* Current Status */}
          <div className="text-sm text-gray-400 mb-3">
            Current status: {
              contentSet.published_at ? (
                <span className="text-green-400">Published</span>
              ) : contentSet.scheduled_time ? (
                <span className="text-blue-400">Scheduled for {new Date(contentSet.scheduled_time).toLocaleString()}</span>
              ) : (
                <span className="text-gray-400">Draft</span>
              )
            }
          </div>

          {/* Published checkbox */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
              className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">Published (visible to members)</span>
          </label>
          
          {/* Schedule Time - only show if not published */}
          {!formData.published && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schedule Time (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
            </div>
          )}

          {/* Quick publish button for drafts/scheduled */}
          {!contentSet.published_at && (
            <button
              type="button"
              onClick={handlePublishNow}
              disabled={loading}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Publish Now
            </button>
          )}
        </div>
        
        {/* Commission checkbox */}
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isCommission}
            onChange={(e) => setFormData(prev => ({ ...prev, isCommission: e.target.checked }))}
            className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">This is a commission</span>
        </label>
        
        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
