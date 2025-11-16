// src/components/like-button.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

interface LikeButtonProps {
  setId: string
  initialLikes?: number
}

export function LikeButton({ setId, initialLikes = 0 }: LikeButtonProps) {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      checkIfLiked()
    }
  }, [session, setId])

  async function checkIfLiked() {
    if (!session?.user) return

    try {
      const { data } = await supabase
        .from('content_likes')
        .select('id')
        .eq('set_id', setId)
        .eq('user_id', session.user.id)
        .single()

      setLiked(!!data)
    } catch (error) {
      // Not liked
    }
  }

  async function handleLike() {
    if (!session?.user || loading) return

    setLoading(true)
    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('set_id', setId)
          .eq('user_id', session.user.id)

        if (!error) {
          setLiked(false)
          setLikeCount(prev => Math.max(0, prev - 1))
        }
      } else {
        // Like
        const { error } = await supabase
          .from('content_likes')
          .insert({
            set_id: setId,
            user_id: session.user.id,
          })

        if (!error) {
          setLiked(true)
          setLikeCount(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={!session?.user || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        liked
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <svg 
        className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} 
        fill={liked ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
        />
      </svg>
      <span>{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
    </button>
  )
}