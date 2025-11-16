// src/app/sets/[slug]/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { MainLayout } from "@/components/main-layout"
import { AuthWrapper } from "@/components/auth-wrapper"
import { BackgroundDownloadButton } from "@/components/download-manager"
import { FavoriteButton } from "@/components/favorite-button"
import { Comments } from "@/components/comments"
import { ImageGallery } from "@/components/image-gallery"
import { useMobileContext } from '@/providers/mobile-provider'
import Link from "next/link"
import { ArrowLeft, Calendar, Eye, Download, Tag, Share2, MoreVertical, Heart, Users, Clock } from "lucide-react"
import type { ContentSetWithRelations } from "@/types/database"
import { motion, AnimatePresence } from "framer-motion"

function SetContent() {
  const params = useParams()
  const slug = params.slug as string
  const { data: session } = useSession()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  
  const [contentSet, setContentSet] = useState<ContentSetWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userHasViewed, setUserHasViewed] = useState(false)
  const [userHasDownloaded, setUserHasDownloaded] = useState(false)
  const [userHasLiked, setUserHasLiked] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Memoize session user ID
  const userId = useMemo(() => session?.user?.id, [session?.user?.id])

  // Listen for favorite toggle events
  useEffect(() => {
    const handleFavoriteToggle = (event: CustomEvent) => {
      if (contentSet && event.detail.setId === contentSet.id) {
        setUserHasLiked(event.detail.isFavorited)
      }
    }

    window.addEventListener('favorite-toggled', handleFavoriteToggle as EventListener)
    return () => {
      window.removeEventListener('favorite-toggled', handleFavoriteToggle as EventListener)
    }
  }, [contentSet])

  // Fetch content set data
  useEffect(() => {
    if (!slug || !userId || hasFetched) return

    async function fetchContentSet() {
      try {
        setLoading(true)
        const response = await fetch(`/api/sets/${slug}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch content')
        }
        
        const data = await response.json()
        setContentSet(data.contentSet)
        setUserHasViewed(data.userHasViewed)
        setUserHasDownloaded(data.userHasDownloaded)
        setUserHasLiked(data.userHasLiked)
        setHasFetched(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchContentSet()
  }, [slug, userId, hasFetched])

  // Reset fetch status when slug changes
  useEffect(() => {
    setHasFetched(false)
    setContentSet(null)
    setError(null)
  }, [slug])

  // Prevent refetch on tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Prevent automatic refetch on tab visibility change
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Handle share functionality
  const handleShare = async () => {
    if (navigator.share && contentSet) {
      try {
        await navigator.share({
          title: contentSet.title,
          text: contentSet.description || `Check out ${contentSet.title}`,
          url: window.location.href
        })
      } catch (error) {
        // User cancelled or share failed
      }
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading content...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !contentSet) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Content not found'}</p>
            <Link 
              href="/gallery" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Return to Gallery
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <MainLayout>
      <div className="min-h-screen max-w-screen overflow-x-hidden">
        {/* Enhanced Mobile Header */}
        <div className="border-b border-white/10 sticky top-0 bg-black/95 backdrop-blur-xl z-40 w-full">
          <div className={`${isSmallScreen ? 'px-3 safe-area-inset-x' : 'max-w-7xl mx-auto px-6'} ${isSmallScreen ? 'py-3' : 'py-4'}`}>
            <div className="flex items-center justify-between gap-3">
              {/* Back Button - Enhanced for mobile */}
              <Link 
                href="/gallery" 
                className={`flex items-center gap-2 text-gray-400 hover:text-white transition-colors ${
                  isSmallScreen ? 'p-2 -m-2 rounded-lg active:bg-white/10' : ''
                }`}
              >
                <ArrowLeft className={`${isSmallScreen ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                {!isSmallScreen && <span>Back to Gallery</span>}
              </Link>
              
              {/* Desktop Actions */}
              {!isSmallScreen ? (
                <div className="flex items-center gap-4 flex-shrink-0">
                  <FavoriteButton
                    setId={contentSet.id}
                    initialFavorited={userHasLiked}
                    showCount={true}
                    count={contentSet.like_count || 0}
                    size="md"
                  />
                  <BackgroundDownloadButton
                    setId={contentSet.id}
                    setTitle={contentSet.title}
                  />
                </div>
              ) : (
                // Mobile Actions - Download button now visible
                <div className="flex items-center gap-1 flex-shrink-0">
                  <FavoriteButton
                    setId={contentSet.id}
                    initialFavorited={userHasLiked}
                    showCount={false}
                    count={contentSet.like_count || 0}
                    size="sm"
                  />
                  <BackgroundDownloadButton
                    setId={contentSet.id}
                    setTitle={contentSet.title}
                    compact={true}
                  />
                  {navigator.share !== undefined && (
                    <button
                      onClick={handleShare}
                      className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-lg active:bg-white/10"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-lg active:bg-white/10"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Mobile Actions Menu */}
        <AnimatePresence>
          {isSmallScreen && showMobileMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setShowMobileMenu(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 z-50 safe-area-inset-bottom rounded-t-2xl"
              >
                <div className="p-4 space-y-3">
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                  
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="w-full py-3.5 text-gray-400 hover:text-white transition-colors bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Content - Enhanced Mobile Layout */}
        <div className="w-full">
          <div className={`${isSmallScreen ? 'px-4 safe-area-inset-x' : 'max-w-7xl mx-auto px-6'} ${isSmallScreen ? 'py-5' : 'py-8'}`}>
            
            {/* Title Section - Improved mobile typography */}
            <div className={`${isSmallScreen ? 'mb-5' : 'mb-8'}`}>
              <h1 className={`${
                isSmallScreen ? 'text-2xl leading-tight' : 'text-3xl'
              } font-bold text-white mb-4 break-words`}>
                {contentSet.title}
              </h1>
              
              {/* Enhanced Mobile Metadata Grid */}
              {isSmallScreen ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/50 rounded-xl p-3 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Published</p>
                      <p className="text-sm text-white font-medium">
                        {new Date(contentSet.published_at || contentSet.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/50 rounded-xl p-3 flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Views</p>
                      <p className="text-sm text-white font-medium">
                        {formatNumber(contentSet.view_count || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/50 rounded-xl p-3 flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Likes</p>
                      <p className="text-sm text-white font-medium">
                        {formatNumber(contentSet.like_count || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/50 rounded-xl p-3 flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Downloads</p>
                      <p className="text-sm text-white font-medium">
                        {formatNumber(contentSet.download_count || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Desktop metadata (unchanged)
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(contentSet.published_at || contentSet.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{(contentSet.view_count || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>{(contentSet.download_count || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Characters - Enhanced mobile layout */}
              {contentSet.characters && contentSet.characters.length > 0 && (
                <div className={`${isSmallScreen ? 'mt-4' : 'mt-4'}`}>
                  <div className={`${isSmallScreen ? 'space-y-2' : 'flex items-start gap-2 text-sm'}`}>
                    <span className={`text-gray-500 flex-shrink-0 ${isSmallScreen ? 'text-xs uppercase tracking-wider' : ''}`}>
                      Characters
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {contentSet.characters.map(char => (
                        <Link
                          key={char.id}
                          href={`/gallery?character=${char.slug}`}
                          className={`px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-lg transition-colors ${
                            isSmallScreen ? 'text-sm' : 'text-sm'
                          }`}
                        >
                          {char.name}
                          {!isSmallScreen && char.series && (
                            <span className="text-gray-500 ml-1">({char.series.name})</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags - Enhanced mobile layout */}
              {contentSet.tags && contentSet.tags.length > 0 && (
                <div className={`${isSmallScreen ? 'mt-4' : 'mt-4'}`}>
                  <div className={`${isSmallScreen ? 'space-y-2' : 'flex items-start gap-2 text-sm'}`}>
                    <div className={`flex items-center gap-1 text-gray-500 ${isSmallScreen ? 'text-xs uppercase tracking-wider' : ''}`}>
                      <Tag className={`${isSmallScreen ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      <span>Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contentSet.tags.map(tag => (
                        <Link
                          key={tag}
                          href={`/gallery?tag=${tag}`}
                          className={`px-3 py-1.5 bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 rounded-lg transition-colors ${
                            isSmallScreen ? 'text-sm' : 'text-sm'
                          }`}
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Description - Enhanced readability */}
              {contentSet.description && (
                <p className={`${
                  isSmallScreen ? 'mt-4 text-base leading-relaxed' : 'mt-4 text-base'
                } text-gray-300 break-words`}>
                  {contentSet.description}
                </p>
              )}
            </div>

            {/* Image Gallery - Full width on mobile */}
            <div className={`${isSmallScreen ? '-mx-4 mb-6' : 'mb-12'}`}>
              <ImageGallery
                setId={contentSet.id}
                images={contentSet.images || []}
                title={contentSet.title}
              />
            </div>

            {/* Comments Section - Better mobile spacing */}
            <div className={`border-t border-white/10 ${isSmallScreen ? 'pt-5 -mx-4 px-4' : 'pt-8'}`}>
              <Comments setId={contentSet.id} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default function SetPage() {
  return (
    <AuthWrapper>
      <SetContent />
    </AuthWrapper>
  )
}