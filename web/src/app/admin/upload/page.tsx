// src/app/admin/upload/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { ContentUpload } from '@/components/content-upload'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface RecentUpload {
  id: string
  title: string
  imageCount: number
  uploadedAt: string
  status: 'processing' | 'complete' | 'failed'
}

interface UploadTip {
  icon: React.ReactNode
  title: string
  description: string
}

interface StorageStats {
  storage: {
    used: number
    limit: number
    percentage: number
  }
  stats: {
    totalSets: number
    totalImages: number
  }
}

export default function UploadPage() {
  const { isCreator, isLoading } = useAdminAuth()
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (isCreator && !isLoading) {
      loadRecentUploads()
      loadStorageStats()
    }
  }, [isCreator, isLoading])

  const loadRecentUploads = async () => {
    try {
      const { data: sets } = await supabase
        .from('content_sets')
        .select('id, title, image_count, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (sets) {
        setRecentUploads(sets.map(set => ({
          id: set.id,
          title: set.title,
          imageCount: set.image_count,
          uploadedAt: set.created_at,
          status: 'complete' as const
        })))
      }
    } catch (error) {
      console.error('Failed to load recent uploads:', error)
    } finally {
      setLoadingRecent(false)
    }
  }

  const loadStorageStats = async () => {
    try {
      const response = await fetch('/api/admin/storage-stats')
      if (response.ok) {
        const data = await response.json()
        setStorageStats(data)
      }
    } catch (error) {
      console.error('Failed to load storage stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const uploadTips: UploadTip[] = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Image Quality',
      description: 'Upload high-resolution images (2000px+) for the best viewing experience'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      title: 'Smart Tagging',
      description: 'Add relevant tags to improve discoverability and organization'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Schedule Ahead',
      description: 'Plan your content calendar by scheduling posts in advance'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Watermark Protection',
      description: 'Images are automatically watermarked to protect your content'
    }
  ]

  if (isLoading || !isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-20 h-20 border-4 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full animate-pulse"></div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Upload Content
          </h1>
          <p className="text-gray-400 text-lg">
            Add new photo sets to your gallery with smart organization
          </p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main upload area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <ContentUpload />
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Recent uploads */}
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Uploads
              </h3>
              
              {loadingRecent ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-zinc-800/50 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : recentUploads.length > 0 ? (
                <div className="space-y-3">
                  {recentUploads.map((upload, index) => (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl hover:bg-slate-900 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {upload.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {upload.imageCount} images • {new Date(upload.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-3 ${
                        upload.status === 'complete' ? 'bg-green-500' :
                        upload.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                        'bg-sky-500'
                      }`} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent uploads
                </p>
              )}
            </div>

            {/* Upload tips */}
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pro Tips
              </h3>
              
              <div className="space-y-4">
                {uploadTips.map((tip, index) => (
                  <motion.div
                    key={tip.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex gap-3"
                  >
                    <div className="w-10 h-10 bg-purple-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400">{tip.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">{tip.title}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{tip.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-600/20">
              <h3 className="text-lg font-semibold text-white mb-4">Storage Usage</h3>
              
              {loadingStats ? (
                <div className="space-y-3">
                  <div className="animate-pulse">
                    <div className="h-4 bg-zinc-800/50 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-zinc-800/50 rounded" />
                  </div>
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="h-4 bg-zinc-800/50 rounded w-1/2" />
                    <div className="h-4 bg-zinc-800/50 rounded w-1/2" />
                  </div>
                </div>
              ) : storageStats ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Used</span>
                      <span className="text-white font-medium">
                        {storageStats.storage.used.toFixed(2)} GB / {storageStats.storage.limit} GB
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(storageStats.storage.percentage, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total uploads</span>
                      <span className="text-white font-medium">
                        {storageStats.stats.totalSets.toLocaleString()} sets
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-400">Total images</span>
                      <span className="text-white font-medium">
                        {storageStats.stats.totalImages.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  Failed to load storage stats
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}