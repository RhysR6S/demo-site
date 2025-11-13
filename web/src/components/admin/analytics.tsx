// src/components/admin/analytics.tsx
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/currency'

interface PatreonMetrics {
  patronCount: number
  totalMembers: number
  monthlyRevenue: number
  lifetimeRevenue: number
  tierBreakdown: Record<string, number>
  currency: string
  campaignStartDate?: string
}

interface HistoricalPatreonMetrics extends PatreonMetrics {
  // Changes calculated from historical data
  newPatronsInPeriod: number
  churnedPatronsInPeriod: number
  lostPatronsInPeriod: number
  revenueChangeInPeriod: number
  growthRate: number
  averagePatronValue: number
  
  // Data availability
  dataAvailable: boolean
  oldestDataPoint?: Date
  comparisonDataPoint?: Date
}

interface DataAvailability {
  hasData: boolean
  oldestSnapshot?: Date
  latestSnapshot?: Date
  totalSnapshots: number
  availableTimeRanges: string[]
  nextAvailableRange?: {
    range: string
    availableIn: string
  }
}

interface AnalyticsData {
  // Platform metrics
  totalSets: number
  totalImages: number
  totalViews: number
  totalDownloads: number
  storageUsed: number
  
  // Engagement metrics
  totalLikes: number
  totalComments: number
  totalMembers: number
  newMembers: number
  returningMembers: number
  
  // Activity data
  recentActivity: any[]
  popularSets: any[]
  
  // Revenue & Patreon
  patreonMetrics?: HistoricalPatreonMetrics
  patreonLastUpdated?: string
  dataAvailability?: DataAvailability
}

