// src/components/favorite-button.tsx
"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"

interface FavoriteButtonProps {
  setId: string
  initialFavorited?: boolean
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  count?: number
  className?: string
  onToggle?: (isFavorited: boolean) => void
}

export function FavoriteButton({
  setId,
  initialFavorited = false,
  size = "md",
  showCount = false,
  count = 0,
  className = "",
  onToggle
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(count)

  useEffect(() => {
    setIsFavorited(initialFavorited)
  }, [initialFavorited])

  useEffect(() => {
    setFavoriteCount(count)
  }, [count])

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const method = isFavorited ? 'DELETE' : 'POST'
      const response = await fetch(`/api/favorites/${setId}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const newFavorited = !isFavorited
        setIsFavorited(newFavorited)
        
        // Update count
        if (showCount) {
          setFavoriteCount(prev => newFavorited ? prev + 1 : Math.max(0, prev - 1))
        }
        
        // Call callback if provided
        if (onToggle) {
          onToggle(newFavorited)
        }
        
        // Dispatch event for other components to update
        window.dispatchEvent(new CustomEvent('favorite-toggled', { 
          detail: { setId, isFavorited: newFavorited } 
        }))
      } else {
        console.error('Failed to toggle favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg"
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        relative flex items-center justify-center
        bg-zinc-900/90 backdrop-blur-sm
        border border-white/10
        rounded-lg
        transition-all duration-200
        hover:border-red-500/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isFavorited ? 'text-red-500 border-red-500/30' : 'text-gray-400 hover:text-red-400'}
        ${className}
      `}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-all duration-200 ${isFavorited ? 'fill-current' : ''}`}
      />
      
      {showCount && favoriteCount > 0 && (
        <span className="absolute -bottom-2 -right-2 min-w-[20px] h-5 px-1.5 
                       bg-zinc-800 border border-white/10 rounded-full
                       text-xs text-gray-300 flex items-center justify-center">
          {favoriteCount > 999 ? '999+' : favoriteCount}
        </span>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 rounded-lg">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </button>
  )
}