// src/components/commission/WeightSlider.tsx
"use client"

import { useState } from 'react'
import { getWeightColor, getWeightBgColor } from '@/app/commissions/constants'

interface WeightSliderProps {
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  showQuickButtons?: boolean
}

export function WeightSlider({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 500,
  step = 10,
  showQuickButtons = true
}: WeightSliderProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const getSliderBackground = () => {
    const percentage = ((value - min) / (max - min)) * 100
    let color = 'rgb(239 68 68)' // red
    
    if (value === 0) {
      color = 'rgb(239 68 68)' // red
    } else if (value < 100) {
      color = 'rgb(249 115 22)' // orange
    } else if (value === 100) {
      color = 'rgb(156 163 175)' // gray
    } else if (value <= 200) {
      color = 'rgb(34 197 94)' // green
    } else {
      color = 'rgb(6 182 212)' // cyan
    }
    
    return `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, rgb(39 39 42) ${percentage}%, rgb(39 39 42) 100%)`
  }

  const getWeightLabel = () => {
    if (value === 0) return 'Excluded'
    if (value < 100) return 'Reduced'
    if (value === 100) return 'Default'
    if (value <= 200) return 'Boosted'
    return 'Highly Boosted'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {description && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-500 hover:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {showTooltip && (
                <div className="absolute z-10 w-64 p-2 mt-2 text-xs text-gray-300 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg left-0">
                  {description}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${getWeightColor(value)}`}>
            {getWeightLabel()}
          </span>
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const newValue = e.target.value === '' ? 0 : parseInt(e.target.value)
              if (!isNaN(newValue)) {
                onChange(Math.max(min, Math.min(max, newValue)))
              }
            }}
            className="w-16 px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-700 rounded focus:border-purple-500 focus:outline-none"
            min={min}
            max={max}
            step={step}
          />
        </div>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider-custom"
          style={{ background: getSliderBackground() }}
        />
      </div>
      
      {showQuickButtons && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(0)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              value === 0 
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' 
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Exclude
          </button>
          <button
            type="button"
            onClick={() => onChange(100)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              value === 100 
                ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50' 
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => onChange(200)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              value === 200 
                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Boost 2x
          </button>
        </div>
      )}
    </div>
  )
}