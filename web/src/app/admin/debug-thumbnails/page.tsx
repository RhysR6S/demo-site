// src/app/admin/debug-thumbnails/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugThumbnailsPage() {
  const [contentSets, setContentSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [r2Config, setR2Config] = useState<any>(null)

  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-bold mb-4">Not Available</h1>
        <p className="text-gray-400">This debug page is only available in development mode.</p>
      </div>
    )
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

  async function loadDebugInfo() {
    try {
      // Check R2 configuration
      const configRes = await fetch('/api/admin/check-images')
      const config = await configRes.json()
      setR2Config(config)

      // Get content sets with images
      const { data: sets, error } = await supabase
        .from('content_sets')
        .select(`
          id,
          title,
          slug,
          thumbnail_image_id,
          images (
            id,
            filename,
            r2_key,
            order_index
          )
        `)
        .limit(5)

      if (error) {
        console.error('Error loading sets:', error)
      } else {
        setContentSets(sets || [])
      }
    } catch (error) {
      console.error('Debug load error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function testThumbnailAPI(imageId: string) {
    try {
      console.log(`Testing thumbnail API for image: ${imageId}`)
      const response = await fetch(`/api/thumbnail/${imageId}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Thumbnail API error:', error)
        alert(`API Error: ${JSON.stringify(error)}`)
      } else {
        console.log('Thumbnail API success:', response.status)
        alert('Thumbnail API returned successfully!')
      }
    } catch (error) {
      console.error('Test error:', error)
      alert(`Test failed: ${error}`)
    }
  }

  async function testDirectR2URL(r2Key: string) {
    const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL
    if (!publicUrl) {
      alert('No public URL configured')
      return
    }

    const directUrl = `${publicUrl}/${r2Key}`
    console.log('Testing direct R2 URL:', directUrl)
    
    try {
      const response = await fetch(directUrl, { mode: 'cors' })
      if (response.ok) {
        alert(`Direct R2 access works! Status: ${response.status}`)
      } else {
        alert(`Direct R2 access failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      alert(`Direct R2 access error: ${error}`)
    }
  }

  if (loading) {
    return <div className="p-8 text-white">Loading debug info...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Thumbnail Debug Page</h1>

      {/* R2 Configuration */}
      <div className="bg-zinc-900 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">R2 Configuration</h2>
        {r2Config && (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Public URL:</span>{' '}
              <span className={r2Config.r2Config?.publicUrl?.includes('NOT SET') ? 'text-red-400' : 'text-green-400'}>
                {r2Config.r2Config?.publicUrl}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Images with R2 key:</span>{' '}
              <span className="text-white">{r2Config.imagesWithR2Key} / {r2Config.totalImagesChecked}</span>
            </div>
            {r2Config.recommendation && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded text-yellow-300 text-xs">
                {r2Config.recommendation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Sets */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Content Sets</h2>
        {contentSets.map(set => (
          <div key={set.id} className="bg-zinc-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-2">{set.title}</h3>
            <div className="text-sm text-gray-400 mb-4">
              <div>ID: {set.id}</div>
              <div>Slug: {set.slug}</div>
              <div>Thumbnail ID: {set.thumbnail_image_id || 'None'}</div>
              <div>Images: {set.images?.length || 0}</div>
            </div>

            {/* Images */}
            {set.images && set.images.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white">Images:</h4>
                {set.images.slice(0, 3).map((image: any) => (
                  <div key={image.id} className="bg-zinc-800 rounded p-3">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Image ID: {image.id}</div>
                      <div>Filename: {image.filename}</div>
                      <div className={`${!image.r2_key ? 'text-red-400' : ''}`}>
                        R2 Key: {image.r2_key || 'MISSING'}
                      </div>
                    </div>
                    
                    {image.r2_key && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => testThumbnailAPI(image.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                        >
                          Test API Route
                        </button>
                        <button
                          onClick={() => testDirectR2URL(image.r2_key)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                        >
                          Test Direct R2
                        </button>
                      </div>
                    )}

                    {/* Try to display thumbnail */}
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-1">Thumbnail Preview:</p>
                      <div className="w-24 h-32 bg-zinc-700 rounded overflow-hidden">
                        <img
                          src={`/api/thumbnail/${image.id}`}
                          alt="Test"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image load error for:', image.id, e)
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPkVycm9yPC90ZXh0Pjwvc3ZnPg=='
                          }}
                          onLoad={() => console.log('Image loaded successfully:', image.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Public URL Test */}
      <div className="mt-6 p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Test Public URL Access</h3>
        <p className="text-xs text-gray-400 mb-3">
          Your public URL: {process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}
        </p>
        <a
          href={process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
        >
          Open R2 Public URL
        </a>
      </div>
    </div>
  )
}