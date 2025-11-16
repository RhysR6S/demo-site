// src/app/admin/commissions/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProgressLink as Link } from '@/components/progress-link'
import { getWeightColor } from '@/app/commissions/constants'

interface Commission {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_tier: string
  type: 'set' | 'custom'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'archived'
  is_free_tier: boolean
  request_data: any
  created_at: string
  completed_at: string | null
  notes: string | null
}

export default function AdminCommissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operatingCommissions, setOperatingCommissions] = useState<Set<string>>(new Set())
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user?.isCreator)) {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.isCreator) {
      fetchCommissions()
    }
  }, [session])

  const fetchCommissions = useCallback(async () => {
    try {
      setFetchError(null)
      const response = await fetch('/api/admin/commissions')
      if (response.ok) {
        const data = await response.json()
        setCommissions(data.commissions || [])
      } else {
        setFetchError('Failed to load commissions')
      }
    } catch (error) {
      console.error('Error fetching commissions:', error)
      setFetchError('Network error while loading commissions')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCommissionStatus = useCallback(async (commissionId: string, newStatus: string) => {
    // Add to operating set
    setOperatingCommissions(prev => new Set(prev).add(commissionId))
    
    // Optimistic update
    const previousCommissions = [...commissions]
    const previousSelectedCommission = selectedCommission
    
    const updatedCommission = commissions.find(c => c.id === commissionId)
    if (!updatedCommission) return
    
    const newCommissionData = {
      ...updatedCommission,
      status: newStatus as Commission['status'],
      completed_at: newStatus === 'completed' ? new Date().toISOString() : updatedCommission.completed_at
    }
    
    // Update both commissions array and selectedCommission if it's the current one
    setCommissions(prev => prev.map(c => 
      c.id === commissionId ? newCommissionData : c
    ))
    
    if (selectedCommission?.id === commissionId) {
      setSelectedCommission(newCommissionData)
    }
    
    try {
      const response = await fetch(`/api/admin/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update with actual server response
        if (result.commission) {
          setCommissions(prev => prev.map(c => 
            c.id === commissionId ? { ...c, ...result.commission } : c
          ))
          
          if (selectedCommission?.id === commissionId) {
            setSelectedCommission(prev => prev ? { ...prev, ...result.commission } : null)
          }
        }
        
        // If archiving, remove from local state
        if (newStatus === 'archived') {
          setCommissions(prev => prev.filter(c => c.id !== commissionId))
          if (selectedCommission?.id === commissionId) {
            setSelectedCommission(null)
          }
        }
      } else {
        // Revert on failure
        setCommissions(previousCommissions)
        setSelectedCommission(previousSelectedCommission)
        alert('Failed to update commission status')
      }
    } catch (error) {
      console.error('Error updating commission:', error)
      setCommissions(previousCommissions)
      setSelectedCommission(previousSelectedCommission)
      alert('Failed to update commission status')
    } finally {
      // Remove from operating set
      setOperatingCommissions(prev => {
        const next = new Set(prev)
        next.delete(commissionId)
        return next
      })
    }
  }, [commissions, selectedCommission])

  const deleteCommission = useCallback(async () => {
    if (!selectedCommission) return
    
    if (!confirm('Are you sure you want to permanently delete this commission? This action cannot be undone.')) {
      return
    }
    
    setIsDeleting(true)
    setOperatingCommissions(prev => new Set(prev).add(selectedCommission.id))
    
    try {
      const response = await fetch(`/api/admin/commissions/${selectedCommission.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCommissions(prev => prev.filter(c => c.id !== selectedCommission.id))
        setSelectedCommission(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete commission')
      }
    } catch (error) {
      console.error('Error deleting commission:', error)
      alert('Failed to delete commission')
    } finally {
      setIsDeleting(false)
      setOperatingCommissions(prev => {
        const next = new Set(prev)
        next.delete(selectedCommission.id)
        return next
      })
    }
  }, [selectedCommission])

  const archiveCommission = useCallback(async () => {
    if (!selectedCommission) return
    
    if (!confirm('Are you sure you want to archive this commission? You can restore it from the archives later.')) {
      return
    }
    
    await updateCommissionStatus(selectedCommission.id, 'archived')
  }, [selectedCommission, updateCommissionStatus])

  const exportCommission = useCallback(async () => {
    if (!selectedCommission) return
    
    setIsExporting(true)
    try {
      const response = await fetch(`/api/admin/commissions/${selectedCommission.id}/export`)
      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const characterName = selectedCommission.request_data.femaleCharacters?.[0]?.replace(/[^a-zA-Z0-9]/g, '_') || 'commission'
        a.download = `pose_weights_${characterName}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting commission:', error)
    } finally {
      setIsExporting(false)
    }
  }, [selectedCommission])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10'
      case 'in_progress': return 'text-blue-500 bg-blue-500/10'
      case 'completed': return 'text-green-500 bg-green-500/10'
      case 'cancelled': return 'text-red-500 bg-red-500/10'
      case 'archived': return 'text-gray-500 bg-gray-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const getTierColor = (tier: string) => {
    const tierLower = tier.toLowerCase()
    switch (tierLower) {
      case 'bronze': return 'text-orange-400'
      case 'silver': return 'text-gray-400'
      case 'gold': return 'text-yellow-400'
      case 'diamond': return 'text-cyan-400'
      case 'platinum': return 'text-purple-400'
      case 'creator': return 'text-pink-400'
      case 'public': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getCommissionBorderColor = (commission: Commission) => {
    // Show operating state
    if (operatingCommissions.has(commission.id)) {
      return 'border-yellow-500 shadow-lg shadow-yellow-500/20 opacity-75'
    }
    
    // Special border color for public commissions
    if (commission.user_tier === 'public') {
      if (selectedCommission?.id === commission.id) {
        return 'border-blue-500 shadow-lg shadow-blue-500/20'
      }
      return 'border-blue-500/50 hover:border-blue-500'
    }
    // Default border based on selection
    return selectedCommission?.id === commission.id
      ? 'border-purple-500 shadow-lg shadow-purple-500/20'
      : 'border-zinc-800 hover:border-zinc-700'
  }

  const biasLabels: Record<string, string> = {
    vaginal: 'Vaginal',
    anal: 'Anal',
    oral: 'Oral',
    handjobTitjob: 'Handjob/Titjob',
    masturbation: 'Masturbation',
    rimming: 'Rimming',
    worshippingSmothering: 'Worshipping/Smothering',
    povSex: 'POV Sex',
    nonPovSex: 'Non-POV Sex',
    twoGirls: '2Girls Scenes'
  }

  // Memoized filtered commissions
  const filteredCommissions = useMemo(() => {
    return commissions
      .filter(commission => {
        if (statusFilter !== 'all' && commission.status !== statusFilter) return false
        if (typeFilter !== 'all' && commission.type !== typeFilter) return false
        if (tierFilter === 'free' && !commission.is_free_tier) return false
        if (tierFilter === 'paid' && commission.is_free_tier) return false
        if (tierFilter === 'public' && commission.user_tier !== 'public') return false
        if (tierFilter === 'supporters' && commission.user_tier === 'public') return false
        return true
      })
      .sort((a, b) => {
        // Sort by created_at in ascending order (oldest first)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
  }, [commissions, statusFilter, typeFilter, tierFilter])

  // Memoized stats
  const stats = useMemo(() => ({
    pending: commissions.filter(c => c.status === 'pending').length,
    inProgress: commissions.filter(c => c.status === 'in_progress').length,
    freeTier: commissions.filter(c => c.is_free_tier && c.status !== 'completed' && c.status !== 'archived').length,
    paid: commissions.filter(c => !c.is_free_tier && c.user_tier !== 'public' && c.status !== 'completed' && c.status !== 'archived').length,
    public: commissions.filter(c => c.user_tier === 'public' && c.status !== 'completed' && c.status !== 'archived').length
  }), [commissions])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-red-600/20 rounded-full animate-spin border-t-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Commission Requests</h1>
          <p className="text-gray-400">Manage and track all commission requests from your members and public submissions.</p>
          
          {fetchError && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg">
              <p className="text-red-400">{fetchError}</p>
              <button
                onClick={fetchCommissions}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Stats Summary */}
          <div className="mt-4 grid grid-cols-5 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Pending</p>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Free Tier</p>
              <p className="text-2xl font-bold text-green-400">{stats.freeTier}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Paid (Supporters)</p>
              <p className="text-2xl font-bold text-purple-400">{stats.paid}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Public</p>
              <p className="text-2xl font-bold text-blue-400">{stats.public}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="set">Character Sets</option>
            <option value="custom">Custom Images</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="supporters">Supporters Only</option>
            <option value="public">Public Only</option>
            <option value="free">Free Tier Only</option>
            <option value="paid">Paid Only</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commission List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Active Requests</h2>
            
            {filteredCommissions.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">No commission requests found.</p>
              </div>
            ) : (
              filteredCommissions.map(commission => (
                <div
                  key={commission.id}
                  onClick={() => setSelectedCommission(commission)}
                  className={`bg-zinc-900 border-2 rounded-lg p-4 cursor-pointer transition-all ${getCommissionBorderColor(commission)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        {commission.user_tier === 'public' && (
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {commission.user_name}
                        {operatingCommissions.has(commission.id) && (
                          <svg className="animate-spin h-3 w-3 text-yellow-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </h3>
                      {commission.user_tier === 'public' && commission.request_data.isPublic ? (
                        <div className="text-sm text-gray-400 mt-1">
                          <div className="flex items-center gap-2">
                            {commission.request_data.contactPlatform === 'x' ? (
                              <>
                                <span className="text-blue-400">𝕏</span>
                                <span>@{commission.request_data.contactUsername}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-orange-400">☕</span>
                                <span>Ko-Fi: {commission.request_data.contactUsername}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-400">{commission.user_email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className={`font-semibold ${getTierColor(commission.user_tier)}`}>
                              {commission.user_tier.charAt(0).toUpperCase() + commission.user_tier.slice(1)}
                            </span>
                            {commission.user_tier !== 'public' && ' member'}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {commission.user_tier === 'public' ? (
                        <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded-full font-semibold">
                          PUBLIC
                        </span>
                      ) : commission.is_free_tier ? (
                        <span className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full font-semibold">
                          FREE TIER
                        </span>
                      ) : (
                        <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded-full font-semibold">
                          PAID
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(commission.status)}`}>
                        {commission.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(commission.created_at)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      commission.type === 'set' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {commission.type === 'set' ? 'Character Set' : 'Custom Image'}
                    </span>
                    {commission.request_data.mode && (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        commission.request_data.mode === 'advanced' 
                          ? 'bg-orange-500/10 text-orange-400' 
                          : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {commission.request_data.mode === 'advanced' ? 'Advanced' : 'Simple'}
                      </span>
                    )}
                  </div>

                  {/* Price preview in list */}
                  {commission.request_data.price !== undefined && !commission.is_free_tier && (
                    <div className="mt-2 text-sm text-green-400">
                      ${commission.request_data.price.toFixed(2)} USD
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Commission Details */}
          <div className="sticky top-8">
            <h2 className="text-xl font-semibold text-white mb-4">Commission Details</h2>
            
            {selectedCommission ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                {/* Commission Type Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedCommission.user_tier === 'public' ? (
                      <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        PUBLIC COMMISSION
                      </div>
                    ) : selectedCommission.is_free_tier ? (
                      <div className="bg-green-600/20 text-green-400 px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        FREE TIER COMMISSION
                      </div>
                    ) : (
                      <div className="bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        PAID COMMISSION
                      </div>
                    )}
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedCommission.status)}`}>
                    {selectedCommission.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Contact Information for Public Commissions */}
                {selectedCommission.user_tier === 'public' && selectedCommission.request_data.isPublic && (
                  <div className="mb-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">Contact Information</h4>
                    <div className="flex items-center gap-3">
                      {selectedCommission.request_data.contactPlatform === 'x' ? (
                        <>
                          <span className="text-2xl">𝕏</span>
                          <div>
                            <p className="text-white font-medium">@{selectedCommission.request_data.contactUsername}</p>
                            <a 
                              href={`https://x.com/${selectedCommission.request_data.contactUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              View Profile →
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">☕</span>
                          <div>
                            <p className="text-white font-medium">{selectedCommission.request_data.contactUsername}</p>
                            <a 
                              href={`https://ko-fi.com/${selectedCommission.request_data.contactUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-orange-400 hover:text-orange-300"
                            >
                              View Ko-Fi Profile →
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Display */}
                {selectedCommission.request_data.price !== undefined && (
                  <div className="mb-4 p-3 bg-purple-900/20 border border-purple-900/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Commission Price:</span>
                      <span className="text-xl font-bold text-white">
                        {selectedCommission.is_free_tier ? (
                          <>
                            <span className="text-green-400">FREE</span>
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ${selectedCommission.request_data.price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          `$${selectedCommission.request_data.price.toFixed(2)} USD`
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Export Button */}
                {selectedCommission.type === 'set' && (
                  <button
                    onClick={exportCommission}
                    disabled={isExporting || operatingCommissions.has(selectedCommission.id)}
                    className="w-full mb-4 py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Pose Weights JSON
                      </>
                    )}
                  </button>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selectedCommission.user_name}</h3>
                      {selectedCommission.user_tier !== 'public' && (
                        <p className="text-sm text-gray-400">{selectedCommission.user_email}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Tier: <span className={`font-semibold ${getTierColor(selectedCommission.user_tier)}`}>
                          {selectedCommission.user_tier.charAt(0).toUpperCase() + selectedCommission.user_tier.slice(1)}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>Submitted: {formatDate(selectedCommission.created_at)}</p>
                    {selectedCommission.completed_at && (
                      <p>Completed: {formatDate(selectedCommission.completed_at)}</p>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="mb-6">
                  <h4 className="font-semibold text-white mb-3">Request Details</h4>
                  
                  {selectedCommission.type === 'set' ? (
                    <div className="space-y-3 text-sm">
                      {/* Mode indicator */}
                      {selectedCommission.request_data.mode && (
                        <div className="mb-3 p-2 bg-zinc-800 rounded-lg">
                          <span className="text-gray-400">Preference Mode: </span>
                          <span className={`font-medium ${
                            selectedCommission.request_data.mode === 'advanced' 
                              ? 'text-orange-400' 
                              : 'text-gray-300'
                          }`}>
                            {selectedCommission.request_data.mode === 'advanced' ? 'Advanced' : 'Simple'}
                          </span>
                        </div>
                      )}

                      {/* Female Characters */}
                      {selectedCommission.request_data.femaleCharacters?.length > 0 && (
                        <div>
                          <span className="text-gray-400">Female Characters:</span>
                          <ul className="list-disc list-inside text-white mt-1">
                            {selectedCommission.request_data.femaleCharacters.map((char: string, index: number) => (
                              <li key={index}>{char || <span className="text-gray-500 italic">Not specified</span>}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Male Character */}
                      {selectedCommission.request_data.maleCharacter && (
                        <div>
                          <span className="text-gray-400">Male Character:</span>
                          <p className="text-white">{selectedCommission.request_data.maleCharacter}</p>
                        </div>
                      )}
                      
                      {/* Locations */}
                      {selectedCommission.request_data.locations?.length > 0 && selectedCommission.request_data.locations.some((l: string) => l) && (
                        <div>
                          <span className="text-gray-400">Locations:</span>
                          <ul className="list-disc list-inside text-white mt-1">
                            {selectedCommission.request_data.locations.filter((l: string) => l).map((loc: string, index: number) => (
                              <li key={index}>{loc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Body Type */}
                      {selectedCommission.request_data.bodyType && (
                        <div>
                          <span className="text-gray-400">Body Type:</span>
                          <p className="text-white">{selectedCommission.request_data.bodyType}</p>
                        </div>
                      )}

                      {/* Image Distribution */}
                      {selectedCommission.type === 'set' && selectedCommission.request_data.imageDistribution && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Image Distribution:</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-300">Solo</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${Math.min(selectedCommission.request_data.imageDistribution.solo || 0, 300)}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs w-10 text-right">{selectedCommission.request_data.imageDistribution.solo || 0}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-300">2Girls (FF)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${Math.min(selectedCommission.request_data.imageDistribution.duo_ff || 0, 300)}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs w-10 text-right">{selectedCommission.request_data.imageDistribution.duo_ff || 0}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-300">1Boy1Girl (Both Visible)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${Math.min(selectedCommission.request_data.imageDistribution.duo_mf || 0, 300)}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs w-10 text-right">{selectedCommission.request_data.imageDistribution.duo_mf || 0}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-300">1Boy1Girl (POV)</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${Math.min(selectedCommission.request_data.imageDistribution.duo_mf_pov || 0, 300)}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs w-10 text-right">{selectedCommission.request_data.imageDistribution.duo_mf_pov || 0}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-300">POV FFM Threesome</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${Math.min(selectedCommission.request_data.imageDistribution.pov_ffm || 0, 300)}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs w-10 text-right">{selectedCommission.request_data.imageDistribution.pov_ffm || 0}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-300">Gangbang</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${Math.min(selectedCommission.request_data.imageDistribution.gangbang || 0, 300)}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs w-10 text-right">{selectedCommission.request_data.imageDistribution.gangbang || 0}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Simple Preferences */}
                      {selectedCommission.request_data.mode === 'simple' && selectedCommission.request_data.simplePreferences && (
                        <div>
                          <span className="text-gray-400">Simple Preferences:</span>
                          <div className="mt-2 space-y-1">
                            {Object.entries(selectedCommission.request_data.simplePreferences).map(([key, value]) => {
                              const numValue = Number(value)
                              const isSpecialSlider = key === 'twoGirls'
                              return (
                                <div key={key} className="flex items-center justify-between py-1">
                                  <span className="text-gray-300">{biasLabels[key] || key}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="h-full bg-purple-500 transition-all"
                                        style={{ width: `${isSpecialSlider ? numValue : Math.min(100, numValue / 2)}%` }}
                                      />
                                    </div>
                                    <span className="text-white text-xs w-10 text-right">{numValue}%</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Advanced Pose Weights */}
                      {selectedCommission.request_data.mode === 'advanced' && selectedCommission.request_data.poseWeights && (
                        <div>
                          <span className="text-gray-400">Advanced Pose Weights:</span>
                          <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                            {Object.entries(selectedCommission.request_data.poseWeights)
                              .filter(([_, value]) => Number(value) !== 100) // Only show modified values
                              .map(([key, value]) => {
                                const numValue = Number(value)
                                return (
                                  <div key={key} className="flex items-center justify-between py-1">
                                    <span className="text-gray-300 text-xs">{key.replace(/[\[\]]/g, '')}</span>
                                    <span className={`text-xs font-medium ${getWeightColor(numValue)}`}>
                                      {numValue === 0 ? 'Excluded' : `${numValue}%`}
                                    </span>
                                  </div>
                                )
                              })}
                            {Object.values(selectedCommission.request_data.poseWeights).every((v: any) => Number(v) === 100) && (
                              <p className="text-gray-500 text-xs italic">All weights at default (100%)</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Legacy Set Bias (for older commissions) */}
                      {!selectedCommission.request_data.mode && selectedCommission.request_data.setBias && (
                        <div>
                          <span className="text-gray-400">Content Preferences (Legacy):</span>
                          <div className="mt-2 space-y-1">
                            {Object.entries(selectedCommission.request_data.setBias).map(([key, value]) => {
                              const numValue = Number(value)
                              const isSpecialSlider = key === 'twoGirls'
                              return (
                                <div key={key} className="flex items-center justify-between py-1">
                                  <span className="text-gray-300">{biasLabels[key] || key}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="h-full bg-purple-500 transition-all"
                                        style={{ width: `${isSpecialSlider ? numValue : Math.min(100, numValue / 2)}%` }}
                                      />
                                    </div>
                                    <span className="text-white text-xs w-10 text-right">{numValue}%</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">Description:</span>
                        <p className="text-white mt-1 whitespace-pre-wrap">
                          {selectedCommission.request_data.description}
                        </p>
                      </div>
                      
                      {selectedCommission.request_data.references?.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-sm">Reference Images:</span>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {selectedCommission.request_data.references.map((ref: string, index: number) => (
                              <img
                                key={index}
                                src={ref}
                                alt={`Reference ${index + 1}`}
                                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                                onClick={() => window.open(ref, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Commission Type Warning */}
                {selectedCommission.user_tier === 'public' && selectedCommission.status === 'pending' && (
                  <div className="mb-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                    <p className="text-sm text-blue-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This is a PUBLIC commission - contact the user on their preferred platform
                    </p>
                  </div>
                )}

                {selectedCommission.is_free_tier && selectedCommission.status === 'pending' && (
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 rounded-lg">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This is a FREE TIER commission included in the member's subscription
                    </p>
                  </div>
                )}

                {!selectedCommission.is_free_tier && selectedCommission.user_tier !== 'public' && selectedCommission.status === 'pending' && (
                  <div className="mb-4 p-3 bg-purple-900/20 border border-purple-900/50 rounded-lg">
                    <p className="text-sm text-purple-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This is a PAID commission - ensure payment is arranged before confirming
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  {/* Contact Button - Different for public vs supporter commissions */}
                  {selectedCommission.user_tier === 'public' ? (
                    <a
                      href={
                        selectedCommission.request_data.contactPlatform === 'x'
                          ? `https://x.com/messages/compose?recipient_id=${selectedCommission.request_data.contactUsername}`
                          : `https://ko-fi.com/${selectedCommission.request_data.contactUsername}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Contact on {selectedCommission.request_data.contactPlatform === 'x' ? 'X' : 'Ko-Fi'}
                    </a>
                  ) : (
                    <Link
                      href={`/community/dms?dm=${selectedCommission.user_id}`}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View DM with User
                    </Link>
                  )}

                  {/* Status Update Buttons */}
                  {selectedCommission.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateCommissionStatus(selectedCommission.id, 'in_progress')}
                        disabled={operatingCommissions.has(selectedCommission.id)}
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {operatingCommissions.has(selectedCommission.id) ? 'Processing...' : 'Start Working'}
                      </button>
                      <button
                        onClick={() => updateCommissionStatus(selectedCommission.id, 'cancelled')}
                        disabled={operatingCommissions.has(selectedCommission.id)}
                        className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {operatingCommissions.has(selectedCommission.id) ? 'Processing...' : 'Cancel Request'}
                      </button>
                    </>
                  )}
                  
                  {selectedCommission.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => updateCommissionStatus(selectedCommission.id, 'completed')}
                        disabled={operatingCommissions.has(selectedCommission.id)}
                        className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {operatingCommissions.has(selectedCommission.id) ? 'Processing...' : 'Mark as Completed'}
                      </button>
                      <button
                        onClick={() => updateCommissionStatus(selectedCommission.id, 'pending')}
                        disabled={operatingCommissions.has(selectedCommission.id)}
                        className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        {operatingCommissions.has(selectedCommission.id) ? 'Processing...' : 'Move Back to Pending'}
                      </button>
                    </>
                  )}
                  
                  {/* Archive and Delete buttons for completed/cancelled commissions */}
                  {(selectedCommission.status === 'completed' || selectedCommission.status === 'cancelled') && (
                    <>
                      <button
                        onClick={archiveCommission}
                        disabled={operatingCommissions.has(selectedCommission.id)}
                        className="w-full py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {operatingCommissions.has(selectedCommission.id) ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Archive Commission
                          </>
                        )}
                      </button>
                      
                      {/* Only show delete for non-free tier or cancelled commissions */}
                      {(!selectedCommission.is_free_tier || selectedCommission.status === 'cancelled') && (
                        <button
                          onClick={deleteCommission}
                          disabled={isDeleting || operatingCommissions.has(selectedCommission.id)}
                          className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting || operatingCommissions.has(selectedCommission.id) ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {isDeleting ? 'Deleting...' : 'Processing...'}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Permanently
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Info message for completed free-tier commissions */}
                      {selectedCommission.is_free_tier && selectedCommission.status === 'completed' && (
                        <p className="text-xs text-gray-500 text-center italic">
                          Completed free-tier commissions can only be archived, not deleted
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">Select a commission to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}