// Metric card component with icon
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; isPositive: boolean }
  icon: React.ReactNode
  valueClassName?: string
  loading?: boolean
  unavailable?: boolean
  unavailableMessage?: string
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon, 
  valueClassName = "text-white", 
  loading = false,
  unavailable = false,
  unavailableMessage = "No data yet"
}: MetricCardProps) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-zinc-800 rounded-lg">
          {icon}
        </div>
        {trend && !loading && !unavailable && (
          <div className={`flex items-center text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <svg className={`w-4 h-4 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 bg-zinc-800 rounded animate-pulse" />
      ) : unavailable ? (
        <div>
          <p className="text-xl font-medium text-gray-600">--</p>
          <p className="text-xs text-gray-500 mt-1">{unavailableMessage}</p>
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  )
}

// Data Collection Notice Component
function DataCollectionNotice({ availability, onCollectNow }: { 
  availability: DataAvailability
  onCollectNow: () => void 
}) {
  return (
    <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-800/20 rounded-lg">
          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">Building Your Analytics History</h3>
          
          {!availability.hasData ? (
            <>
              <p className="text-gray-300 mb-4">
                We need to collect data over time to show you accurate patron growth metrics. 
                Click below to start collecting your first data point.
              </p>
              <button
                onClick={onCollectNow}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                Collect First Data Point
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-3">
                We're collecting your Patreon metrics to build historical comparisons. 
                Currently available time ranges:
              </p>
              <div className="space-y-2 mb-4">
                {availability.availableTimeRanges.length > 0 ? (
                  availability.availableTimeRanges.map(range => (
                    <div key={range} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-300">
                        {range === '24h' ? 'Last 24 hours' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No time ranges available yet</p>
                )}
                {availability.nextAvailableRange && (
                  <div className="flex items-center gap-2 mt-3">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-400">
                      {availability.nextAvailableRange.range === '24h' ? '24-hour' : 
                       availability.nextAvailableRange.range === '7d' ? '7-day' : '30-day'} comparisons 
                      available {availability.nextAvailableRange.availableIn}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                <p>Started collecting: {availability.oldestSnapshot?.toLocaleDateString()}</p>
                <p>Total data points: {availability.totalSnapshots}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Revenue display component
function RevenueDisplay({ monthly, yearly, currency, growth }: { 
  monthly: number
  yearly: number
  currency: string
  growth?: number
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-400 mb-1">Monthly Revenue</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(monthly, currency)}
          </p>
        </div>
        {growth !== undefined && (
          <div className={`flex items-center text-sm ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <svg className={`w-4 h-4 mr-1 ${growth < 0 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <div className="pt-4 border-t border-zinc-800">
        <p className="text-sm text-gray-400 mb-1">Yearly Projection</p>
        <p className="text-xl font-bold text-gray-300">
          {formatCurrency(yearly, currency)}
        </p>
      </div>
    </div>
  )
}

export function Analytics() {
  const { data: session } = useSession()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [collectingData, setCollectingData] = useState(false)

  useEffect(() => {
    if (session?.user) {
      loadAnalytics()
    }
  }, [session, timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch analytics data
      const response = await fetch('/api/admin/analytics')
      const analyticsData = await response.json()
      
      if (response.ok) {
        setData(analyticsData)
      } else {
        throw new Error(analyticsData.error || 'Failed to load analytics')
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const collectPatreonData = async () => {
    try {
      setCollectingData(true)
      
      const response = await fetch('/api/admin/collect-patreon-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Reload analytics to show new data
        await loadAnalytics()
      } else {
        throw new Error(result.error || 'Failed to collect data')
      }
    } catch (error) {
      console.error('Error collecting Patreon data:', error)
      alert('Failed to collect Patreon data. Please check your Patreon integration.')
    } finally {
      setCollectingData(false)
    }
  }

  // Calculate growth metrics
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  // Check data availability
  const checkDataAvailability = (): DataAvailability => {
    if (!data?.dataAvailability) {
      return {
        hasData: false,
        totalSnapshots: 0,
        availableTimeRanges: [],
      }
    }
    
    const availability = data.dataAvailability
    const now = new Date()
    const oldest = availability.oldestSnapshot ? new Date(availability.oldestSnapshot) : now
    const hoursSinceFirst = (now.getTime() - oldest.getTime()) / (1000 * 60 * 60)
    
    const ranges: string[] = []
    let nextAvailableRange: { range: string; availableIn: string } | undefined
    
    // Check which time ranges are available
    if (hoursSinceFirst >= 24) {
      ranges.push('24h')
    } else if (!nextAvailableRange) {
      const hoursUntil24 = Math.ceil(24 - hoursSinceFirst)
      nextAvailableRange = {
        range: '24h',
        availableIn: hoursUntil24 === 1 ? 'in 1 hour' : `in ${hoursUntil24} hours`
      }
    }
    
    if (hoursSinceFirst >= 24 * 7) {
      ranges.push('7d')
    } else if (!nextAvailableRange) {
      const daysUntil7 = Math.ceil((24 * 7 - hoursSinceFirst) / 24)
      nextAvailableRange = {
        range: '7d',
        availableIn: daysUntil7 === 1 ? 'tomorrow' : `in ${daysUntil7} days`
      }
    }
    
    if (hoursSinceFirst >= 24 * 30) {
      ranges.push('30d')
    } else if (!nextAvailableRange) {
      const daysUntil30 = Math.ceil((24 * 30 - hoursSinceFirst) / 24)
      nextAvailableRange = {
        range: '30d',
        availableIn: `in ${daysUntil30} days`
      }
    }
    
    return {
      ...availability,
      availableTimeRanges: ranges,
      nextAvailableRange
    }
  }

  const availability = checkDataAvailability()
  const patreonMetrics = data?.patreonMetrics

  return (
    <div className="space-y-8">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-600"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {/* Data collection notice */}
      {(!availability.hasData || availability.availableTimeRanges.length < 3) && (
        <DataCollectionNotice 
          availability={availability} 
          onCollectNow={collectPatreonData}
        />
      )}

      {/* Platform Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Platform Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Sets"
            value={data?.totalSets || 0}
            icon={
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            loading={loading}
          />
          <MetricCard
            title="Total Images"
            value={data?.totalImages || 0}
            icon={
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            loading={loading}
          />
          <MetricCard
            title="Total Views"
            value={data?.totalViews || 0}
            icon={
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            loading={loading}
          />
          <MetricCard
            title="Storage Used"
            value={`${Math.round((data?.storageUsed || 0) / (1024 * 1024 * 1024))} GB`}
            icon={
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            }
            loading={loading}
          />
        </div>
      </div>

      {/* Engagement Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Likes"
            value={data?.totalLikes || 0}
            icon={
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
            loading={loading}
          />
          <MetricCard
            title="Total Comments"
            value={data?.totalComments || 0}
            icon={
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            loading={loading}
          />
          <MetricCard
            title="Total Members"
            value={data?.totalMembers || 0}
            icon={
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            loading={loading}
          />
          <MetricCard
            title="Downloads"
            value={data?.totalDownloads || 0}
            icon={
              <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
            loading={loading}
          />
        </div>
      </div>

      {/* Patreon Metrics */}
      {patreonMetrics && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Patreon Metrics</h3>
            <button
              onClick={collectPatreonData}
              disabled={collectingData}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                collectingData 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {collectingData ? 'Collecting...' : 'Update Now'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Active Patrons"
              value={patreonMetrics.patronCount}
              subtitle={patreonMetrics.dataAvailable ? `${patreonMetrics.newPatronsInPeriod >= 0 ? '+' : ''}${patreonMetrics.newPatronsInPeriod} new` : undefined}
              trend={patreonMetrics.dataAvailable ? {
                value: calculateGrowth(patreonMetrics.patronCount, patreonMetrics.patronCount - patreonMetrics.newPatronsInPeriod),
                isPositive: patreonMetrics.newPatronsInPeriod >= 0
              } : undefined}
              icon={
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              loading={loading}
              unavailable={!patreonMetrics.dataAvailable && availability.availableTimeRanges.length === 0}
              unavailableMessage={availability.nextAvailableRange ? `Available ${availability.nextAvailableRange.availableIn}` : "Collecting first data point"}
            />
            
            <div className="md:col-span-2 lg:col-span-1">
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-zinc-800 rounded-lg">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-2">Revenue</p>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-6 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ) : (
                  <RevenueDisplay
                    monthly={patreonMetrics.monthlyRevenue}
                    yearly={patreonMetrics.monthlyRevenue * 12}
                    currency={patreonMetrics.currency}
                    growth={patreonMetrics.dataAvailable ? patreonMetrics.growthRate : undefined}
                  />
                )}
              </div>
            </div>
            
            <MetricCard
              title="Avg. Patron Value"
              value={patreonMetrics.averagePatronValue ? formatCurrency(patreonMetrics.averagePatronValue, patreonMetrics.currency) : '$0'}
              icon={
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
              loading={loading}
            />
            
            <MetricCard
              title="Churn Rate"
              value={patreonMetrics.dataAvailable ? `${Math.abs(patreonMetrics.churnedPatronsInPeriod)}` : '--'}
              subtitle={patreonMetrics.dataAvailable ? "patrons lost" : undefined}
              trend={patreonMetrics.dataAvailable && patreonMetrics.patronCount > 0 ? {
                value: Math.round((patreonMetrics.churnedPatronsInPeriod / patreonMetrics.patronCount) * 100),
                isPositive: false
              } : undefined}
              icon={
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              }
              loading={loading}
              unavailable={!patreonMetrics.dataAvailable && availability.availableTimeRanges.length === 0}
              unavailableMessage={availability.nextAvailableRange ? `Available ${availability.nextAvailableRange.availableIn}` : "Collecting first data point"}
            />
          </div>

          {/* Last updated info */}
          {data.patreonLastUpdated && (
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {new Date(data.patreonLastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
