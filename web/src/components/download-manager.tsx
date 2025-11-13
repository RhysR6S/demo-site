// components/download-manager.tsx
"use client"

import React, { useState, useEffect, createContext, useContext } from 'react'
import { Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const DownloadContext = createContext<{
  downloads: Map<string, DownloadTask>
  startDownload: (setId: string, setTitle: string) => void
  cancelDownload: (setId: string) => void
  removeDownload: (setId: string) => void
}>({
  downloads: new Map(),
  startDownload: () => {},
  cancelDownload: () => {},
  removeDownload: () => {}
})

interface DownloadTask {
  id: string
  title: string
  progress: number
  total: number
  status: 'preparing' | 'downloading' | 'completed' | 'failed'
  error?: string
  blob?: Blob
  controller?: AbortController
  percentage?: number
  sizeMB?: string
  startTime?: number
}

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Map<string, DownloadTask>>(new Map())

  const startDownload = async (setId: string, setTitle: string) => {
    if (downloads.has(setId)) {
      const existing = downloads.get(setId)!
      if (existing.status === 'downloading' || existing.status === 'preparing') {
        return
      }
    }

    const controller = new AbortController()
    const startTime = Date.now()
    
    setDownloads(prev => new Map(prev).set(setId, {
      id: setId,
      title: setTitle,
      progress: 0,
      total: 0,
      status: 'preparing',
      controller,
      startTime
    }))

    try {
      // Get download info first for size estimation
      const infoResponse = await fetch(`/api/download/set/${setId}/info`)
      let estimatedSize = 0
      
      if (infoResponse.ok) {
        const info = await infoResponse.json()
        estimatedSize = info.estimatedZipSize || 0
        
        setDownloads(prev => {
          const map = new Map(prev)
          const task = map.get(setId)!
          task.total = estimatedSize
          task.sizeMB = info.estimatedZipSizeMB
          return map
        })
      }

      // Start download with streaming endpoint
      const response = await fetch(`/api/download/set/${setId}/download-zip-stream`, {
        method: 'GET',
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Update status to downloading
      setDownloads(prev => {
        const map = new Map(prev)
        const task = map.get(setId)!
        task.status = 'downloading'
        return map
      })

      // Read stream with progress tracking
      const reader = response.body!.getReader()
      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        receivedLength += value.length

        // Update progress
        setDownloads(prev => {
          const map = new Map(prev)
          const task = map.get(setId)!
          task.progress = receivedLength
          
          // Calculate percentage based on estimated size
          if (estimatedSize > 0) {
            task.percentage = Math.min(99, Math.round((receivedLength / estimatedSize) * 100))
          } else {
            // If no size estimate, show progress based on time (fake progress)
            const elapsed = Date.now() - task.startTime!
            task.percentage = Math.min(99, Math.round(elapsed / 1000)) // 1% per second
          }
          
          return map
        })
      }

      // Create blob from chunks
      const blob = new Blob(chunks, { type: 'application/zip' })
      
      // Mark as completed
      setDownloads(prev => {
        const map = new Map(prev)
        const task = map.get(setId)!
        task.status = 'completed'
        task.blob = blob
        task.progress = blob.size
        task.total = blob.size
        task.percentage = 100
        task.sizeMB = (blob.size / (1024 * 1024)).toFixed(1) + ' MB'
        return map
      })

      // Auto-download the file
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${setTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up URL after slight delay
      setTimeout(() => URL.revokeObjectURL(url), 100)

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setDownloads(prev => {
          const map = new Map(prev)
          map.delete(setId)
          return map
        })
      } else {
        setDownloads(prev => {
          const map = new Map(prev)
          const task = map.get(setId)
          if (task) {
            task.status = 'failed'
            task.error = error.message || 'Download failed'
          }
          return map
        })
      }
    }
  }

  const cancelDownload = (setId: string) => {
    const task = downloads.get(setId)
    if (task?.controller) {
      task.controller.abort()
    }
  }

  const removeDownload = (setId: string) => {
    setDownloads(prev => {
      const map = new Map(prev)
      map.delete(setId)
      return map
    })
  }

  return (
    <DownloadContext.Provider value={{ downloads, startDownload, cancelDownload, removeDownload }}>
      {children}
      <DownloadManager />
    </DownloadContext.Provider>
  )
}

function DownloadManager() {
  const { downloads, cancelDownload, removeDownload } = useContext(DownloadContext)
  const [isMinimized, setIsMinimized] = useState(false)
  
  const activeDownloads = Array.from(downloads.values())
  
  if (activeDownloads.length === 0) return null

  return (
    <div className={`fixed bottom-4 right-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl transition-all ${
      isMinimized ? 'w-64' : 'w-96'
    } z-50`}>
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Download className="w-4 h-4" />
          Downloads ({activeDownloads.length})
        </h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      {!isMinimized && (
        <div className="max-h-80 overflow-y-auto">
          {activeDownloads.map(task => (
            <DownloadItem 
              key={task.id}
              task={task}
              onCancel={() => cancelDownload(task.id)}
              onRemove={() => removeDownload(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DownloadItem({ 
  task, 
  onCancel, 
  onRemove 
}: { 
  task: DownloadTask
  onCancel: () => void
  onRemove: () => void
}) {
  const percentage = task.percentage || 0
  const progressMB = task.progress > 0 ? (task.progress / (1024 * 1024)).toFixed(1) : '0'
  const totalMB = task.sizeMB || 'Calculating...'

  return (
    <div className="p-4 border-b border-zinc-800 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">
            {task.title}
          </h4>
          <p className="text-xs text-gray-400">
            {task.status === 'preparing' && 'Starting download...'}
            {task.status === 'downloading' && (
              task.total > 0 
                ? `${progressMB} / ${totalMB}`
                : `${progressMB} MB downloaded`
            )}
            {task.status === 'completed' && `Download complete (${totalMB})`}
            {task.status === 'failed' && (task.error || 'Download failed')}
          </p>
        </div>
        
        <button
          onClick={task.status === 'completed' || task.status === 'failed' ? onRemove : onCancel}
          className="ml-2 text-gray-400 hover:text-white transition-colors"
          title={task.status === 'completed' || task.status === 'failed' ? 'Remove' : 'Cancel'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {(task.status === 'downloading' || task.status === 'preparing') && (
        <div className="relative w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Status icon and percentage */}
      <div className="flex items-center gap-2 mt-2">
        {task.status === 'preparing' && (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        )}
        {task.status === 'downloading' && (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        )}
        {task.status === 'completed' && (
          <CheckCircle className="w-4 h-4 text-green-400" />
        )}
        {task.status === 'failed' && (
          <AlertCircle className="w-4 h-4 text-red-400" />
        )}
        <span className="text-xs text-gray-400">
          {percentage > 0 && percentage < 100 && `${percentage}%`}
        </span>
      </div>
    </div>
  )
}

export function BackgroundDownloadButton({ 
  setId, 
  setTitle,
  compact = false 
}: { 
  setId: string
  setTitle: string
  compact?: boolean 
}) {
  const { downloads, startDownload } = useContext(DownloadContext)
  const currentDownload = downloads.get(setId)
  const isDownloading = currentDownload?.status === 'downloading' || currentDownload?.status === 'preparing'

  if (compact) {
    return (
      <button
        onClick={() => startDownload(setId, setTitle)}
        disabled={isDownloading}
        className={`p-1.5 rounded-md transition-colors ${
          isDownloading 
            ? 'bg-gray-700 cursor-not-allowed' 
            : 'bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white'
        }`}
        title={isDownloading ? 'Downloading...' : 'Download'}
      >
        {isDownloading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => startDownload(setId, setTitle)}
      disabled={isDownloading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isDownloading 
          ? 'bg-gray-300 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isDownloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {isDownloading ? 'Downloading...' : 'Download'}
    </button>
  )
}

export function useDownloads() {
  return useContext(DownloadContext)
}
