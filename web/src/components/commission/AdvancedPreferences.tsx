// src/components/commission/AdvancedPreferences.tsx
"use client"

import { useState } from 'react'
import { WeightSlider } from './WeightSlider'
import { PHOTO_REQUEST_CATEGORIES, PRESET_CONFIGS, getWeightColor } from '@/app/commissions/constants'

interface AdvancedPreferencesProps {
  poseWeights: Record<string, number>
  onChange: (weights: Record<string, number>) => void
}

export function AdvancedPreferences({ poseWeights, onChange }: AdvancedPreferencesProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Perspective'])
  const [selectedPreset, setSelectedPreset] = useState<string>('custom')

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    )
  }

  const updateWeight = (key: string, value: number) => {
    onChange({
      ...poseWeights,
      [key]: value
    })
    setSelectedPreset('custom')
  }

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_CONFIGS[presetKey as keyof typeof PRESET_CONFIGS]
    if (preset) {
      const newWeights = { ...poseWeights }
      Object.entries(preset.weights).forEach(([key, value]) => {
        newWeights[key] = value
      })
      onChange(newWeights)
      setSelectedPreset(presetKey)
    }
  }

  const setCategoryWeights = (categoryName: string, value: number) => {
    const category = PHOTO_REQUEST_CATEGORIES.find(c => c.name === categoryName)
    if (category) {
      const newWeights = { ...poseWeights }
      category.tags.forEach(tag => {
        newWeights[tag.key] = value
      })
      onChange(newWeights)
      setSelectedPreset('custom')
    }
  }

  const resetCategory = (categoryName: string) => {
    setCategoryWeights(categoryName, 100)
  }

  const getModifiedCount = () => {
    return Object.values(poseWeights).filter(w => w !== 100).length
  }

  return (
    <div className="space-y-6">
      {/* Preset Manager */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-cyan-600/30 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-white mb-3">Quick Presets</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(PRESET_CONFIGS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`p-3 rounded-lg border transition-all ${
                selectedPreset === key
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <div className="text-left">
                <div className="font-medium text-white text-sm">{preset.name}</div>
                <div className="text-xs text-gray-400 mt-1">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>
        
        {/* Modified Tags Counter */}
        {getModifiedCount() > 0 && (
          <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                <span className="text-cyan-400 font-medium">{getModifiedCount()}</span> tags modified from default
              </span>
              <button
                type="button"
                onClick={() => {
                  const defaultWeights: Record<string, number> = {}
                  PHOTO_REQUEST_CATEGORIES.forEach(cat => {
                    cat.tags.forEach(tag => {
                      defaultWeights[tag.key] = 100
                    })
                  })
                  onChange(defaultWeights)
                  setSelectedPreset('custom')
                }}
                className="text-xs text-cyan-400 hover:text-purple-300"
              >
                Reset All to Default
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Sections */}
      {PHOTO_REQUEST_CATEGORIES.map((category) => (
        <div key={category.name} className="bg-slate-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          {/* Category Header */}
          <button
            type="button"
            onClick={() => toggleCategory(category.name)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedCategories.includes(category.name) ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-white">{category.name}</h4>
                <p className="text-xs text-gray-400">{category.description}</p>
              </div>
            </div>
            
            {/* Category Actions */}
            <div className="flex items-center gap-2">
              {/* Modified Count Badge */}
              {Object.entries(poseWeights)
                .filter(([key]) => category.tags.some(tag => tag.key === key))
                .filter(([_, value]) => value !== 100).length > 0 && (
                <span className="px-2 py-1 bg-purple-500/20 text-cyan-400 text-xs rounded-full">
                  {Object.entries(poseWeights)
                    .filter(([key]) => category.tags.some(tag => tag.key === key))
                    .filter(([_, value]) => value !== 100).length} modified
                </span>
              )}
              
              {/* Quick Actions */}
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setCategoryWeights(category.name, 0)}
                  className="px-2 py-1 text-xs bg-sky-500/20 text-sky-400 rounded hover:bg-sky-500/30"
                  title="Disable all in category"
                >
                  Disable
                </button>
                <button
                  type="button"
                  onClick={() => resetCategory(category.name)}
                  className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"
                  title="Reset category to default"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryWeights(category.name, 200)}
                  className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                  title="Boost all in category"
                >
                  Boost
                </button>
              </div>
            </div>
          </button>
          
          {/* Category Content */}
          {expandedCategories.includes(category.name) && (
            <div className="px-6 pb-6 space-y-4 border-t border-zinc-800 pt-4">
              {category.tags.map((tag) => (
                <WeightSlider
                  key={tag.key}
                  label={tag.label}
                  description={tag.description}
                  value={poseWeights[tag.key] ?? 100}
                  onChange={(value) => updateWeight(tag.key, value)}
                  max={300}
                  showQuickButtons={true}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Weight Guide */}
      <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Weight Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-sky-500 rounded"></div>
            <span className="text-gray-400">0% = Excluded</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-400">1-99% = Reduced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-gray-400">100% = Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-400">101-200% = Boosted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
            <span className="text-gray-400">201%+ = Heavily Boosted</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Weights determine how frequently each photography style appears in your collection. Higher weights mean more photos of that style.
        </p>
      </div>
    </div>
  )
}