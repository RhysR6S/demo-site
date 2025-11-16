// src/components/content-thumbnail.tsx
"use client"

import { ContentSetWithRelations } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { BackgroundDownloadButton } from '@/components/download-manager'
import { FavoriteButton } from '@/components/favorite-button'
import { Download } from 'lucide-react'
import { useMobileContext } from '@/providers/mobile-provider'
import { useState } from 'react'

interface ContentThumbnailProps {
  contentSet: ContentSetWithRelations
  priority?: boolean
  userHasViewed?: boolean
  userHasDownloaded?: boolean
  userHasFavorited?: boolean
  hideImageCount?: boolean
  showDownloadButton?: boolean
}

export function ContentThumbnail({
  contentSet,
  priority = false,
  userHasViewed = false,
  userHasDownloaded = false,
  userHasFavorited = false,
  hideImageCount = false,
  showDownloadButton = false
}: ContentThumbnailProps) {
  const { isMobile, isTablet } = useMobileContext()
  const [isPressed, setIsPressed] = useState(false)

  const thumbnailUrl = contentSet.thumbnail?.r2_key
    ? `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}/${contentSet.thumbnail.r2_key}`
    : '/placeholder-image.jpg'

  // Haptic feedback for mobile
  const triggerHaptic = () => {
    if ((isMobile || isTablet) && 'vibrate' in navigator) {
      navigator.vibrate(10) // Very subtle haptic
    }
  }

  return (
    <div className="group relative">
      <Link
        href={`/sets/${contentSet.slug}`}
        onTouchStart={() => {
          setIsPressed(true)
          triggerHaptic()
        }}
        onTouchEnd={() => setIsPressed(false)}
        onTouchCancel={() => setIsPressed(false)}
      >
        <div
          className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-900 border border-white/5 group-hover:border-white/10 transition-all ${
            (isMobile || isTablet) ? 'active:scale-[0.98]' : ''
          }`}
          style={{
            transform: isPressed ? 'scale(0.98)' : 'scale(1)',
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* New/Unseen indicator */}
          {!userHasViewed && (
            <div className={`absolute ${(isMobile || isTablet) ? 'top-1.5 left-1.5' : 'top-2 left-2'} z-10`}>
              <span className={`${(isMobile || isTablet) ? 'px-2 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} bg-red-600 text-white font-semibold rounded shadow-lg`}>
                NEW
              </span>
            </div>
          )}

          {/* Downloaded indicator */}
          {userHasDownloaded && (
            <div className={`absolute ${(isMobile || isTablet) ? 'top-1.5 right-1.5' : 'top-2 right-2'} z-10`}>
              <div className={`${(isMobile || isTablet) ? 'w-5 h-5' : 'w-6 h-6'} bg-green-600 rounded-full flex items-center justify-center shadow-lg`}>
                <svg className={`${(isMobile || isTablet) ? 'w-3 h-3' : 'w-4 h-4'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}

          {/* Favorite Button - Only show on desktop hover */}
          {!(isMobile || isTablet) && (
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {!userHasDownloaded && (
                <FavoriteButton
                  setId={contentSet.id}
                  initialFavorited={userHasFavorited}
                  size="sm"
                  className="shadow-lg"
                />
              )}
            </div>
          )}

          {/* Image count */}
          {!hideImageCount && (
            <div className={`absolute ${(isMobile || isTablet) ? 'bottom-1.5 left-1.5' : 'bottom-2 left-2'} z-10`}>
              <span className={`${(isMobile || isTablet) ? 'px-2 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} bg-black/70 backdrop-blur-sm text-white font-medium rounded shadow-sm`}>
                {contentSet.image_count} {contentSet.image_count === 1 ? 'image' : 'images'}
              </span>
            </div>
          )}

          {/* Thumbnail image */}
          <Image
            src={thumbnailUrl}
            alt={contentSet.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
            priority={priority}
          />

          {/* Hover overlay - Only on desktop */}
          {!(isMobile || isTablet) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </Link>

      {/* Title and info */}
      <div className={`${(isMobile || isTablet) ? 'mt-2 space-y-0.5' : 'mt-3 space-y-1'}`}>
        <Link href={`/sets/${contentSet.slug}`}>
          <h3 className={`${(isMobile || isTablet) ? 'text-xs leading-snug' : 'text-sm'} font-medium text-white group-hover:text-red-500 transition-colors line-clamp-2`}>
            {contentSet.title}
          </h3>
        </Link>

        {/* Characters - Show on mobile with truncation */}
        {contentSet.characters && contentSet.characters.length > 0 && (
          <p className={`${(isMobile || isTablet) ? 'text-[10px]' : 'text-xs'} text-gray-400 line-clamp-1`}>
            {(isMobile || isTablet)
              ? contentSet.characters[0]?.name // Show first character only on mobile
              : contentSet.characters.map(c => c.name).join(', ')
            }
          </p>
        )}

        {/* Stats - Show view count on mobile, full stats on desktop */}
        {(isMobile || isTablet) ? (
          // Mobile: Show just view count if available
          contentSet.view_count > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{contentSet.view_count}</span>
            </div>
          )
        ) : (
          // Desktop: Full stats and download button
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              {contentSet.view_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {contentSet.view_count}
                </span>
              )}
              {contentSet.like_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill={userHasFavorited ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {contentSet.like_count}
                </span>
              )}
            </div>

            {/* Download button */}
            {showDownloadButton && (
              <div onClick={(e) => e.stopPropagation()}>
                <BackgroundDownloadButton
                  setId={contentSet.id}
                  setTitle={contentSet.title}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}