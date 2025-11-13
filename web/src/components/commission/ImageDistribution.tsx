// src/components/commission/ImageDistribution.tsx
"use client"

import { useEffect } from 'react'
import styles from './ImageDistribution.module.css'

interface ImageDistributionProps {
  distribution: {
    solo: number
    duo_ff: number
    duo_mf: number
    duo_mf_pov: number
    pov_ffm: number
    gangbang: number
  }
  onChange: (distribution: { 
    solo: number
    duo_ff: number
    duo_mf: number
    duo_mf_pov: number
    pov_ffm: number
    gangbang: number
  }) => void
  femaleCharacterCount: number
  maleEnabled?: boolean
}

export function ImageDistribution({ 
  distribution, 
  onChange, 
  femaleCharacterCount,
  maleEnabled = true  // Default to true since we always have generic males
}: ImageDistributionProps) {
  
  // Only disable duo_ff and pov_ffm if only one female character
  useEffect(() => {
    if (femaleCharacterCount === 1) {
      if (distribution.duo_ff !== 0 || distribution.pov_ffm !== 0) {
        onChange({
          ...distribution,
          duo_ff: 0,
          pov_ffm: 0
        })
      }
    }
  }, [femaleCharacterCount])

  const handleSliderChange = (type: keyof typeof distribution, value: number) => {
    // Prevent duo_ff and pov_ffm changes if only one character
    if ((type === 'duo_ff' || type === 'pov_ffm') && femaleCharacterCount === 1) {
      return
    }
    
    // Explicitly handle the value, ensuring 0 is preserved
    const newValue = Math.max(0, Math.min(300, value)) // Clamp between 0-300
    
    // Create new distribution with explicit value
    const newDistribution = {
      ...distribution,
      [type]: newValue
    }
    
    // Call onChange with the new distribution
    onChange(newDistribution)
  }

  const getSliderColor = (value: number) => {
    if (value === 0) return 'bg-red-500'
    if (value < 50) return 'bg-orange-500'
    if (value < 100) return 'bg-yellow-500'
    if (value === 100) return 'bg-gray-500'
    if (value <= 200) return 'bg-green-500'
    return 'bg-cyan-500'
  }

  const getTextColor = (value: number) => {
    if (value === 0) return 'text-red-500'
    if (value < 50) return 'text-orange-500'
    if (value < 100) return 'text-yellow-500'
    if (value === 100) return 'text-gray-500'
    if (value <= 200) return 'text-green-500'
    return 'text-cyan-500'
  }

  const renderSlider = (
    key: keyof typeof distribution,
    label: string,
    description: string,
    disabled: boolean = false,
    disabledReason?: string
  ) => {
    const value = distribution[key]
    const isDisabled = disabled || (disabledReason !== undefined)
    
    return (
      <div className={isDisabled ? 'opacity-50' : ''}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            {label}
            {disabledReason && (
              <span className="text-xs text-red-400 ml-2">({disabledReason})</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              isDisabled ? 'text-red-400' : getTextColor(value)
            }`}>
              {isDisabled ? 'N/A' : value === 0 ? 'Excluded' : `${value}%`}
            </span>
            {!isDisabled && (
              <input
                type="number"
                value={value}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0
                  handleSliderChange(key, val)
                }}
                className="w-16 px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-700 rounded focus:border-purple-500 focus:outline-none"
                min="0"
                max="300"
                step="10"
              />
            )}
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="300"
          step="10"
          value={isDisabled ? 0 : value}
          onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
          disabled={isDisabled}
          className={`w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${styles.slider}`}
          style={{
            background: isDisabled 
              ? 'rgb(39 39 42)' 
              : `linear-gradient(to right, ${getSliderColor(value)} 0%, ${getSliderColor(value)} ${value / 3}%, rgb(39 39 42) ${value / 3}%, rgb(39 39 42) 100%)`
          }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {description}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
        <p className="text-sm text-blue-300">
          <strong>Scene Type Control:</strong> This section controls the distribution of different image types in your set. 
          Set to 0% to exclude a type entirely, or increase beyond 100% to prioritize it.
        </p>
      </div>

      {/* Solo Images */}
      {renderSlider(
        'solo',
        'Solo Images',
        'Single character scenes'
      )}

      {/* Duo FF (2Girls) Images */}
      {renderSlider(
        'duo_ff',
        '2Girls (Duo FF) Images',
        'Two female characters together',
        femaleCharacterCount === 1,
        femaleCharacterCount === 1 ? 'Requires 2+ female characters' : undefined
      )}

      {/* Duo MF (Both Visible) Images - Always available */}
      {renderSlider(
        'duo_mf',
        '1Boy1Girl (Both Visible)',
        'Male and female both visible in scene (uses generic male if not specified)'
      )}

      {/* Duo MF POV Images - Always available */}
      {renderSlider(
        'duo_mf_pov',
        '1Boy1Girl (POV)',
        'Male POV perspective with female (uses generic male if not specified)'
      )}

      {/* POV FFM Images - Requires 2+ females */}
      {renderSlider(
        'pov_ffm',
        'POV FFM Threesome',
        'POV perspective with two females',
        femaleCharacterCount === 1,
        femaleCharacterCount === 1 ? 'Requires 2+ female characters' : undefined
      )}

      {/* Gangbang Images - Always available */}
      {renderSlider(
        'gangbang',
        'Gangbang',
        'Multiple partner scenes (uses generic males if not specified)'
      )}

      {/* Quick Preset Buttons */}
      <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg">
        <p className="text-xs font-semibold text-gray-400 mb-2">Quick Presets:</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange({ 
              solo: 100, 
              duo_ff: femaleCharacterCount > 1 ? 100 : 0, 
              duo_mf: maleEnabled ? 100 : 0, 
              duo_mf_pov: maleEnabled ? 50 : 0,
              pov_ffm: (femaleCharacterCount > 1 && maleEnabled) ? 0 : 0,
              gangbang: maleEnabled ? 0 : 0
            })}
            className="px-3 py-1.5 text-xs bg-zinc-800 text-gray-300 rounded hover:bg-zinc-700 transition-colors"
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => onChange({ 
              solo: 200, 
              duo_ff: femaleCharacterCount > 1 ? 50 : 0, 
              duo_mf: 0, 
              duo_mf_pov: 0,
              pov_ffm: 0,
              gangbang: 0
            })}
            className="px-3 py-1.5 text-xs bg-zinc-800 text-gray-300 rounded hover:bg-zinc-700 transition-colors"
          >
            Solo Focus
          </button>
          <button
            type="button"
            onClick={() => onChange({ 
              solo: 100, 
              duo_ff: 0, 
              duo_mf: 0, 
              duo_mf_pov: 0,
              pov_ffm: 0,
              gangbang: 0
            })}
            className="px-3 py-1.5 text-xs bg-zinc-800 text-gray-300 rounded hover:bg-zinc-700 transition-colors"
          >
            Solo Only
          </button>
        </div>
      </div>

      {/* Weight Guide */}
      <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg">
        <p className="text-xs font-semibold text-gray-400 mb-2">Weight Guide:</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-500">0% = Excluded</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-gray-500">100% = Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-500">200% = Preferred</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Higher values mean more images of that type will be generated. Set to 0% to completely exclude a type.
        </p>
      </div>
    </div>
  )
}
