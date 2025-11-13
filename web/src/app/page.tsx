// src/app/page.tsx
// src/app/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { motion } from "framer-motion"

// Icons with enhanced design
const ViewIcon = () => (
  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </div>
)

const DownloadIcon = () => (
  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  </div>
)

const StarIcon = () => (
  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  </div>
)

const NewIcon = () => (
  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </div>
)

const MessageIcon = () => (
  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  </div>
)

const ContentIcon = () => (
  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  </div>
)

interface RecentActivity {
  id: string
  type: 'message' | 'new_content'
  content: string
  timestamp: string
  link?: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [hasTrackingConsent, setHasTrackingConsent] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    viewedSets: 0,
    downloadedSets: 0,
    commissionCount: 0,
    unreadMessages: 0,
    newContent: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      checkTrackingConsent()
      loadUserStats()
      loadRecentActivity()
    }
  }, [session])

  async function checkTrackingConsent() {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/privacy/settings')
      if (response.ok) {
        const data = await response.json()
        setHasTrackingConsent(data.trackingConsent)
        
        if (data.trackingConsent) {
          loadRecentActivity()
        }
      }
    } catch (error) {
      console.log('Error checking consent:', error)
    }
  }

  async function loadUserStats() {
    if (!session?.user) return

    try {
      const response = await fetch('/api/user/stats')
      
      if (!response.ok) {
        throw new Error('Failed to load stats')
      }

      const data = await response.json()
      
      setStats({
        viewedSets: data.viewedSets || 0,
        downloadedSets: data.downloadedSets || 0,
        commissionCount: data.commissionCount || 0,
        unreadMessages: data.unreadMessages || 0,
        newContent: data.newContent || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  async function loadRecentActivity() {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/user/recent-activity')
      
      if (!response.ok) {
        throw new Error('Failed to load activity')
      }

      const data = await response.json()
      console.log('Recent activity data:', data.activities) // Debug
      setRecentActivity(data.activities || [])
    } catch (error) {
      console.error('Error loading activity:', error)
    }
  }

  function formatActivityDate(timestamp: string | Date | null | undefined): string {
    if (!timestamp) return 'Unknown time'
    
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return 'Unknown time'
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown time'
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-red-600/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-3">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Patron'}!
          </h1>
          <p className="text-gray-400 text-lg">
            Your exclusive content awaits
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <ViewIcon />
                <span className="text-3xl font-bold text-white">{stats.viewedSets}</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Sets Viewed</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <DownloadIcon />
                <span className="text-3xl font-bold text-white">{stats.downloadedSets}</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Downloaded</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <StarIcon />
                <span className="text-3xl font-bold text-white">{stats.commissionCount}</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Commissions</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <NewIcon />
                <span className="text-3xl font-bold text-white flex items-center">
                  {stats.newContent}
                  {stats.newContent > 0 && (
                    <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </span>
              </div>
              <p className="text-gray-400 text-sm font-medium">New This Week</p>
            </div>
          </motion.div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/gallery" className="block group">
              <div className="relative bg-gradient-to-br from-zinc-900 to-black p-8 rounded-2xl border border-zinc-800 hover:border-red-600/50 transition-all duration-300 overflow-hidden h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-red-500/25 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-red-400 transition-colors">Browse Gallery</h3>
                  <p className="text-gray-400 leading-relaxed">Explore all exclusive content</p>
                  <div className="mt-6 flex items-center text-red-400 font-medium">
                    <span>View Content</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link href="/commissions" className="block group">
              <div className="relative bg-gradient-to-br from-zinc-900 to-black p-8 rounded-2xl border border-zinc-800 hover:border-purple-600/50 transition-all duration-300 overflow-hidden h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">Request Commission</h3>
                  <p className="text-gray-400 leading-relaxed">Get custom content created</p>
                  <div className="mt-6 flex items-center text-purple-400 font-medium">
                    <span>Start Request</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Link href="/community" className="block group">
              <div className="relative bg-gradient-to-br from-zinc-900 to-black p-8 rounded-2xl border border-zinc-800 hover:border-blue-600/50 transition-all duration-300 overflow-hidden h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Join Community</h3>
                  <p className="text-gray-400 leading-relaxed">Connect with other patrons</p>
                  <div className="mt-6 flex items-center text-blue-400 font-medium">
                    <span>Enter Community</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Activity Tracking Notice */}
        {!hasTrackingConsent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-gray-300">
                    Activity tracking is disabled. 
                    <Link href="/privacy/manage" className="ml-1 text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      Enable tracking
                    </Link>
                    {' '}to see your recent activity.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Recent Updates</h2>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  {activity.link ? (
                    <Link href={activity.link} className="block">
                      <div className="bg-gradient-to-br from-zinc-900 to-black p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {activity.type === 'message' && <MessageIcon />}
                            {activity.type === 'new_content' && <ContentIcon />}
                            <div>
                              <p className="text-white font-medium">{activity.content}</p>
                              <p className="text-gray-500 text-sm">
                                {formatActivityDate(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-gradient-to-br from-zinc-900 to-black p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center space-x-3">
                        {activity.type === 'message' && <MessageIcon />}
                        {activity.type === 'new_content' && <ContentIcon />}
                        <div>
                          <p className="text-white font-medium">{activity.content}</p>
                          <p className="text-gray-500 text-sm">
                            {formatActivityDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
