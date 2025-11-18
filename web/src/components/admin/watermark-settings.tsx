// src/components/admin/watermark-settings.tsx
"use client"

import { useState, useEffect } from 'react'
import { Upload, X, Eye, Settings, Move } from 'lucide-react'

interface WatermarkSettings {
  watermark_type: 'text' | 'image'
  watermark_image_r2_key?: string
  position: 'corner' | 'center' | 'diagonal' | 'custom'
  opacity: number
  scale: number
  enabled: boolean
  offset_x: number
  offset_y: number
}

export function WatermarkSettings({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<WatermarkSettings>({
    watermark_type: 'text',
    position: 'corner',
    opacity: 0.15,
    scale: 1.0,
    enabled: true,
    offset_x: 0,
    offset_y: 0
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sampleImageId, setSampleImageId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/watermark-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings({
            ...data.settings,
            offset_x: data.settings.offset_x || 0,
            offset_y: data.settings.offset_y || 0
          })
          if (data.settings.watermark_image_r2_key) {
            // Load preview
            const previewResponse = await fetch(`/api/admin/watermark-preview?key=${data.settings.watermark_image_r2_key}`)
            if (previewResponse.ok) {
              const blob = await previewResponse.blob()
              setPreviewUrl(URL.createObjectURL(blob))
            }
          }
        }
        // Set sample image ID for preview
        if (data.sampleImage) {
          setSampleImageId(data.sampleImage.id)
        }
      }
    } catch (error) {
      console.error('Failed to load watermark settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage({ type: 'error', text: 'Image must be less than 5MB' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Upload through API
      const response = await fetch('/api/admin/watermark-upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()

      // Update settings
      setSettings(prev => ({
        ...prev,
        watermark_type: 'image',
        watermark_image_r2_key: data.r2Key
      }))

      // Create preview
      setPreviewUrl(URL.createObjectURL(file))
      
      setMessage({ type: 'success', text: 'Watermark image uploaded successfully' })
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload watermark image' })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/watermark-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Watermark settings saved successfully' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: 'Failed to save watermark settings' })
    } finally {
      setSaving(false)
    }
  }

  const removeWatermarkImage = () => {
    setSettings(prev => ({
      ...prev,
      watermark_type: 'text',
      watermark_image_r2_key: undefined
    }))
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  // Round to 1 decimal place for display
  const formatOffset = (value: number) => value.toFixed(1)

  // Calculate watermark position based on settings
  const getWatermarkPosition = () => {
    const basePosition = 20 // Base padding in pixels
    let x = basePosition
    let y = basePosition

    switch (settings.position) {
      case 'corner':
        x = basePosition
        y = basePosition
        break
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${settings.offset_x}%, ${settings.offset_y}%)`
        }
      case 'diagonal':
        return {
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${settings.offset_x}%, ${settings.offset_y}%) rotate(-45deg)`
        }
      case 'custom':
        return {
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${settings.offset_x}%, ${settings.offset_y}%)`
        }
    }

    // Apply offsets (as percentage of container)
    return {
      left: `calc(${x}px + ${settings.offset_x}%)`,
      top: `calc(${y}px + ${settings.offset_y}%)`
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold text-white">Watermark Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable */}
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-600 bg-zinc-800 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-white font-medium">Enable Watermarks for Bronze Tier</span>
          </label>
          <p className="mt-2 text-sm text-gray-400">
            When enabled, Bronze tier members will see watermarks on images. Silver+ members always get clean images.
          </p>
        </div>

        {/* Watermark Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Watermark Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSettings(prev => ({ ...prev, watermark_type: 'text' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.watermark_type === 'text'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">ID</div>
                <div className="text-sm text-gray-400">Text-based ID watermark</div>
              </div>
            </button>
            
            <button
              onClick={() => setSettings(prev => ({ ...prev, watermark_type: 'image' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.watermark_type === 'image'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🖼️</div>
                <div className="text-sm text-gray-400">Custom image watermark</div>
              </div>
            </button>
          </div>
        </div>

        {/* Image Upload (only for image type) */}
        {settings.watermark_type === 'image' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Watermark Image
            </label>
            {!previewUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-400">Click to upload watermark</span>
                <span className="text-xs text-gray-500 mt-1">PNG recommended, max 5MB</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Watermark preview"
                  className="max-h-32 rounded-lg"
                />
                <button
                  onClick={removeWatermarkImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Position
          </label>
          <div className="grid grid-cols-4 gap-3">
            {(['corner', 'center', 'diagonal', 'custom'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setSettings(prev => ({ ...prev, position: pos }))}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  settings.position === pos
                    ? 'border-purple-500 bg-purple-500/10 text-cyan-400'
                    : 'border-zinc-700 hover:border-zinc-600 text-gray-300'
                }`}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Position Controls with decimal precision */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Move className="w-4 h-4" />
              Horizontal Position: {formatOffset(settings.offset_x)}%
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              step="0.1"
              value={settings.offset_x}
              onChange={(e) => setSettings(prev => ({ ...prev, offset_x: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Left</span>
              <span>Center</span>
              <span>Right</span>
            </div>
            {/* Fine-tune input */}
            <input
              type="number"
              min="-50"
              max="50"
              step="0.1"
              value={settings.offset_x}
              onChange={(e) => setSettings(prev => ({ ...prev, offset_x: parseFloat(e.target.value) || 0 }))}
              className="mt-2 w-24 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Move className="w-4 h-4" />
              Vertical Position: {formatOffset(settings.offset_y)}%
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              step="0.1"
              value={settings.offset_y}
              onChange={(e) => setSettings(prev => ({ ...prev, offset_y: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Top</span>
              <span>Center</span>
              <span>Bottom</span>
            </div>
            {/* Fine-tune input */}
            <input
              type="number"
              min="-50"
              max="50"
              step="0.1"
              value={settings.offset_y}
              onChange={(e) => setSettings(prev => ({ ...prev, offset_y: parseFloat(e.target.value) || 0 }))}
              className="mt-2 w-24 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Opacity: {Math.round(settings.opacity * 100)}%
          </label>
          <input
            type="range"
            min="5"
            max="100"
            value={settings.opacity * 100}
            onChange={(e) => setSettings(prev => ({ ...prev, opacity: Number(e.target.value) / 100 }))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5% (Subtle)</span>
            <span>100% (Prominent)</span>
          </div>
        </div>

        {/* Scale */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Size: {Math.round(settings.scale * 100)}%
          </label>
          <input
            type="range"
            min="50"
            max="1000"
            step="10"
            value={settings.scale * 100}
            onChange={(e) => setSettings(prev => ({ ...prev, scale: Number(e.target.value) / 100 }))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50% (Small)</span>
            <span>1000% (Large)</span>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-400">Preview</h3>
          </div>
          <div className="relative bg-black rounded-lg overflow-hidden inline-block">
            {sampleImageId ? (
              <img
                src={`/api/image/${sampleImageId}`}
                alt="Sample"
                className="max-w-full max-h-96 object-contain"
              />
            ) : (
              <img
                src="/api/placeholder/960/1088"
                alt="Sample"
                className="max-w-full max-h-96 object-contain"
              />
            )}
            
            {/* ID watermark preview (always shown in top-right) */}
            <div 
              className="absolute top-4 right-4 text-white font-medium"
              style={{ 
                fontSize: '14px', 
                opacity: 0.15,
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              ID: 178987343
            </div>
            
            {/* Custom watermark preview (only for Bronze tier) */}
            {settings.watermark_type === 'image' && previewUrl && (
              <div
                className="absolute"
                style={getWatermarkPosition()}
              >
                <img
                  src={previewUrl}
                  alt="Watermark"
                  style={{ 
                    width: `${100 * settings.scale}px`,
                    maxWidth: '300px',
                    opacity: settings.opacity
                  }}
                />
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            This is how Bronze tier members will see watermarked images
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-600/10 border border-green-600/20 text-green-400'
              : 'bg-sky-600/10 border border-sky-600/20 text-sky-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #a855f7;
          cursor: pointer;
          border-radius: 50%;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #a855f7;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  )
}