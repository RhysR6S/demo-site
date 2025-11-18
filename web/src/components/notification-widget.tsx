// src/components/notification-widget.tsx
"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { useMobileContext } from '@/providers/mobile-provider'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'new_member' | 'commission' | 'dm'
  title: string
  description: string
  link?: string
  created_at: string
  read: boolean
  metadata?: {
    userNames?: string[]
    postTitle?: string
    userName?: string
    additionalCount?: number
  }
}

const NotificationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
    />
  </svg>
)

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'like':
      return 'text-sky-500 bg-sky-500/10 border-sky-500/20'
    case 'comment':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    case 'new_member':
      return 'text-green-500 bg-green-500/10 border-green-500/20'
    case 'commission':
      return 'text-cyan-500 bg-purple-500/10 border-cyan-500/20'
    case 'dm':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  }
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'like':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
        </svg>
      )
    case 'comment':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
      )
    case 'new_member':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" 
          />
        </svg>
      )
    case 'commission':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      )
    case 'dm':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
          />
        </svg>
      )
  }
}

export function NotificationWidget() {
  // ALL hooks must be called first
  const { data: session } = useSession()
  const { isMobile, isTablet } = useMobileContext()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const widgetRef = useRef<HTMLDivElement>(null)

  // THEN check permission - after all hooks
  if (!session?.user?.isCreator) {
    return null
  }

  useEffect(() => {
    loadNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => loadNotifications()
    window.addEventListener('refresh-notifications', handleRefresh)
    return () => window.removeEventListener('refresh-notifications', handleRefresh)
  }, [])

  async function loadNotifications() {
    try {
      const response = await fetch('/api/creator/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await fetch('/api/creator/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/creator/notifications/read-all', {
        method: 'POST'
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  function formatNotificationText(notification: Notification): string {
    const { type, metadata } = notification
    
    switch (type) {
      case 'like':
        if (metadata?.additionalCount && metadata.additionalCount > 0) {
          return `${metadata?.userNames?.[0]} and ${metadata.additionalCount} others liked "${metadata?.postTitle}"`
        }
        return `${metadata?.userNames?.[0]} liked "${metadata?.postTitle}"`
      
      case 'comment':
        return `${metadata?.userName} commented on "${metadata?.postTitle}"`
      
      case 'new_member':
        return `${metadata?.userName} became a new patron!`
      
      case 'commission':
        return `New commission request from ${metadata?.userName}`
      
      case 'dm':
        return `New message from ${metadata?.userName}`
      
      default:
        return notification.description
    }
  }

  // Adjust panel width for mobile
  const panelWidth = (isMobile || isTablet) ? 'w-[calc(100vw-2rem)]' : 'w-96'

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50">
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 bg-slate-900/90 backdrop-blur-sm rounded-full border border-white/10 
                   hover:bg-zinc-800/90 transition-all group shadow-lg hover:shadow-xl
                   ${isOpen ? 'ring-2 ring-red-600' : ''}
                   ${unreadCount > 0 ? 'animate-pulse-red' : ''}`}
      >
        <NotificationIcon />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-sky-600 
                          rounded-full flex items-center justify-center animate-pulse">
            <span className="text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
        
        {/* Tooltip - Hide on mobile */}
        {!(isMobile || isTablet) && (
          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black/90 
                          text-white text-xs rounded opacity-0 group-hover:opacity-100 
                          pointer-events-none transition-opacity whitespace-nowrap">
            Notifications
          </div>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute bottom-16 right-0 ${panelWidth} max-h-[500px] bg-slate-900 
                       rounded-lg border border-white/10 shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
                {(isMobile || isTablet) && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-white/20 rounded-full 
                                  animate-spin border-t-sky-500 mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-white/5 transition-colors cursor-pointer
                                  ${!notification.read ? 'bg-white/[0.02]' : ''}`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                        if (notification.link) {
                          window.location.href = notification.link
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg border flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read ? 'text-white font-medium' : 'text-gray-300'} break-words`}>
                            {formatNotificationText(notification)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Unread Indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-sky-600 rounded-full mt-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Close icon for mobile
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)