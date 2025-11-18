// src/components/commission/SimplePreferences.tsx
"use client"

import { WeightSlider } from './WeightSlider'

interface SimplePreferencesProps {
  preferences: {
    portrait: number
    landscape: number
    product: number
    lifestyle: number
    creative: number
  }
  onChange: (preferences: {
    portrait: number
    landscape: number
    product: number
    lifestyle: number
    creative: number
  }) => void
}

export function SimplePreferences({ preferences, onChange }: SimplePreferencesProps) {
  const updatePreference = (key: string, value: number) => {
    onChange({
      ...preferences,
      [key]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* Photography Styles Section */}
      <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Photography Styles
        </h4>
        <div className="space-y-4">
          <WeightSlider
            label="Portrait"
            description="Control frequency of portrait and people photography"
            value={preferences.portrait}
            onChange={(value) => updatePreference('portrait', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Landscape"
            description="Control frequency of landscape and nature photography"
            value={preferences.landscape}
            onChange={(value) => updatePreference('landscape', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Product"
            description="Control frequency of product and commercial photography"
            value={preferences.product}
            onChange={(value) => updatePreference('product', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Lifestyle"
            description="Control frequency of lifestyle and documentary photography"
            value={preferences.lifestyle}
            onChange={(value) => updatePreference('lifestyle', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Creative"
            description="Control frequency of abstract and artistic photography"
            value={preferences.creative}
            onChange={(value) => updatePreference('creative', value)}
            max={200}
            showQuickButtons={false}
          />
        </div>
      </div>

      {/* Visual Indicator Summary */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-cyan-600/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Current Settings Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {Object.entries(preferences).map(([key, value]) => {
            const labels: Record<string, string> = {
              portrait: 'Portrait',
              landscape: 'Landscape',
              product: 'Product',
              lifestyle: 'Lifestyle',
              creative: 'Creative'
            }

            let status = 'Default'
            let color = 'text-gray-400'
            if (value === 0) {
              status = 'Excluded'
              color = 'text-cyan-400'
            } else if (value < 100) {
              status = 'Reduced'
              color = 'text-orange-400'
            } else if (value > 100) {
              status = 'Boosted'
              color = 'text-green-400'
            }

            return (
              <div key={key} className="flex justify-between items-center bg-zinc-800/50 rounded px-2 py-1">
                <span className="text-gray-400">{labels[key]}:</span>
                <span className={`font-medium ${color}`}>{status}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
