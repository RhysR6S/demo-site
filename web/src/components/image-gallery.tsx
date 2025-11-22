// src/components/image-gallery.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize2, Download, PanelLeftClose, PanelLeftOpen, Play, Pause, Timer, LayoutGrid } from 'lucide-react'
import { useMobileContext } from '@/providers/mobile-provider'

interface Image {
  id: string
  filename: string
  r2_key: string
  order_index: number
  width: number | null
  height: number | null
}

interface ImageGalleryProps {
  setId: string
  images: Image[]
  title: string
}

interface SignedUrlCache {
  [imageId: string]: {
    url: string
    expiresAt: number
  }
}

export function ImageGallery({ setId, images, title }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [signedUrls, setSignedUrls] = useState<SignedUrlCache>({})
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [isThumbnailPanelCollapsed, setIsThumbnailPanelCollapsed] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  
  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isLongPress, setIsLongPress] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [skipTransition, setSkipTransition] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const containerWidthRef = useRef<number>(0)

  // Double-tap detection for mobile UI toggle
  const [lastTap, setLastTap] = useState<number>(0)
  const [uiVisible, setUiVisible] = useState(true)
  
  // Slideshow state
  const [isPlaying, setIsPlaying] = useState(false)
  const [slideshowSpeed, setSlideshowSpeed] = useState(3)
  const [showSpeedControl, setShowSpeedControl] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [showThumbnails, setShowThumbnails] = useState(true)
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null)
  const uiHideTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs for optimization
  const galleryRef = useRef<HTMLDivElement>(null)
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const preloadingRef = useRef<Set<string>>(new Set()) // Track in-flight preload requests
  const preloadAbortRef = useRef<AbortController | null>(null) // For cleanup
  
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet

  // Sort images by order_index
  const sortedImages = [...images].sort((a, b) => a.order_index - b.order_index)
  const currentImage = sortedImages[currentIndex]

  const minSwipeDistance = 30 // Reduced for more sensitive swipe detection
  const swipeVelocityThreshold = 0.3 // pixels per ms for quick flick detection
  const showVerticalThumbnails = isSmallScreen && isLandscape && isFullscreen && showThumbnails

  // Detect landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  // Optimized: Stable fetchSignedUrl without signedUrls dependency
  const fetchSignedUrl = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/image/${imageId}`)
      if (!response.ok) throw new Error('Failed to load image')

      const data = await response.json()
      const expiresAt = Date.now() + (data.expiresIn * 1000)
      
      setSignedUrls(prev => ({
        ...prev,
        [imageId]: { url: data.url, expiresAt }
      }))
      
      return data.url
    } catch (error) {
      console.error(`Failed to fetch signed URL for ${imageId}:`, error)
      setImageErrors(prev => ({ ...prev, [imageId]: true }))
      return null
    }
  }, []) // No dependencies - stable reference

  // Optimized: Check cache without causing re-renders
  const getSignedUrl = useCallback(async (imageId: string) => {
    const cached = signedUrls[imageId]
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.url
    }
    return await fetchSignedUrl(imageId)
  }, [fetchSignedUrl]) // Only depends on stable fetchSignedUrl
  
  // Add signedUrls to ref for access without dependency
  const signedUrlsRef = useRef(signedUrls)
  useEffect(() => {
    signedUrlsRef.current = signedUrls
  }, [signedUrls])

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (isTransitioning || isSwiping) return // Prevent navigation during transition
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : sortedImages.length - 1))
  }, [sortedImages.length, isTransitioning, isSwiping])

  const goToNext = useCallback(() => {
    if (isTransitioning || isSwiping) return // Prevent navigation during transition
    setCurrentIndex(prev => (prev < sortedImages.length - 1 ? prev + 1 : 0))
  }, [sortedImages.length, isTransitioning, isSwiping])

  // UI auto-hide control
  const resetUIHideTimer = useCallback(() => {
    if (uiHideTimerRef.current) {
      clearTimeout(uiHideTimerRef.current)
    }
    setShowUI(true)
    if (isPlaying) {
      uiHideTimerRef.current = setTimeout(() => setShowUI(false), 3000)
    }
  }, [isPlaying])

  const handleUserInteraction = useCallback(() => {
    if (isPlaying) resetUIHideTimer()
  }, [isPlaying, resetUIHideTimer])

  // Slideshow control
  const toggleSlideshow = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
      setShowSpeedControl(false)
      setShowUI(true)
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
      if (uiHideTimerRef.current) {
        clearTimeout(uiHideTimerRef.current)
        uiHideTimerRef.current = null
      }
    } else {
      setIsPlaying(true)
      setShowSpeedControl(true)
      resetUIHideTimer()
    }
  }, [isPlaying, resetUIHideTimer])

  const handleManualNavigation = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
      setShowSpeedControl(false)
      setShowUI(true)
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
      if (uiHideTimerRef.current) {
        clearTimeout(uiHideTimerRef.current)
        uiHideTimerRef.current = null
      }
    }
  }, [isPlaying])

  // Touch handlers for carousel swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isTransitioning) return

    const touch = e.targetTouches[0]
    const now = Date.now()

    // Double-tap detection (mobile only)
    if (isSmallScreen && now - lastTap < 300) {
      // Double tap detected - toggle UI
      setUiVisible(prev => !prev)
      if (navigator.vibrate) navigator.vibrate(15) // Quick haptic feedback
      setLastTap(0) // Reset to prevent triple-tap
      return // Don't process as swipe
    }
    setLastTap(now)

    setTouchStart(touch.clientX)
    setTouchStartTime(now)
    setTouchEnd(null)
    setIsLongPress(false)
    setIsSwiping(true)

    // Capture container width for percentage calculations
    if (imageContainerRef.current) {
      containerWidthRef.current = imageContainerRef.current.offsetWidth
    }

    // Long press timer for image saving
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true)
      if (navigator.vibrate) navigator.vibrate(50)
    }, 600)
  }, [isTransitioning, isSmallScreen, lastTap])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || isLongPress || isTransitioning) return

    // Cancel long press if finger moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const currentTouch = e.targetTouches[0].clientX
    const diff = currentTouch - touchStart

    // Update swipe offset for real-time visual feedback
    setSwipeOffset(diff)
    setTouchEnd(currentTouch)
  }, [touchStart, isLongPress, isTransitioning])

  const onTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Handle long press case
    if (isLongPress) {
      setIsLongPress(false)
      setIsSwiping(false)
      setSwipeOffset(0)
      setTouchStart(null)
      setTouchEnd(null)
      setTouchStartTime(null)
      return
    }

    // No valid swipe
    if (!touchStart || touchEnd === null || touchStartTime === null) {
      setIsSwiping(false)
      setSwipeOffset(0)
      setTouchStart(null)
      setTouchEnd(null)
      setTouchStartTime(null)
      return
    }

    const distance = touchEnd - touchStart
    const duration = Date.now() - touchStartTime
    const velocity = Math.abs(distance) / duration // pixels per ms
    const containerWidth = containerWidthRef.current || window.innerWidth

    // OPTIMIZED: More sensitive thresholds for better UX
    // Use 15% of screen width OR 30px minimum (much more sensitive than before)
    const swipeThreshold = Math.max(minSwipeDistance, containerWidth * 0.15)

    // Quick flick detection - if user swipes fast, count it even if distance is small
    const isQuickFlick = velocity > swipeVelocityThreshold && Math.abs(distance) > 15

    const isRightSwipe = distance > swipeThreshold || (isQuickFlick && distance > 0) // Swipe right = previous image
    const isLeftSwipe = distance < -swipeThreshold || (isQuickFlick && distance < 0) // Swipe left = next image

    setIsSwiping(false)

    if (isRightSwipe || isLeftSwipe) {
      // Swipe threshold met - complete the animation first, then update index
      handleManualNavigation()
      setIsTransitioning(true)

      // Step 1: Animate to the full swipe position
      if (isLeftSwipe) {
        // Swiping left = next image, animate to show the third image (next)
        // Transform needs to be: translateX(-200%)
        // Since base is -100%, we need swipeOffset = -containerWidth
        setSwipeOffset(-containerWidth)
      } else {
        // Swiping right = previous image, animate to show the first image (prev)
        // Transform needs to be: translateX(0%)
        // Since base is -100%, we need swipeOffset = containerWidth
        setSwipeOffset(containerWidth)
      }

      // Step 2: After animation completes, update index and reset instantly
      setTimeout(() => {
        // Update the current index
        if (isLeftSwipe) {
          setCurrentIndex(prev => (prev < sortedImages.length - 1 ? prev + 1 : 0))
        } else {
          setCurrentIndex(prev => (prev > 0 ? prev - 1 : sortedImages.length - 1))
        }

        // Instantly reset to base position with no transition
        // Use requestAnimationFrame to ensure the index update renders first
        requestAnimationFrame(() => {
          setSkipTransition(true)
          setSwipeOffset(0)
          setIsTransitioning(false)
          setTouchStart(null)
          setTouchEnd(null)

          // Re-enable transitions after the instant reset completes
          requestAnimationFrame(() => {
            setSkipTransition(false)
          })
        })
      }, 250) // Match CSS transition duration (reduced for snappier feel)
    } else {
      // Swipe threshold not met - snap back to current position
      setSwipeOffset(0)
      setTouchStart(null)
      setTouchEnd(null)
      setTouchStartTime(null)
    }
  }, [touchStart, touchEnd, touchStartTime, sortedImages.length, isLongPress, isTransitioning, handleManualNavigation])

  const toggleFullscreen = useCallback(async () => {
    try {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )

      if (!isCurrentlyFullscreen && galleryRef.current) {
        if (galleryRef.current.requestFullscreen) {
          await galleryRef.current.requestFullscreen()
        } else if ((galleryRef.current as any).webkitRequestFullscreen) {
          await (galleryRef.current as any).webkitRequestFullscreen()
        } else if ((galleryRef.current as any).mozRequestFullScreen) {
          await (galleryRef.current as any).mozRequestFullScreen()
        } else if ((galleryRef.current as any).msRequestFullscreen) {
          await (galleryRef.current as any).msRequestFullscreen()
        }
      } else if (isCurrentlyFullscreen) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch (error) {
      console.log('Fullscreen toggle error:', error)
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
    }
  }, [])

  // Download image function
  const downloadImage = useCallback(async (imageId: string, filename: string) => {
    try {
      const response = await fetch(`/api/download/${imageId}`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download image. Please try again.')
    }
  }, [])

  // Image load/error handlers
  const handleImageLoad = useCallback((imageId: string) => {
    setImageLoading(prev => ({ ...prev, [imageId]: false }))
    setImageErrors(prev => ({ ...prev, [imageId]: false }))
    setPreloadedImages(prev => new Set([...prev, imageId]))
  }, [])

  const handleImageError = useCallback((imageId: string) => {
    console.error(`Failed to load image: ${imageId}`)
    setImageLoading(prev => ({ ...prev, [imageId]: false }))
    setImageErrors(prev => ({ ...prev, [imageId]: true }))
  }, [])

  // OPTIMIZED: Single preload function that properly updates state
  const preloadImage = useCallback(async (imageId: string): Promise<boolean> => {
    // Skip if already preloading or preloaded
    if (preloadingRef.current.has(imageId) || preloadedImages.has(imageId)) {
      return true
    }

    preloadingRef.current.add(imageId)

    try {
      // Get signed URL first
      const url = await getSignedUrl(imageId)
      if (!url) {
        preloadingRef.current.delete(imageId)
        return false
      }

      // Preload the actual image
      return await new Promise<boolean>((resolve) => {
        const img = new Image()
        
        img.onload = () => {
          setImageLoading(prev => ({ ...prev, [imageId]: false }))
          setImageErrors(prev => ({ ...prev, [imageId]: false }))
          // FIXED: Actually update preloadedImages set
          setPreloadedImages(prev => new Set([...prev, imageId]))
          preloadingRef.current.delete(imageId)
          resolve(true)
        }
        
        img.onerror = () => {
          setImageErrors(prev => ({ ...prev, [imageId]: true }))
          setImageLoading(prev => ({ ...prev, [imageId]: false }))
          preloadingRef.current.delete(imageId)
          resolve(false)
        }
        
        img.src = url
      })
    } catch (error) {
      console.error(`Preload failed for ${imageId}:`, error)
      preloadingRef.current.delete(imageId)
      return false
    }
  }, [getSignedUrl, preloadedImages])

  // OPTIMIZED: Initial preload - runs ONCE on mount only
  useEffect(() => {
    const abortController = new AbortController()
    preloadAbortRef.current = abortController
    
    const preloadAll = async () => {
      // Create priority queue based on distance from current image
      const queue: number[] = []
      const seen = new Set<number>()
      
      // Add current image first
      queue.push(currentIndex)
      seen.add(currentIndex)
      
      // Add images in alternating pattern: +1, -1, +2, -2, +3, -3...
      for (let distance = 1; distance < sortedImages.length; distance++) {
        const nextIdx = (currentIndex + distance) % sortedImages.length
        const prevIdx = (currentIndex - distance + sortedImages.length) % sortedImages.length
        
        if (!seen.has(nextIdx)) {
          queue.push(nextIdx)
          seen.add(nextIdx)
        }
        if (prevIdx !== nextIdx && !seen.has(prevIdx)) {
          queue.push(prevIdx)
          seen.add(prevIdx)
        }
      }

      // Preload with concurrency control
      const CONCURRENCY = 3 // Limit parallel requests
      for (let i = 0; i < queue.length; i += CONCURRENCY) {
        if (abortController.signal.aborted) break
        
        const batch = queue.slice(i, i + CONCURRENCY)
        const promises = batch
          .map(idx => sortedImages[idx])
          .filter(img => img)
          .map(img => preloadImage(img.id))
        
        await Promise.all(promises)
        
        // Progressive delay: fast for nearby images, slower for distant ones
        if (i < 10) {
          await new Promise(resolve => setTimeout(resolve, 50))
        } else if (i < 20) {
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    }

    preloadAll()

    return () => {
      abortController.abort()
    }
  }, [sortedImages.length]) // Only re-run if image count changes, NOT on navigation

  // OPTIMIZED: Adjacent preload on navigation - lighter weight
  useEffect(() => {
    const preloadAdjacent = async () => {
      // Preload next 3 and previous 3 images
      const indices = [
        (currentIndex + 1) % sortedImages.length,
        (currentIndex + 2) % sortedImages.length,
        (currentIndex + 3) % sortedImages.length,
        (currentIndex - 1 + sortedImages.length) % sortedImages.length,
        (currentIndex - 2 + sortedImages.length) % sortedImages.length,
        (currentIndex - 3 + sortedImages.length) % sortedImages.length,
      ]

      // Only preload if not already done
      const toPreload = indices
        .map(idx => sortedImages[idx])
        .filter(img => img && !preloadedImages.has(img.id))
      
      // Load in parallel
      await Promise.all(toPreload.map(img => preloadImage(img.id)))
    }

    preloadAdjacent()
  }, [currentIndex]) // Run on navigation

  // Initialize loading states
  useEffect(() => {
    if (Object.keys(imageLoading).length === 0 && sortedImages.length > 0) {
      const loadingStates: Record<string, boolean> = {}
      sortedImages.forEach(img => {
        loadingStates[img.id] = true
      })
      setImageLoading(loadingStates)
    }
  }, [sortedImages.length, imageLoading])

  // Slideshow timer effect
  useEffect(() => {
    if (isPlaying && sortedImages.length > 1) {
      slideshowTimerRef.current = setInterval(() => {
        goToNext()
      }, slideshowSpeed * 1000)

      return () => {
        if (slideshowTimerRef.current) {
          clearInterval(slideshowTimerRef.current)
          slideshowTimerRef.current = null
        }
      }
    }
  }, [isPlaying, slideshowSpeed, goToNext, sortedImages.length])

  // Initialize UI hide timer when slideshow starts
  useEffect(() => {
    if (isPlaying) {
      resetUIHideTimer()
    } else {
      setShowUI(true)
      if (uiHideTimerRef.current) {
        clearTimeout(uiHideTimerRef.current)
        uiHideTimerRef.current = null
      }
    }
  }, [isPlaying, resetUIHideTimer])

  // Cleanup fullscreen, slideshow, and timers on unmount
  useEffect(() => {
    return () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      )
      if (isCurrentlyFullscreen) {
        document.exitFullscreen?.().catch(() => {})
      }
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
      }
      if (uiHideTimerRef.current) {
        clearTimeout(uiHideTimerRef.current)
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      if (preloadAbortRef.current) {
        preloadAbortRef.current.abort()
      }
    }
  }, [])

  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        handleManualNavigation()
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        handleManualNavigation()
        goToNext()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === ' ') {
        e.preventDefault()
        toggleSlideshow()
      } else if ((e.key === 't' || e.key === 'T') && isFullscreen) {
        setShowThumbnails(!showThumbnails)
      } else if (e.key === 'd' || e.key === 'D') {
        downloadImage(currentImage.id, currentImage.filename)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, sortedImages.length, toggleFullscreen, goToPrevious, goToNext, handleManualNavigation, toggleSlideshow, isFullscreen, showThumbnails, downloadImage, currentImage])

  // Auto-scroll thumbnail strip to show current image
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const container = thumbnailContainerRef.current
      const thumbnails = container.children
      if (thumbnails[currentIndex]) {
        const thumbnail = thumbnails[currentIndex] as HTMLElement
        
        if (isSmallScreen && isLandscape && isFullscreen) {
          const containerHeight = container.offsetHeight
          const thumbnailTop = thumbnail.offsetTop
          const thumbnailHeight = thumbnail.offsetHeight
          
          const scrollTop = thumbnailTop - (containerHeight / 2) + (thumbnailHeight / 2)
          container.scrollTo({ top: scrollTop, behavior: 'smooth' })
        } else {
          const containerWidth = container.offsetWidth
          const thumbnailLeft = thumbnail.offsetLeft
          const thumbnailWidth = thumbnail.offsetWidth
          
          const scrollLeft = thumbnailLeft - (containerWidth / 2) + (thumbnailWidth / 2)
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
        }
      }
    }
  }, [currentIndex, isSmallScreen, isLandscape, isFullscreen])

  if (sortedImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p>Loading images...</p>
        </div>
      </div>
    )
  }

  if (!currentImage) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>Error: No image selected</p>
      </div>
    )
  }

  return (
    <div 
      ref={galleryRef}
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black flex' : isSmallScreen ? 'overflow-hidden' : 'rounded-lg overflow-hidden'} ${
        showVerticalThumbnails ? 'flex-row' : 'flex-col'
      }`}
      onMouseMove={handleUserInteraction}
      onTouchStart={handleUserInteraction}
    >
      {/* Vertical Thumbnail Panel for Mobile Landscape */}
      {showVerticalThumbnails && showThumbnails && (
        <div 
          className={`relative bg-black/90 border-r border-white/10 transition-all duration-300 ${
            isThumbnailPanelCollapsed ? 'w-0' : 'w-32'
          } overflow-hidden ${
            isPlaying ? (showUI ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-100'
          } transition-opacity duration-500`}
        >
          <button
            onClick={() => setIsThumbnailPanelCollapsed(!isThumbnailPanelCollapsed)}
            className="absolute -right-8 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/70 hover:bg-black/90 text-white rounded-r-lg transition-all"
          >
            {isThumbnailPanelCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          {!isThumbnailPanelCollapsed && (
            <div 
              ref={thumbnailContainerRef}
              className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800 p-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {sortedImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => {
                    handleManualNavigation()
                    setCurrentIndex(index)
                  }}
                  className={`relative w-full aspect-[3/4] mb-2 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex 
                      ? 'ring-2 ring-red-500 scale-105' 
                      : 'ring-1 ring-zinc-700 hover:ring-zinc-600'
                  }`}
                >
                  <img
                    src={`/api/thumbnail/${image.id}`}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-sky-500/20" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area with Swipe Support */}
      <div className={`relative ${showVerticalThumbnails ? 'flex-1' : 'w-full'} ${
        isFullscreen 
          ? 'h-full' 
          : isSmallScreen 
            ? 'h-[60vh]'
            : 'h-[70vh] max-h-[800px]'
      } bg-zinc-950 overflow-hidden`}>
        
        {/* Control buttons bar */}
        <div className={`absolute top-4 left-4 right-4 z-10 flex items-center justify-between ${
          isPlaying ? (showUI ? 'opacity-100' : 'opacity-0 pointer-events-none') : (isSmallScreen && !uiVisible ? 'opacity-0 pointer-events-none' : 'opacity-100')
        } transition-opacity duration-300`}>
          {/* Left side controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => downloadImage(currentImage.id, currentImage.filename)}
              className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"
              title="Download current image (D)"
            >
              <Download className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
            
            {sortedImages.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSlideshow}
                  className={`p-2 ${isPlaying ? 'bg-sky-500/30' : 'bg-black/50'} hover:bg-black/70 text-white rounded-lg transition-all`}
                  title={isPlaying ? "Pause slideshow (Space)" : "Play slideshow (Space)"}
                >
                  {isPlaying ? (
                    <Pause className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  ) : (
                    <Play className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  )}
                </button>
                
                {showSpeedControl && !isSmallScreen && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/50 rounded-lg">
                    <Timer className="w-4 h-4 text-gray-400" />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={slideshowSpeed}
                      onChange={(e) => setSlideshowSpeed(parseFloat(e.target.value))}
                      className="w-24 accent-red-500"
                      title="Slideshow speed"
                    />
                    <span className="text-sm text-gray-300 min-w-[3ch]">
                      {slideshowSpeed}s
                    </span>
                  </div>
                )}
                {showSpeedControl && isSmallScreen && (
                  <button
                    onClick={() => {
                      const speeds = [2, 3, 5, 8]
                      const currentIdx = speeds.indexOf(slideshowSpeed)
                      const nextIdx = currentIdx === -1 || currentIdx === speeds.length - 1 ? 0 : currentIdx + 1
                      setSlideshowSpeed(speeds[nextIdx])
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"
                    title="Tap to change speed"
                  >
                    <Timer className="w-4 h-4" />
                    <span className="text-xs">
                      {slideshowSpeed}s
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className={`${
              isSmallScreen && isLandscape
                ? 'px-2 py-0.5 text-xs'
                : 'px-3 py-1 text-sm'
            } bg-black/50 text-white rounded-lg transition-opacity duration-300 ${
              isSmallScreen && !uiVisible ? 'opacity-0' : 'opacity-100'
            }`}>
              {currentIndex + 1}/{sortedImages.length}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {isFullscreen && (
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className={`p-2 ${showThumbnails ? 'bg-sky-500/30' : 'bg-black/50'} hover:bg-black/70 text-white rounded-lg transition-all`}
                title={showThumbnails ? "Hide thumbnails (T)" : "Show thumbnails (T)"}
              >
                <LayoutGrid className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </button>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all"
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F)"}
            >
              {isFullscreen ? (
                <X className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
              ) : (
                <Maximize2 className={`${isSmallScreen ? 'w-4 h-4' : 'w-5 h-5'}`} />
              )}
            </button>
          </div>
        </div>

        {/* Preload progress indicator - FIXED: Now updates correctly */}
        {sortedImages.length > 5 && preloadedImages.size < sortedImages.length && (
          <div className={`absolute ${
            isFullscreen && !showThumbnails
              ? 'bottom-4 right-4'
              : isSmallScreen 
                ? showVerticalThumbnails
                  ? 'bottom-4 right-4'
                  : 'bottom-[100px] right-4'
                : 'bottom-4 right-4'
          } z-10 ${
            isPlaying ? (showUI ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-100'
          } transition-opacity duration-500`}>
            <div className={`bg-black/50 px-2 py-1 rounded-lg`}>
              <div className="flex items-center gap-1.5">
                <div className={`${isSmallScreen ? 'w-12 h-1' : 'w-16 h-1.5'} bg-gray-700 rounded-full overflow-hidden`}>
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(preloadedImages.size / sortedImages.length) * 100}%` }}
                  />
                </div>
                <span className={`text-white ${isSmallScreen ? 'text-[10px]' : 'text-xs'}`}>
                  {Math.round((preloadedImages.size / sortedImages.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main image with navigation and carousel swipe support */}
        <div
          ref={imageContainerRef}
          className="relative w-full h-full overflow-hidden"
          onTouchStart={isSmallScreen ? onTouchStart : undefined}
          onTouchMove={isSmallScreen ? onTouchMove : undefined}
          onTouchEnd={isSmallScreen ? onTouchEnd : undefined}
          onTouchCancel={isSmallScreen ? onTouchEnd : undefined}
        >
          {!isSmallScreen && (
            <>
              <button
                onClick={() => {
                  handleManualNavigation()
                  goToPrevious()
                }}
                className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all ${
                  isPlaying ? (showUI ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-100'
                } transition-opacity duration-500`}
                title="Previous image (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  handleManualNavigation()
                  goToNext()
                }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all ${
                  isPlaying ? (showUI ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-100'
                } transition-opacity duration-500`}
                title="Next image (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Carousel track - renders prev, current, next images */}
          <div
            className="flex h-full"
            style={{
              transform: isSmallScreen
                ? `translateX(calc(-100% + ${swipeOffset}px))`
                : 'translateX(0)',
              transition: (isSwiping || isLongPress || skipTransition) ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
              width: isSmallScreen ? '300%' : '100%'
            }}
          >
            {isSmallScreen ? (
              <>
                {/* Previous image */}
                {(() => {
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedImages.length - 1
                  const prevImage = sortedImages[prevIndex]
                  return (
                    <div className="w-full h-full flex-shrink-0 flex items-center justify-center px-0 py-2">
                      {signedUrls[prevImage.id]?.url && (
                        <img
                          src={signedUrls[prevImage.id].url}
                          alt={`Previous image`}
                          className="w-full h-full object-contain select-none"
                          style={{
                            userSelect: 'none',
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            pointerEvents: 'none'
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                  )
                })()}

                {/* Current image */}
                <div className="w-full h-full flex-shrink-0 flex items-center justify-center px-0 py-2">
                  {imageLoading[currentImage.id] === true && !imageErrors[currentImage.id] && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}

                  {imageErrors[currentImage.id] ? (
                    <div className="text-center text-gray-400">
                      <p>Failed to load image</p>
                      <p className="text-xs mb-2">Image ID: {currentImage.id}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setImageErrors(prev => ({ ...prev, [currentImage.id]: false }))
                          setImageLoading(prev => ({ ...prev, [currentImage.id]: true }))
                          preloadImage(currentImage.id)
                        }}
                        className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className={`relative w-full h-full flex items-center justify-center ${
                      isLongPress ? '' : 'select-none'
                    }`}>
                      {signedUrls[currentImage.id]?.url ? (
                        <img
                          src={signedUrls[currentImage.id].url}
                          alt={`${currentIndex + 1} of ${sortedImages.length}`}
                          className="w-full h-full object-contain"
                          style={{
                            userSelect: isLongPress ? 'text' : 'none',
                            WebkitTouchCallout: isLongPress ? 'default' : 'none',
                            WebkitUserSelect: isLongPress ? 'text' : 'none',
                            pointerEvents: 'auto'
                          }}
                          draggable={isLongPress}
                          onLoad={() => handleImageLoad(currentImage.id)}
                          onError={() => handleImageError(currentImage.id)}
                          onContextMenu={(e) => {
                            if (!isLongPress) {
                              e.preventDefault()
                            }
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                      {isLongPress && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none animate-pulse">
                          Image ready to save
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Next image */}
                {(() => {
                  const nextIndex = currentIndex < sortedImages.length - 1 ? currentIndex + 1 : 0
                  const nextImage = sortedImages[nextIndex]
                  return (
                    <div className="w-full h-full flex-shrink-0 flex items-center justify-center px-0 py-2">
                      {signedUrls[nextImage.id]?.url && (
                        <img
                          src={signedUrls[nextImage.id].url}
                          alt={`Next image`}
                          className="w-full h-full object-contain select-none"
                          style={{
                            userSelect: 'none',
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            pointerEvents: 'none'
                          }}
                          draggable={false}
                        />
                      )}
                    </div>
                  )
                })()}
              </>
            ) : (
              /* Desktop view - single image */
              <div className="w-full h-full flex items-center justify-center px-4 py-4"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.tagName !== 'BUTTON' && !target.closest('button')) {
                    toggleFullscreen()
                  }
                }}
              >
                {imageLoading[currentImage.id] === true && !imageErrors[currentImage.id] && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {imageErrors[currentImage.id] ? (
                  <div className="text-center text-gray-400">
                    <p>Failed to load image</p>
                    <p className="text-xs mb-2">Image ID: {currentImage.id}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setImageErrors(prev => ({ ...prev, [currentImage.id]: false }))
                        setImageLoading(prev => ({ ...prev, [currentImage.id]: true }))
                        preloadImage(currentImage.id)
                      }}
                      className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  signedUrls[currentImage.id]?.url ? (
                    <img
                      src={signedUrls[currentImage.id].url}
                      alt={`${currentIndex + 1} of ${sortedImages.length}`}
                      className="max-w-full max-h-full object-contain"
                      onLoad={() => handleImageLoad(currentImage.id)}
                      onError={() => handleImageError(currentImage.id)}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Thumbnail strip */}
      {!showVerticalThumbnails && (!isFullscreen || showThumbnails) && (
        <div className={`${isFullscreen ? 'absolute bottom-0 left-0 right-0 bg-black/80' : 'bg-slate-900 border-t border-zinc-800'} p-3 ${
          isPlaying ? (showUI ? 'opacity-100' : 'opacity-0 pointer-events-none') : 'opacity-100'
        } transition-opacity duration-500`}>
          <div
            ref={thumbnailContainerRef}
            className="flex gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800"
            style={{ scrollbarWidth: 'thin' }}
          >
            {sortedImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => {
                  handleManualNavigation()
                  setCurrentIndex(index)
                }}
                className={`relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden transition-all ${
                  index === currentIndex 
                    ? 'ring-2 ring-red-500 scale-105' 
                    : 'ring-1 ring-zinc-700 hover:ring-zinc-600'
                }`}
              >
                <img
                  src={`/api/thumbnail/${image.id}`}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {index === currentIndex && (
                  <div className="absolute inset-0 bg-sky-500/20" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}