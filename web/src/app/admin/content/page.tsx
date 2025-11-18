// src/app/admin/content/page.tsx
"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentManager, ContentManagerRef } from '@/components/admin/content-manager'
import { ContentEditor } from '@/components/admin/content-editor'
import type { ContentSetWithRelations } from '@/types/database'
import { motion } from 'framer-motion'

export default function ContentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [editingSet, setEditingSet] = useState<ContentSetWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCheckingScheduled, setIsCheckingScheduled] = useState(false)
  const [lastScheduledCheck, setLastScheduledCheck] = useState<Date | null>(null)
  const [publishedCount, setPublishedCount] = useState<number | null>(null)
  const contentManagerRef = useRef<ContentManagerRef>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isCreator) {
      setLoading(false)
    } else if (status === 'unauthenticated') {
      router.push('/admin')
    }
  }, [status, session, router])

  // Check and publish scheduled posts on page load
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isCreator) {
      checkScheduledPosts()
    }
  }, [status, session])

  const checkScheduledPosts = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingScheduled) return
    
    setIsCheckingScheduled(true)
    setPublishedCount(null)
    
    try {
      const response = await fetch('/api/admin/publish-scheduled')
      const result = await response.json()
      console.log('[Content Page] Scheduled posts check:', result)
      
      setPublishedCount(result.publishedCount || 0)
      setLastScheduledCheck(new Date())
      
      // Reload content if any posts were published
      if (result.publishedCount > 0) {
        // Force refresh to bypass cache when posts are published
        await contentManagerRef.current?.loadContent()
      }
    } catch (error) {
      console.error('[Content Page] Failed to check scheduled posts:', error)
    } finally {
      setIsCheckingScheduled(false)
      // Clear the published count after 5 seconds
      setTimeout(() => setPublishedCount(null), 5000)
    }
  }, [isCheckingScheduled])

  const handleEdit = useCallback((set: ContentSetWithRelations) => {
    setEditingSet(set)
  }, [])

  const handleSave = useCallback(async () => {
    setEditingSet(null)
    // Force refresh after saving to bypass cache
    await contentManagerRef.current?.loadContent()
  }, [])

  const handleCancel = useCallback(() => {
    setEditingSet(null)
  }, [])

  const handleNewUpload = useCallback(() => {
    router.push('/admin/upload')
  }, [router])

  // Memoize the last check display
  const lastCheckDisplay = useMemo(() => {
    if (!lastScheduledCheck) return null
    
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastScheduledCheck.getTime()) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }, [lastScheduledCheck])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-purple-950/10 to-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 border-4 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full animate-pulse"></div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-purple-950/10 to-zinc-950">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Content Management</h1>
              <p className="text-gray-400">Manage your content sets, scheduling, and publishing</p>
              {lastCheckDisplay && (
                <p className="text-xs text-gray-500 mt-1">
                  Last scheduled check: {lastCheckDisplay}
                </p>
              )}
            </div>
            <div className="flex gap-4 items-center">
              {/* Published count notification */}
              {publishedCount !== null && publishedCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium"
                >
                  {publishedCount} post{publishedCount > 1 ? 's' : ''} published!
                </motion.div>
              )}
              
              <button
                onClick={checkScheduledPosts}
                disabled={isCheckingScheduled}
                className={`px-4 py-2 bg-slate-900/50 hover:bg-slate-900 text-gray-400 hover:text-white rounded-xl transition-all duration-200 border border-white/5 hover:border-white/10 ${
                  isCheckingScheduled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isCheckingScheduled ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking...
                  </span>
                ) : (
                  'Check Scheduled'
                )}
              </button>
              
              <button
                onClick={handleNewUpload}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-600/25"
              >
                + New Upload
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        {editingSet ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <ContentEditor
              contentSet={editingSet}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </motion.div>
        ) : (
          <ContentManager 
            ref={contentManagerRef}
            onEdit={handleEdit} 
          />
        )}
      </div>
    </div>
  )
}