// src/components/comments.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { useMobileContext } from '@/providers/mobile-provider'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Comment {
  id: string
  user_name: string
  user_email: string
  comment: string
  created_at: string
  is_deleted: boolean
}

interface CommentsProps {
  setId: string
}

export function Comments({ setId }: CommentsProps) {
  const { data: session } = useSession()
  const { isMobile, isTablet } = useMobileContext()
  const isSmallScreen = isMobile || isTablet
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [expandedComment, setExpandedComment] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
    
    // Subscribe to new comments
    const channel = supabase
      .channel(`comments:${setId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_comments',
          filter: `set_id=eq.${setId}`,
        },
        (payload) => {
          setComments(prev => [payload.new as Comment, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [setId])

  async function loadComments() {
    try {
      const { data } = await supabase
        .from('content_comments')
        .select('*')
        .eq('set_id', setId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (data) {
        setComments(data)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user || !newComment.trim() || posting) return

    setPosting(true)
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          user_id: session.user.id,
          user_name: session.user.name || 'Anonymous',
          user_email: session.user.email || '',
          set_id: setId,
          comment: newComment.trim(),
        })

      if (error) throw error

      setNewComment('')
    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!session?.user?.isCreator) return

    try {
      const { error } = await supabase
        .from('content_comments')
        .update({ is_deleted: true })
        .eq('id', commentId)

      if (error) throw error

      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${isSmallScreen ? 'space-y-4' : 'space-y-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageCircle className={`${isSmallScreen ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400`} />
        <h3 className={`${isSmallScreen ? 'text-lg' : 'text-xl'} font-semibold text-white`}>
          Comments
          <span className="ml-2 text-gray-500 font-normal">({comments.length})</span>
        </h3>
      </div>

      {/* Comment Form - Enhanced Mobile UI */}
      {session?.user ? (
        <form onSubmit={handleSubmit} className={`${isSmallScreen ? 'space-y-3' : 'space-y-4'}`}>
          <div className={`relative ${isSmallScreen ? 'bg-zinc-900' : 'bg-zinc-800'} border border-zinc-700 rounded-xl overflow-hidden transition-all focus-within:border-red-500`}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className={`w-full ${
                isSmallScreen ? 'px-3 py-3 text-base' : 'px-4 py-3'
              } bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none`}
              rows={isSmallScreen ? 2 : 3}
              maxLength={500}
            />
            {isSmallScreen && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-700">
                <span className="text-xs text-gray-500">
                  {newComment.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || posting}
                  className="p-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {posting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
          {!isSmallScreen && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {newComment.length}/500 characters
              </span>
              <button
                type="submit"
                disabled={!newComment.trim() || posting}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {posting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post Comment
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      ) : (
        <div className={`text-center ${isSmallScreen ? 'py-4' : 'py-6'} bg-zinc-800/50 rounded-xl border border-zinc-700`}>
          <p className="text-gray-400">Sign in to leave a comment</p>
        </div>
      )}

      {/* Comments List - Enhanced Mobile Layout */}
      <div className={`${isSmallScreen ? 'space-y-3' : 'space-y-4'}`}>
        {comments.length > 0 ? (
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`${
                  isSmallScreen ? 'bg-zinc-900' : 'bg-zinc-800/50'
                } rounded-xl ${isSmallScreen ? 'p-3' : 'p-4'} ${
                  isSmallScreen ? 'space-y-2' : 'space-y-3'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className={`font-medium text-white ${isSmallScreen ? 'text-sm' : ''}`}>
                        {comment.user_name}
                      </p>
                      <p className={`${isSmallScreen ? 'text-xs' : 'text-xs'} text-gray-500`}>
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>
                  {session?.user?.isCreator && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className={`${
                        isSmallScreen 
                          ? 'p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all' 
                          : 'text-red-400 hover:text-red-300 text-sm flex items-center gap-1'
                      }`}
                    >
                      {isSmallScreen ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Comment Text - Expandable on mobile for long comments */}
                <div className="relative">
                  <p className={`${
                    isSmallScreen ? 'text-sm' : ''
                  } text-gray-300 whitespace-pre-wrap break-words ${
                    isSmallScreen && comment.comment.length > 150 && expandedComment !== comment.id
                      ? 'line-clamp-3'
                      : ''
                  }`}>
                    {comment.comment}
                  </p>
                  {isSmallScreen && comment.comment.length > 150 && (
                    <button
                      onClick={() => setExpandedComment(
                        expandedComment === comment.id ? null : comment.id
                      )}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                    >
                      {expandedComment === comment.id ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className={`text-center text-gray-500 ${isSmallScreen ? 'py-6' : 'py-8'}`}>
            <MessageCircle className={`${isSmallScreen ? 'w-8 h-8' : 'w-10 h-10'} mx-auto mb-3 text-gray-600`} />
            <p className={isSmallScreen ? 'text-sm' : ''}>
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}