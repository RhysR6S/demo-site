// src/app/admin/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalSets: number
  publishedSets: number
  scheduledSets: number
  totalImages: number
  totalViews: number
  totalDownloads: number
  activePatrons: number
  monthlyRevenue: number
  recentUploads: Array<{
    id: string
    title: string
    imageCount: number
    createdAt: string
    status: 'published' | 'scheduled' | 'draft'
  }>
  popularContent: Array<{
    id: string
    title: string
    views: number
    downloads: number
  }>
  recentActivity: Array<{
    id: string
    type: 'view' | 'download' | 'like' | 'comment'
    userName: string
    contentTitle: string
    timestamp: string
  }>
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalSets: 0,
    publishedSets: 0,
    scheduledSets: 0,
    totalImages: 0,
    totalViews: 0,
    totalDownloads: 0,
    activePatrons: 0,
    monthlyRevenue: 0,
    recentUploads: [],
    popularContent: [],
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')

  useEffect(() => {
    loadDashboardStats()
  }, [timeRange])

  async function loadDashboardStats() {
    try {
      setLoading(true)

      // Fetch content statistics
      const [
        { count: totalSets },
        { count: publishedSets },
        { count: scheduledSets },
        { count: totalImages },
        { data: viewStats },
        { data: downloadStats },
        { data: recentSets },
        { data: popularSets },
        { data: recentActivities },
        { data: latestMetrics }
      ] = await Promise.all([
        // Total content sets
        supabase.from('content_sets').select('*', { count: 'exact', head: true }),
        
        // Published sets
        supabase.from('content_sets')
          .select('*', { count: 'exact', head: true })
          .not('published_at', 'is', null),
        
        // Scheduled sets
        supabase.from('content_sets')
          .select('*', { count: 'exact', head: true })
          .not('scheduled_time', 'is', null)
          .is('published_at', null),
        
        // Total images
        supabase.from('images').select('*', { count: 'exact', head: true }),
        
        // View statistics
        supabase.from('content_sets')
          .select('view_count')
          .not('view_count', 'is', null),
        
        // Download statistics
        supabase.from('content_sets')
          .select('download_count')
          .not('download_count', 'is', null),
        
        // Recent uploads (last 5)
        supabase.from('content_sets')
          .select('id, title, image_count, created_at, published_at, scheduled_time')
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Most popular content by views
        supabase.from('content_sets')
          .select('id, title, view_count, download_count')
          .not('published_at', 'is', null)
          .order('view_count', { ascending: false })
          .limit(5),
        
        // Recent activity
        supabase.from('user_activity')
          .select(`
            id,
            action,
            created_at,
            user_id,
            set_id,
            content_sets!inner (
              title
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10),
          
        // Fetch latest Patreon metrics from the same source as analytics page
        supabase
          .from('patreon_metrics_history')
          .select('patron_count, monthly_revenue')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ])

      // Calculate totals
      const totalViews = viewStats?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0
      const totalDownloads = downloadStats?.reduce((sum, item) => sum + (item.download_count || 0), 0) || 0

      // Get Patreon metrics from the fetched data
      const activePatrons = latestMetrics?.patron_count || 0
      const monthlyRevenue = latestMetrics?.monthly_revenue ? latestMetrics.monthly_revenue / 100 : 0 // Convert from cents to pounds

      // Format recent uploads
      const recentUploads = (recentSets || []).map(set => ({
        id: set.id,
        title: set.title,
        imageCount: set.image_count,
        createdAt: set.created_at,
        status: (set.published_at ? 'published' : set.scheduled_time ? 'scheduled' : 'draft') as 'published' | 'scheduled' | 'draft'
      }))

      // Format popular content
      const popularContent = (popularSets || []).map(set => ({
        id: set.id,
        title: set.title,
        views: set.view_count || 0,
        downloads: set.download_count || 0
      }))

      // Format recent activity - handle the joined content_sets data properly
      const recentActivity = (recentActivities || []).map(activity => {
        // The joined content_sets could be an object or an array
        const contentSet = Array.isArray(activity.content_sets) 
          ? activity.content_sets[0] 
          : activity.content_sets
        
        return {
          id: activity.id,
          type: activity.action as 'view' | 'download',
          userName: activity.user_id?.split('@')[0] || 'Anonymous', // Extract username from email
          contentTitle: contentSet?.title || 'Unknown Content',
          timestamp: getRelativeTime(activity.created_at)
        }
      })

      setStats({
        totalSets: totalSets || 0,
        publishedSets: publishedSets || 0,
        scheduledSets: scheduledSets || 0,
        totalImages: totalImages || 0,
        totalViews,
        totalDownloads,
        activePatrons,
        monthlyRevenue,
        recentUploads,
        popularContent,
        recentActivity
      })
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  function getRelativeTime(timestamp: string): string {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return then.toLocaleDateString()
  }

  const quickActions = [
    {
      title: 'Upload Content',
      description: 'Add new photo sets to your gallery',
      href: '/admin/upload',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'from-blue-600 to-blue-700'
    },
    {
      title: 'Manage Content',
      description: 'Edit or schedule existing content',
      href: '/admin/content',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-purple-600 to-purple-700'
    },
    {
      title: 'View Analytics',
      description: 'Deep dive into performance metrics',
      href: '/admin/analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-green-600 to-green-700'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-red-600/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back, {session?.user?.name || 'Creator'}
        </h1>
        <p className="text-gray-400 text-lg">Here's what's happening with your content today</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Content Overview */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalSets}</p>
          <p className="text-sm text-gray-400 mt-1">Content Sets</p>
          <div className="mt-2 text-xs text-gray-500">
            {stats.publishedSets} published • {stats.scheduledSets} scheduled
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">All time</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">Total Views</p>
          <div className="mt-2 text-xs text-gray-500">
            {stats.totalDownloads.toLocaleString()} downloads
          </div>
        </div>

        {/* Active Patrons */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">Active</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.activePatrons}</p>
          <p className="text-sm text-gray-400 mt-1">Patrons</p>
          <Link href="/admin/analytics" className="mt-2 text-xs text-green-400 hover:text-green-300">
            View growth →
          </Link>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-600/20 rounded-lg">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">Monthly</span>
          </div>
          <p className="text-3xl font-bold text-white">£{stats.monthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">Revenue</p>
          <div className="mt-2 text-xs text-gray-500">
            £{(stats.monthlyRevenue * 12).toLocaleString()}/year projected
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${action.color} mb-4 group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
              <p className="text-sm text-gray-400">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Uploads */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Recent Uploads</h2>
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 space-y-4">
              {stats.recentUploads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No content uploaded yet</p>
              ) : (
                stats.recentUploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div>
                      <p className="text-white font-medium">{upload.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {upload.imageCount} images • {getRelativeTime(upload.createdAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      upload.status === 'published' ? 'bg-green-600/20 text-green-400' :
                      upload.status === 'scheduled' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {upload.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Popular Content */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Top Performing Content</h2>
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 space-y-4">
              {stats.popularContent.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No published content yet</p>
              ) : (
                stats.popularContent.map((content, index) => (
                  <div key={content.id} className="flex items-center gap-4 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="text-2xl font-bold text-gray-600 w-8">#{index + 1}</div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{content.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {content.views.toLocaleString()} views • {content.downloads.toLocaleString()} downloads
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl border border-white/5 overflow-hidden">
          <div className="p-6 space-y-4">
            {stats.recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'view' ? 'bg-purple-600/20 text-purple-500' :
                    activity.type === 'download' ? 'bg-green-600/20 text-green-500' :
                    activity.type === 'like' ? 'bg-red-600/20 text-red-500' :
                    'bg-blue-600/20 text-blue-500'
                  }`}>
                    {activity.type === 'view' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : activity.type === 'download' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    ) : activity.type === 'like' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      <span className="font-medium">{activity.userName}</span>
                      <span className="text-gray-400 mx-2">
                        {activity.type === 'view' ? 'viewed' :
                         activity.type === 'download' ? 'downloaded' :
                         activity.type === 'like' ? 'liked' : 'commented on'}
                      </span>
                      <span className="font-medium">{activity.contentTitle}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
