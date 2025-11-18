// src/app/admin/analytics/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts'
import { format, formatDistanceToNow, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns'

interface MetricsSnapshot {
  id: string
  created_at: string
  member_count: number
  total_members: number
  monthly_revenue: number
  currency: string
  tier_breakdown: Record<string, number>
  metadata?: {
    lifetime_revenue?: number
    campaign_start_date?: string
  }
}

interface AnalyticsData {
  current: MetricsSnapshot | null
  history: MetricsSnapshot[]
  lastUpdated: string | null
  isStale: boolean
}

// Professional color palette
const COLORS = {
  primary: '#a855f7', // Purple
  secondary: '#3b82f6', // Blue
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  muted: '#6b7280', // Gray
  
  // Chart specific colors
  revenue: '#a855f7',
  members: '#3b82f6',
  growth: '#10b981',
  decline: '#ef4444',
  
  // Tier colors
  tiers: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('£') 
              ? `£${entry.value.toLocaleString()}` 
              : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const { isCreator, isLoading } = useAdminAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    if (isCreator && !isLoading) {
      loadAnalyticsData()
    }
  }, [isCreator, isLoading])

  const loadAnalyticsData = async () => {
    try {
      setIsLoadingData(true)
      setError(null)

      const response = await fetch('/api/admin/analytics/metrics')
      if (!response.ok) {
        throw new Error('Failed to load analytics data')
      }

      const data = await response.json()
      setAnalyticsData(data)

      if (data.isStale) {
        await refreshMetrics()
      }
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoadingData(false)
    }
  }

  const refreshMetrics = async () => {
    try {
      setIsRefreshing(true)
      
      const response = await fetch('/api/admin/collect-patreon-metrics', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to refresh metrics')
      }

      await loadAnalyticsData()
    } catch (err) {
      console.error('Error refreshing metrics:', err)
      setError('Failed to refresh metrics')
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100)
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true }
    const growth = ((current - previous) / previous) * 100
    return { value: Math.abs(growth), isPositive: growth >= 0 }
  }

  const filterDataByTimeRange = (data: MetricsSnapshot[]) => {
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      case '90d':
        startDate = subDays(now, 90)
        break
      default:
        return data
    }
    
    return data.filter(snapshot => new Date(snapshot.created_at) >= startDate)
  }

  if (isLoading || !isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
      </div>
    )
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400 mt-1">Loading your campaign metrics...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-24 mb-3"></div>
                <div className="h-8 bg-zinc-800 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-sky-400 mb-2">Error Loading Analytics</h2>
            <p className="text-red-300">{error}</p>
            <button
              onClick={loadAnalyticsData}
              className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentMetrics = analyticsData?.current
  const allHistory = analyticsData?.history || []
  const filteredHistory = filterDataByTimeRange(allHistory)
  
  // Calculate key metrics
  const previousMetrics = filteredHistory.length > 1 ? filteredHistory[filteredHistory.length - 2] : null
  const oldestMetrics = filteredHistory.length > 0 ? filteredHistory[0] : null
  
  const revenueGrowth = previousMetrics && currentMetrics 
    ? calculateGrowth(currentMetrics.monthly_revenue, previousMetrics.monthly_revenue)
    : { value: 0, isPositive: true }
    
  const memberGrowth = previousMetrics && currentMetrics
    ? calculateGrowth(currentMetrics.member_count, previousMetrics.member_count)
    : { value: 0, isPositive: true }
    
  const periodGrowth = oldestMetrics && currentMetrics
    ? calculateGrowth(currentMetrics.member_count, oldestMetrics.member_count)
    : { value: 0, isPositive: true }

  // Calculate average revenue per member
  const avgRevenuePerPatron = currentMetrics && currentMetrics.member_count > 0
    ? currentMetrics.monthly_revenue / currentMetrics.member_count
    : 0

  // Calculate retention rate (active members / total members)
  const retentionRate = currentMetrics && currentMetrics.total_members > 0
    ? (currentMetrics.member_count / currentMetrics.total_members) * 100
    : 0

  // Prepare chart data
  const chartData = filteredHistory.map(snapshot => ({
    date: format(new Date(snapshot.created_at), 'MMM d'),
    revenue: snapshot.monthly_revenue / 100,
    members: snapshot.member_count,
    avgPerMember: snapshot.member_count > 0 ? (snapshot.monthly_revenue / 100) / snapshot.member_count : 0
  }))

  // Process tier data for better visualization
  const tierData = currentMetrics?.tier_breakdown 
    ? Object.entries(currentMetrics.tier_breakdown)
        .map(([tier, count]) => ({
          name: tier,
          value: count as number,
          percentage: ((count as number) / currentMetrics.member_count) * 100
        }))
        .sort((a, b) => b.value - a.value)
    : []

  // Calculate monthly recurring revenue projection
  const projectedAnnualRevenue = currentMetrics 
    ? (currentMetrics.monthly_revenue / 100) * 12
    : 0

  // Calculate lifetime value estimates
  const lifetimeRevenue = currentMetrics?.metadata?.lifetime_revenue 
    ? currentMetrics.metadata.lifetime_revenue / 100
    : projectedAnnualRevenue * 2 // Estimate if not available

  return (
      {/* Gradient background overlay */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Campaign performance metrics
                {analyticsData?.lastUpdated && (
                  <span className="text-sm ml-2">
                    • Updated {formatDistanceToNow(new Date(analyticsData.lastUpdated), { addSuffix: true })}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Time range selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-slate-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              
              <button
                onClick={refreshMetrics}
                disabled={isRefreshing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Monthly Revenue */}
          <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-1">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white mb-2">
                  {formatCurrency(currentMetrics?.monthly_revenue || 0, currentMetrics?.currency || 'GBP')}
                </p>
                {revenueGrowth.value !== 0 && (
                  <div className="flex items-center gap-1">
                    <svg 
                      className={`w-4 h-4 ${revenueGrowth.isPositive ? 'text-green-500' : 'text-sky-500'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d={revenueGrowth.isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} 
                      />
                    </svg>
                    <span className={`text-sm font-medium ${revenueGrowth.isPositive ? 'text-green-500' : 'text-sky-500'}`}>
                      {revenueGrowth.value.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs last period</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-purple-600/10 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Members */}
          <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-1">Active Members</p>
                <p className="text-2xl font-bold text-white mb-2">
                  {currentMetrics?.member_count || 0}
                </p>
                {memberGrowth.value !== 0 && (
                  <div className="flex items-center gap-1">
                    <svg 
                      className={`w-4 h-4 ${memberGrowth.isPositive ? 'text-green-500' : 'text-sky-500'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d={memberGrowth.isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} 
                      />
                    </svg>
                    <span className={`text-sm font-medium ${memberGrowth.isPositive ? 'text-green-500' : 'text-sky-500'}`}>
                      {memberGrowth.value.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs last period</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-blue-600/10 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Average per Patron */}
          <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-1">Avg. per Patron</p>
                <p className="text-2xl font-bold text-white mb-2">
                  {formatCurrency(avgRevenuePerPatron, currentMetrics?.currency || 'GBP')}
                </p>
                <p className="text-xs text-gray-500">
                  Per month
                </p>
              </div>
              <div className="p-3 bg-green-600/10 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Retention Rate */}
          <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-400 mb-1">Retention Rate</p>
                <p className="text-2xl font-bold text-white mb-2">
                  {retentionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  Active / Total Members
                </p>
              </div>
              <div className="p-3 bg-amber-600/10 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Members */}
          <div className="bg-slate-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Total Members</p>
            <p className="text-xl font-semibold text-white">
              {currentMetrics?.total_members?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              All-time signups
            </p>
          </div>

          {/* Projected Annual */}
          <div className="bg-slate-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Projected Annual</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(projectedAnnualRevenue * 100, currentMetrics?.currency || 'GBP')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Based on current MRR
            </p>
          </div>

          {/* Period Growth */}
          <div className="bg-slate-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Period Growth</p>
            <p className={`text-xl font-semibold ${periodGrowth.isPositive ? 'text-green-500' : 'text-sky-500'}`}>
              {periodGrowth.isPositive ? '+' : '-'}{periodGrowth.value.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Since {format(new Date(oldestMetrics?.created_at || new Date()), 'MMM d')}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue & Patron Trends */}
          <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue & Patron Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  yAxisId="revenue" 
                  stroke="#71717a" 
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                  tickFormatter={(value) => `£${value}`}
                />
                <YAxis 
                  yAxisId="patrons" 
                  orientation="right" 
                  stroke="#71717a" 
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.revenue}
                  fill={COLORS.revenue}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Revenue (£)"
                />
                <Line
                  yAxisId="patrons"
                  type="monotone"
                  dataKey="patrons"
                  stroke={COLORS.patrons}
                  strokeWidth={2}
                  name="Active Members"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tier Distribution */}
          <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tier Distribution</h3>
            {tierData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={300}>
                  <PieChart>
                    <Pie
                      data={tierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {tierData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.tiers[index % COLORS.tiers.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {tierData.map((tier, index) => (
                    <div key={tier.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS.tiers[index % COLORS.tiers.length] }}
                        />
                        <span className="text-sm text-gray-300">{tier.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-white">{tier.value}</span>
                        <span className="text-xs text-gray-500 ml-1">({tier.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">No tier data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Average Revenue per Patron Trend */}
        <div className="bg-slate-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Average Revenue per Patron Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => `£${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="avgPerMember"
                stroke={COLORS.success}
                fill={COLORS.success}
                fillOpacity={0.1}
                strokeWidth={2}
                name="Avg per Patron (£)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Insights Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Insights */}
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Quick Insights
            </h3>
            <div className="space-y-3">
              {avgRevenuePerPatron > 500 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-sm text-gray-300">
                    Your average revenue per member of {formatCurrency(avgRevenuePerPatron, 'GBP')} is excellent. 
                    Consider creating more premium tiers to capitalize on this.
                  </p>
                </div>
              )}
              
              {retentionRate < 30 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-sm text-gray-300">
                    Your retention rate of {retentionRate.toFixed(1)}% suggests many members aren't converting to paid. 
                    Consider improving your free tier benefits or engagement strategies.
                  </p>
                </div>
              )}
              
              {memberGrowth.isPositive && memberGrowth.value > 5 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-sm text-gray-300">
                    Strong patron growth of {memberGrowth.value.toFixed(1)}%! 
                    Keep up the momentum with consistent content and engagement.
                  </p>
                </div>
              )}
              
              {tierData.length > 0 && tierData[0].percentage > 60 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-sm text-gray-300">
                    {tierData[0].percentage.toFixed(0)}% of patrons are in your {tierData[0].name} tier. 
                    Consider creating intermediate tiers to capture more value.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions & Recommendations */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border border-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Recommended Actions
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-sm text-gray-300">Update tier benefits</span>
                <button className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Review Tiers
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-sm text-gray-300">Engage inactive members</span>
                <button className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Create Campaign
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-sm text-gray-300">Analyze content performance</span>
                <button className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  View Content Stats
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}