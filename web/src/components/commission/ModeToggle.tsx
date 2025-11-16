// src/components/commission/ModeToggle.tsx
"use client"

interface ModeToggleProps {
  mode: 'simple' | 'advanced'
  onChange: (mode: 'simple' | 'advanced') => void
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Content Preferences Mode</h3>
        <div className="flex gap-2 bg-zinc-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => onChange('simple')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'simple' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Simple Mode
          </button>
          <button
            type="button"
            onClick={() => onChange('advanced')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'advanced' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Advanced Mode
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-400">
        {mode === 'simple' ? (
          <p>
            <span className="text-purple-400 font-medium">Simple Mode:</span> Quick and easy sliders for common preferences. 
            Perfect for most users who want to specify basic content preferences.
          </p>
        ) : (
          <p>
            <span className="text-purple-400 font-medium">Advanced Mode:</span> Full control over all content tags with precise weights. 
            Ideal for users who want detailed control over every aspect of their commission.
          </p>
        )}
      </div>
    </div>
  )
}