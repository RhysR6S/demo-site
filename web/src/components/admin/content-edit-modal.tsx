// src/components/admin/content-edit-modal.tsx
"use client"

import { useState } from 'react'
import { X, Save, Loader2, Plus } from 'lucide-react'
import type { ContentSetWithRelations } from '@/types/database'

interface ContentEditModalProps {
  contentSet: ContentSetWithRelations
  onClose: () => void
  onSave: (updated: ContentSetWithRelations) => void
}

export function ContentEditModal({ contentSet, onClose, onSave }: ContentEditModalProps) {
  const [formData, setFormData] = useState({
    title: contentSet.title,
    description: contentSet.description || '',
    tags: contentSet.tags || [],
    is_commission: contentSet.is_commission || false,
    published_at: contentSet.published_at,
    scheduled_time: contentSet.scheduled_time || ''
  })
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contentSet.id,
          ...formData
        })
      })

      if (!response.ok) throw new Error('Failed to update')
      
      const { data } = await response.json()
      onSave({ ...contentSet, ...data })
    } catch (error) {
      console.error('Update failed:', error)
      alert('Failed to update content set')
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">Edit Content Set</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-600"
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
              rows={3}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-600 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-600"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-zinc-800 rounded-lg text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Commission */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_commission}
                onChange={(e) => setFormData(prev => ({ ...prev, is_commission: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-600 bg-zinc-800 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">Mark as commission</span>
            </label>
          </div>

          {/* Characters & Series */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Characters
            </label>
            <div className="space-y-2">
              {contentSet.characters?.map((char, i) => (
                <div key={char.id} className="flex items-center gap-2 text-sm">
                  <span className="text-white">{char.name}</span>
                  {char.series && (
                    <span className="text-gray-400">({char.series.name})</span>
                  )}
                </div>
              ))}
              {(!contentSet.characters || contentSet.characters.length === 0) && (
                <p className="text-gray-500 text-sm">No characters assigned</p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Character management coming soon
            </p>
          </div>

          {/* Publishing */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Publishing Status
            </label>
            <select
              value={formData.published_at ? 'published' : formData.scheduled_time ? 'scheduled' : 'draft'}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'published') {
                  setFormData(prev => ({ 
                    ...prev, 
                    published_at: new Date().toISOString(),
                    scheduled_time: ''
                  }))
                } else if (value === 'draft') {
                  setFormData(prev => ({ 
                    ...prev, 
                    published_at: null,
                    scheduled_time: ''
                  }))
                }
              }}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-600"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Schedule Time */}
          {!formData.published_at && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schedule Time
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_time ? new Date(formData.scheduled_time).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  scheduled_time: e.target.value ? new Date(e.target.value).toISOString() : ''
                }))}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-600"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}