// src/components/commission/SimplePreferences.tsx
"use client"

import { WeightSlider } from './WeightSlider'

interface SimplePreferencesProps {
  preferences: {
    vaginal: number
    anal: number
    oral: number
    handjobTitjob: number
    masturbation: number
    // REMOVED: povSex and nonPovSex
  }
  onChange: (preferences: {
    vaginal: number
    anal: number
    oral: number
    handjobTitjob: number
    masturbation: number
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
      {/* Sexual Acts Section */}
      <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Sexual Acts
        </h4>
        <div className="space-y-4">
          <WeightSlider
            label="Vaginal"
            description="Control frequency of vaginal sex scenes"
            value={preferences.vaginal}
            onChange={(value) => updatePreference('vaginal', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Anal"
            description="Control frequency of anal sex scenes"
            value={preferences.anal}
            onChange={(value) => updatePreference('anal', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Oral"
            description="Control frequency of oral sex scenes (both giving and receiving)"
            value={preferences.oral}
            onChange={(value) => updatePreference('oral', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Handjob/Titjob"
            description="Control frequency of manual and breast stimulation scenes"
            value={preferences.handjobTitjob}
            onChange={(value) => updatePreference('handjobTitjob', value)}
            max={200}
            showQuickButtons={false}
          />
          <WeightSlider
            label="Masturbation"
            description="Control frequency of self-pleasure scenes"
            value={preferences.masturbation}
            onChange={(value) => updatePreference('masturbation', value)}
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
              vaginal: 'Vaginal',
              anal: 'Anal',
              oral: 'Oral',
              handjobTitjob: 'Hand/Tit',
              masturbation: 'Masturbation',
              povSex: 'POV',
              nonPovSex: 'Non-POV'
            }
            
            let status = 'Default'
            let color = 'text-gray-400'
            if (value === 0) {
              status = 'Excluded'
              color = 'text-sky-400'
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