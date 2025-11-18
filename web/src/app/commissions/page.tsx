// src/app/commissions/page.tsx (COMPLETE VERSION WITH EDIT FUNCTIONALITY)
"use client"

import { useState, useEffect, useReducer } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProgressLink as Link } from '@/components/progress-link'
import { ModeToggle } from '@/components/commission/ModeToggle'
import { SimplePreferences } from '@/components/commission/SimplePreferences'
import { AdvancedPreferences } from '@/components/commission/AdvancedPreferences'
import { ImageDistribution } from '@/components/commission/ImageDistribution'
import { SMART_TAG_CATEGORIES, simpleToPoseWeights } from './constants'

// Interfaces
interface Character {
  id: string
  name: string
  series?: {
    name: string
  }
}

interface SetBias {
  vaginal: number
  anal: number
  oral: number
  handjobTitjob: number
  masturbation: number
  rimming: number
  worshippingSmothering: number
  povSex: number
  nonPovSex: number
}

interface CommissionSlot {
  index: number
  status: 'unavailable' | 'available' | 'pending' | 'in_progress' | 'completed'
  commissionId?: string
}

interface CommissionSummary {
  tier: string
  freeAllocation: number
  available: number
  used: number
  periodStart: string
  periodEnd: string
  nextReset: string
}

interface CommissionFormState {
  mode: 'simple' | 'advanced'
  type: 'set' | 'custom'
  
  // Character set fields
  femaleCharacters: string[]
  customCharactersList: string[]
  maleCharacter: string
  locations: string[]
  bodyType: string
  
  // Image distribution
  imageDistribution: {
    solo: number
    duo_ff: number
    duo_mf: number
    duo_mf_pov: number
    pov_ffm: number
    gangbang: number
  }
  
  // Simple mode preferences
  simplePreferences: {
    vaginal: number
    anal: number
    oral: number
    handjobTitjob: number
    masturbation: number
  }
  
  // Advanced mode weights
  poseWeights: Record<string, number>
  locationWeights: Record<string, number>
  
  // Custom image fields
  customDescription: string
  referenceImages: string[]
}

const initialFormState: CommissionFormState = {
  mode: 'simple',
  type: 'set',
  femaleCharacters: [''],
  customCharactersList: [],
  maleCharacter: '',
  locations: [''],
  bodyType: '',
  imageDistribution: {
    solo: 100,
    duo_ff: 0,
    duo_mf: 100,
    duo_mf_pov: 50,
    pov_ffm: 0,
    gangbang: 0
  },
  simplePreferences: {
    vaginal: 100,
    anal: 100,
    oral: 100,
    handjobTitjob: 100,
    masturbation: 100
  },
  poseWeights: Object.fromEntries(
    SMART_TAG_CATEGORIES.flatMap(cat => 
      cat.tags.map(tag => [tag.key, tag.defaultWeight])
    )
  ),
  locationWeights: {},
  customDescription: '',
  referenceImages: []
}

type FormAction = 
  | { type: 'SET_MODE'; payload: 'simple' | 'advanced' }
  | { type: 'SET_TYPE'; payload: 'set' | 'custom' }
  | { type: 'UPDATE_SIMPLE_PREFS'; payload: any }
  | { type: 'UPDATE_POSE_WEIGHTS'; payload: Record<string, number> }
  | { type: 'UPDATE_DISTRIBUTION'; payload: { 
    solo: number; 
    duo_ff: number; 
    duo_mf: number; 
    duo_mf_pov: number; 
    pov_ffm: number; 
    gangbang: number 
  } }
  | { type: 'UPDATE_FIELD'; field: string; value: any }
  | { type: 'RESET_FORM' }

function formReducer(state: CommissionFormState, action: FormAction): CommissionFormState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload }
    case 'SET_TYPE':
      return { ...state, type: action.payload }
    case 'UPDATE_SIMPLE_PREFS':
      return { ...state, simplePreferences: action.payload }
    case 'UPDATE_POSE_WEIGHTS':
      return { ...state, poseWeights: action.payload }
    case 'UPDATE_DISTRIBUTION':
      return { 
        ...state, 
        imageDistribution: {
          solo: typeof action.payload.solo === 'number' ? action.payload.solo : state.imageDistribution.solo,
          duo_ff: typeof action.payload.duo_ff === 'number' ? action.payload.duo_ff : state.imageDistribution.duo_ff,
          duo_mf: typeof action.payload.duo_mf === 'number' ? action.payload.duo_mf : state.imageDistribution.duo_mf,
          duo_mf_pov: typeof action.payload.duo_mf_pov === 'number' ? action.payload.duo_mf_pov : state.imageDistribution.duo_mf_pov,
          pov_ffm: typeof action.payload.pov_ffm === 'number' ? action.payload.pov_ffm : state.imageDistribution.pov_ffm,
          gangbang: typeof action.payload.gangbang === 'number' ? action.payload.gangbang : state.imageDistribution.gangbang
        }
      }
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value }
    case 'RESET_FORM':
      return initialFormState
    default:
      return state
  }
}

export default function CommissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit')
  const [characters, setCharacters] = useState<Character[]>([])
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [characterSearch, setCharacterSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commissionSlots, setCommissionSlots] = useState<CommissionSlot[]>([])
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null)
  const [userCommissions, setUserCommissions] = useState<any[]>([])
  const [loadingCommissions, setLoadingCommissions] = useState(false)
  const [customFemaleCharacter, setCustomFemaleCharacter] = useState('')
  
  // Use reducer for complex form state
  const [formState, dispatch] = useReducer(formReducer, initialFormState)

  // Edit functionality state
  const [editingCommission, setEditingCommission] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormState, editDispatch] = useReducer(formReducer, initialFormState)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editCustomFemaleCharacter, setEditCustomFemaleCharacter] = useState('')

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user?.isActivePatron && !session?.user?.isCreator)) {
      router.push('/login')
    }
  }, [status, session, router])

  // Fetch initial data
  useEffect(() => {
    fetchCharacters()
    fetchCommissionStatus()
    if (activeTab === 'view') {
      fetchUserCommissions()
    }
  }, [session, activeTab])

  // Filter characters based on search
  useEffect(() => {
    if (characterSearch) {
      const searchLower = characterSearch.toLowerCase()
      setFilteredCharacters(
        characters.filter(char => 
          char.name.toLowerCase().includes(searchLower) ||
          char.series?.name.toLowerCase().includes(searchLower)
        )
      )
    } else {
      setFilteredCharacters(characters)
    }
  }, [characterSearch, characters])

  const fetchCharacters = async () => {
    try {
      const response = await fetch('/api/characters')
      if (response.ok) {
        const data = await response.json()
        setCharacters(data.characters || [])
        setFilteredCharacters(data.characters || [])
      }
    } catch (error) {
      console.error('Error fetching characters:', error)
    }
  }

  const fetchCommissionStatus = async () => {
    if (!session?.user) return

    try {
      const response = await fetch('/api/commissions/status')
      if (response.ok) {
        const data = await response.json()
        setCommissionSlots(data.slots || [])
        setCommissionSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching commission status:', error)
    }
  }

  const fetchUserCommissions = async () => {
    if (!session?.user) return

    setLoadingCommissions(true)
    try {
      const response = await fetch('/api/commissions/my-commissions')
      if (response.ok) {
        const data = await response.json()
        setUserCommissions(data.commissions || [])
      }
    } catch (error) {
      console.error('Error fetching user commissions:', error)
    } finally {
      setLoadingCommissions(false)
    }
  }

  // Helper functions
  const getFreeCommissions = () => {
    const tier = session?.user?.membershipTier?.toLowerCase() || 'bronze'
    switch (tier) {
      case 'gold': return 2
      case 'diamond': return 4
      case 'platinum': return 6
      default: return 0
    }
  }

  const getAvailableSlots = () => {
    return commissionSlots.filter(slot => slot.status === 'available').length
  }

  const hasAvailableFreeSlot = () => {
    return getAvailableSlots() > 0
  }

  // Pricing calculation
  const calculatePrice = () => {
    if (formState.type === 'set') {
      const basePrice = 15
      const totalCharacters = formState.femaleCharacters.filter(c => c).length + formState.customCharactersList.length
      const additionalCharacterCost = Math.max(0, totalCharacters - 1) * 0.50
      return {
        base: basePrice,
        additionalCharacters: additionalCharacterCost,
        total: basePrice + additionalCharacterCost,
        characterCount: totalCharacters
      }
    } else {
      const basePrice = 20
      const characterCount = 1
      const additionalCharacterCost = Math.max(0, characterCount - 1) * 4
      return {
        base: basePrice,
        additionalCharacters: additionalCharacterCost,
        total: basePrice + additionalCharacterCost,
        characterCount: characterCount
      }
    }
  }

  const formatResetDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `in ${diffDays} days`
    
    return `on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const pricing = calculatePrice()
    const isFreeTier = hasAvailableFreeSlot()

    // Validate character set has at least one character
    if (formState.type === 'set') {
      const selectedCharacters = formState.femaleCharacters.filter(c => c)
      const hasCharacter = selectedCharacters.length > 0 || formState.customCharactersList.length > 0
      
      if (!hasCharacter) {
        setError('Please select at least one character from the dropdown or enter a custom character name')
        setLoading(false)
        return
      }
    }

    // Validate custom image has description
    if (formState.type === 'custom' && !formState.customDescription.trim()) {
      setError('Please provide a description for your custom image')
      setLoading(false)
      return
    }

    // Prepare request data based on mode
    let requestData: any = {
      type: formState.type,
      mode: formState.mode,
      price: isFreeTier ? 0 : pricing.total
    }

    if (formState.type === 'set') {
      requestData = {
        ...requestData,
        femaleCharacters: formState.femaleCharacters.filter(c => c).concat(formState.customCharactersList),
        maleCharacter: formState.maleCharacter || null,
        locations: formState.locations.filter(l => l),
        bodyType: formState.bodyType,
        imageDistribution: formState.imageDistribution,
      }

      if (formState.mode === 'simple') {
        requestData.simplePreferences = formState.simplePreferences
      } else {
        requestData.poseWeights = formState.poseWeights
        requestData.locationWeights = formState.locationWeights
      }
    } else {
      requestData = {
        ...requestData,
        description: formState.customDescription,
        references: formState.referenceImages
      }
    }

    try {
      const response = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit commission')
      }

      router.push('/commissions/success')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit commission')
    } finally {
      setLoading(false)
    }
  }

  // Edit functionality
  const openEditModal = (commission: any) => {
    setEditingCommission(commission)
    
    const requestData = commission.request_data
    
    editDispatch({ type: 'SET_MODE', payload: requestData.mode || 'simple' })
    editDispatch({ type: 'SET_TYPE', payload: commission.type })
    
    if (commission.type === 'set') {
      editDispatch({ type: 'UPDATE_FIELD', field: 'femaleCharacters', value: requestData.femaleCharacters || [''] })
      editDispatch({ type: 'UPDATE_FIELD', field: 'customCharactersList', value: [] })
      editDispatch({ type: 'UPDATE_FIELD', field: 'maleCharacter', value: requestData.maleCharacter || '' })
      editDispatch({ type: 'UPDATE_FIELD', field: 'locations', value: requestData.locations || [''] })
      editDispatch({ type: 'UPDATE_FIELD', field: 'bodyType', value: requestData.bodyType || '' })
      editDispatch({ type: 'UPDATE_DISTRIBUTION', payload: requestData.imageDistribution || initialFormState.imageDistribution })
      
      if (requestData.mode === 'simple') {
        editDispatch({ type: 'UPDATE_SIMPLE_PREFS', payload: requestData.simplePreferences || initialFormState.simplePreferences })
      } else {
        editDispatch({ type: 'UPDATE_POSE_WEIGHTS', payload: requestData.poseWeights || initialFormState.poseWeights })
      }
    } else {
      editDispatch({ type: 'UPDATE_FIELD', field: 'customDescription', value: requestData.description || '' })
      editDispatch({ type: 'UPDATE_FIELD', field: 'referenceImages', value: requestData.references || [] })
    }
    
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)

    if (editFormState.type === 'set') {
      const hasCharacter = editFormState.femaleCharacters.some(c => c) || editFormState.customCharactersList.length > 0
      if (!hasCharacter) {
        setEditError('Please select at least one character')
        setEditLoading(false)
        return
      }
    } else if (!editFormState.customDescription.trim()) {
      setEditError('Please provide a description')
      setEditLoading(false)
      return
    }

    let requestData: any = {
      type: editFormState.type,
      mode: editFormState.mode,
    }

    if (editFormState.type === 'set') {
      requestData = {
        ...requestData,
        femaleCharacters: editFormState.femaleCharacters.filter(c => c).concat(editFormState.customCharactersList),
        maleCharacter: editFormState.maleCharacter || null,
        locations: editFormState.locations.filter(l => l),
        bodyType: editFormState.bodyType,
        imageDistribution: editFormState.imageDistribution,
      }

      if (editFormState.mode === 'simple') {
        requestData.simplePreferences = editFormState.simplePreferences
      } else {
        requestData.poseWeights = editFormState.poseWeights
        requestData.locationWeights = editFormState.locationWeights
      }
    } else {
      requestData = {
        ...requestData,
        description: editFormState.customDescription,
        references: editFormState.referenceImages
      }
    }

    try {
      const response = await fetch(`/api/commissions/my-commissions/${editingCommission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update commission')
      }

      setUserCommissions(prev => prev.map(c => 
        c.id === editingCommission.id ? data.commission : c
      ))
      
      setShowEditModal(false)
      setEditingCommission(null)
      setEditError(null)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update commission')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteCommission = async (commissionId: string) => {
    if (!confirm('Are you sure you want to delete this commission request? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/commissions/my-commissions/${commissionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete commission')
      }

      setUserCommissions(prev => prev.filter(c => c.id !== commissionId))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete commission')
    }
  }

  const addFemaleCharacter = () => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'femaleCharacters', 
      value: [...formState.femaleCharacters, ''] 
    })
  }

  const removeFemaleCharacter = (index: number) => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'femaleCharacters', 
      value: formState.femaleCharacters.filter((_, i) => i !== index) 
    })
  }

  const updateFemaleCharacter = (index: number, value: string) => {
    const newChars = [...formState.femaleCharacters]
    newChars[index] = value
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'femaleCharacters', 
      value: newChars 
    })
  }

  const addCustomCharacter = () => {
    if (customFemaleCharacter.trim()) {
      dispatch({ 
        type: 'UPDATE_FIELD', 
        field: 'customCharactersList', 
        value: [...formState.customCharactersList, customFemaleCharacter.trim()] 
      })
      setCustomFemaleCharacter('')
    }
  }

  const removeCustomCharacter = (index: number) => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'customCharactersList', 
      value: formState.customCharactersList.filter((_, i) => i !== index) 
    })
  }

  const addLocation = () => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'locations', 
      value: [...formState.locations, ''] 
    })
  }

  const removeLocation = (index: number) => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'locations', 
      value: formState.locations.filter((_, i) => i !== index) 
    })
  }

  const updateLocation = (index: number, value: string) => {
    const newLocs = [...formState.locations]
    newLocs[index] = value
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'locations', 
      value: newLocs 
    })
  }

  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) {
              dispatch({ 
                type: 'UPDATE_FIELD', 
                field: 'referenceImages', 
                value: [...formState.referenceImages, e.target.result as string] 
              })
            }
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }

  const removeReferenceImage = (index: number) => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'referenceImages', 
      value: formState.referenceImages.filter((_, i) => i !== index) 
    })
  }

  const getSlotColor = (slot: CommissionSlot) => {
    switch (slot.status) {
      case 'available':
        return 'border-green-500 bg-green-500/10'
      case 'pending':
        return 'border-yellow-500 bg-yellow-500/10'
      case 'in_progress':
        return 'border-purple-500 bg-purple-500/10'
      case 'completed':
        return 'border-zinc-700 bg-zinc-800/50'
      case 'unavailable':
      default:
        return 'border-zinc-700 bg-zinc-800/50'
    }
  }

  const getSlotIcon = (slot: CommissionSlot) => {
    switch (slot.status) {
      case 'available':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'pending':
        return (
          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'in_progress':
        return (
          <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
    }
  }

  const pricing = calculatePrice()
  const isFreeTier = hasAvailableFreeSlot()
  const freeCommissionsCount = getFreeCommissions()
  const availableSlots = getAvailableSlots()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-sky-600/20 rounded-full animate-spin border-t-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Commissions</h1>
          <p className="text-gray-400">
            {activeTab === 'submit' 
              ? 'Submit your commission request and the creator will work on it as soon as possible.'
              : 'View and track your commission requests.'
            }
          </p>
          
          {/* Tab Navigation */}
          <div className="mt-6 flex gap-2 bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'submit' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Submit New Commission
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'view' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              View My Commissions
            </button>
          </div>
        </div>

        {activeTab === 'submit' ? (
          <>
            {/* Commission Slots Visual */}
            {freeCommissionsCount > 0 && (
              <div className="mb-6 p-4 bg-slate-900 border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">
                    Monthly Free Commissions (
                    <span className={`font-semibold ${
                      session?.user?.membershipTier?.toLowerCase() === 'gold' ? 'text-orange-400' :
                      session?.user?.membershipTier?.toLowerCase() === 'diamond' ? 'text-cyan-400' :
                      session?.user?.membershipTier?.toLowerCase() === 'platinum' ? 'text-gray-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' :
                      'text-gray-400'
                    }`}>
                      {session?.user?.membershipTier?.toUpperCase() || 'BRONZE'}
                    </span>
                    )
                  </h3>
                  <span className="text-xs text-gray-500">
                    {availableSlots} of {freeCommissionsCount} available
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[...Array(6)].map((_, index) => {
                    const slot = commissionSlots[index] || { index, status: 'unavailable' }
                    const isActive = index < freeCommissionsCount
                    
                    return (
                      <div
                        key={index}
                        className={`
                          aspect-square rounded-lg border-2 flex items-center justify-center transition-all
                          ${isActive ? getSlotColor(slot) : 'border-zinc-800 bg-slate-900/50 opacity-50'}
                        `}
                      >
                        {isActive ? getSlotIcon(slot) : (
                          <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-green-500 bg-green-500/10 rounded"></div>
                      <span className="text-gray-400">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-yellow-500 bg-yellow-500/10 rounded"></div>
                      <span className="text-gray-400">Pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-purple-500 bg-purple-500/10 rounded"></div>
                      <span className="text-gray-400">In Progress</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-zinc-700 bg-zinc-800/50 rounded"></div>
                      <span className="text-gray-400">Completed</span>
                    </div>
                  </div>
                  {commissionSummary?.nextReset && (
                    <div className="text-xs text-gray-500">
                      Resets {formatResetDate(commissionSummary.nextReset)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Display */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-cyan-600/30 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Commission Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-cyan-400 mb-2">Character Set</h4>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li>• $15 USD base price</li>
                    <li>• +$0.50 per additional character</li>
                    <li>• 70-140 images (varies)</li>
                    <li>• Poses selected by artist</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Custom Image</h4>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li>• $20 USD base price</li>
                    <li>• +$4 per additional character</li>
                    <li>• 1 image to your specifications</li>
                    <li>• Max 3 characters per image</li>
                  </ul>
                </div>
              </div>

              {(formState.type === 'set' ? pricing.characterCount > 0 : true) && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Current Commission Cost:</span>
                    <div className="text-right">
                      {isFreeTier ? (
                        <div>
                          <span className="text-2xl font-bold text-green-400">FREE</span>
                          <p className="text-xs text-gray-500 line-through">${pricing.total.toFixed(2)} USD</p>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-white">${pricing.total.toFixed(2)} USD</span>
                      )}
                    </div>
                  </div>
                  
                  {pricing.characterCount > 0 && (
                    <div className="mt-2 space-y-1 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Base price:</span>
                        <span>${pricing.base.toFixed(2)}</span>
                      </div>
                      {pricing.additionalCharacters > 0 && (
                        <div className="flex justify-between">
                          <span>Additional characters ({pricing.characterCount - 1}):</span>
                          <span>+${pricing.additionalCharacters.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Important Notice */}
            <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-yellow-400 mb-1">Important Notice</p>
                  <p className="text-sm text-gray-300">
                    Submitting a commission request does NOT confirm your commission. The creator will review your request and get in touch with you as soon as possible to discuss details and confirm the commission.
                  </p>
                  <p className="text-sm text-sky-400 font-semibold mt-2">
                    DO NOT SEND MONEY UNTIL THE CREATOR HAS CONFIRMED THEY WILL DO IT!
                  </p>
                  {availableSlots === 0 && freeCommissionsCount > 0 && (
                    <p className="text-sm text-gray-300 mt-2">
                      <span className="text-yellow-400 font-semibold">Note:</span> You have used all your free commission slots for this month. This commission will be a paid commission.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Commission Type Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-3">Commission Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_TYPE', payload: 'set' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formState.type === 'set'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1">Character Set</h3>
                    <p className="text-sm text-gray-400">Full set with specific characters and preferences</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_TYPE', payload: 'custom' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formState.type === 'custom'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1">Custom Image</h3>
                    <p className="text-sm text-gray-400">Single custom image with your specifications</p>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formState.type === 'set' ? (
                <>
                  {/* Female Characters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Female Character(s) <span className="text-sky-500">*</span>
                    </label>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center">1</span>
                          Select from character list
                        </h4>
                        
                        {characters.length > 0 && (
                          <input
                            type="text"
                            value={characterSearch}
                            onChange={(e) => setCharacterSearch(e.target.value)}
                            placeholder="Type to search characters..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none mb-3"
                          />
                        )}
                        
                        <div className="space-y-2">
                          {formState.femaleCharacters.map((char, index) => (
                            <div key={index} className="flex gap-2">
                              <select
                                value={char}
                                onChange={(e) => updateFemaleCharacter(index, e.target.value)}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                              >
                                <option value="">Choose a character...</option>
                                {filteredCharacters.map(character => (
                                  <option key={character.id} value={character.name}>
                                    {character.name} {character.series ? `(${character.series.name})` : ''}
                                  </option>
                                ))}
                              </select>
                              {formState.femaleCharacters.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFemaleCharacter(index)}
                                  className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sky-400 hover:bg-zinc-700"
                                  title="Remove character"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          
                          {formState.femaleCharacters[0] && (
                            <button
                              type="button"
                              onClick={addFemaleCharacter}
                              className="text-sm text-cyan-400 hover:text-purple-300 flex items-center gap-1 mt-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add another character (+$0.50)
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-zinc-800"></div>
                        <span className="text-xs text-gray-500 uppercase">or</span>
                        <div className="flex-1 h-px bg-zinc-800"></div>
                      </div>
                      
                      <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center">2</span>
                          Request a custom character
                        </h4>
                        
                        {formState.customCharactersList.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {formState.customCharactersList.map((char, index) => (
                              <div key={index} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                                <span className="flex-1 text-white text-sm">{char}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCustomCharacter(index)}
                                  className="text-sky-400 hover:text-red-300"
                                  title="Remove character"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customFemaleCharacter}
                            onChange={(e) => setCustomFemaleCharacter(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCharacter())}
                            placeholder="Enter character name not in the list..."
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={addCustomCharacter}
                            disabled={!customFemaleCharacter.trim()}
                            className="p-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-gray-500 transition-colors"
                            title="Add character"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Can't find your character? Type their name and press + to add multiple custom characters (+$0.50 each after the first).
                        </p>
                      </div>
                      
                      {(formState.femaleCharacters.some(c => c) || formState.customCharactersList.length > 0) && (
                        <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-3">
                          <p className="text-xs text-green-400">
                            <strong>Selected characters:</strong> {[
                              ...formState.femaleCharacters.filter(c => c),
                              ...formState.customCharactersList
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Preferences Mode Toggle */}
                  <ModeToggle
                    mode={formState.mode}
                    onChange={(mode) => dispatch({ type: 'SET_MODE', payload: mode })}
                  />

                  {/* Preferences Based on Mode */}
                  {formState.mode === 'simple' ? (
                    <SimplePreferences
                      preferences={formState.simplePreferences}
                      onChange={(prefs) => dispatch({ type: 'UPDATE_SIMPLE_PREFS', payload: prefs })}
                    />
                  ) : (
                    <AdvancedPreferences
                      poseWeights={formState.poseWeights}
                      onChange={(weights) => dispatch({ type: 'UPDATE_POSE_WEIGHTS', payload: weights })}
                    />
                  )}

                  {/* Image Distribution Section */}
                  <div className="space-y-4">
                    <div className="border-t border-zinc-800 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-2">Image Type Distribution</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Control the mix of solo, duo (2Girls), and 1Boy1Girl images in your set.
                      </p>
                      <ImageDistribution
                        distribution={formState.imageDistribution}
                        onChange={(dist) => dispatch({ type: 'UPDATE_DISTRIBUTION', payload: dist })}
                        femaleCharacterCount={
                          formState.femaleCharacters.filter(c => c).length + 
                          formState.customCharactersList.length
                        }
                        maleEnabled={true}
                      />
                    </div>
                  </div>

                  {/* Optional Fields Disclaimer */}
                  <div className="mb-8 p-6 bg-blue-900/20 border-2 border-blue-600/40 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-base font-bold text-blue-400 mb-2">Important: Optional Fields = More Variety!</p>
                        <div className="space-y-2 text-sm text-gray-300">
                          <p>
                            <span className="font-semibold text-white">All fields below are completely OPTIONAL.</span> We highly recommend leaving most or all of them blank!
                          </p>
                          <p>
                            <span className="text-blue-300">✨ Why leave them blank?</span> You'll get much more variety and creativity in your commission. The artist will have freedom to explore different:
                          </p>
                          <ul className="ml-4 space-y-1 text-gray-400">
                            <li>• Locations and settings</li>
                            <li>• Clothing and outfits</li>
                            <li>• Expressions and moods</li>
                            <li>• Scene types and compositions</li>
                            <li>• Body types and poses</li>
                          </ul>
                          <p className="pt-2 font-medium text-yellow-400">
                            💡 Only fill in fields if you have very specific preferences. Otherwise, embrace the surprise and variety!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Male Character */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Male Character Override <span className="text-gray-500 text-xs">(Optional - for customizing male in 1Boy1Girl scenes)</span>
                    </label>
                    <input
                      type="text"
                      value={formState.maleCharacter}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'maleCharacter', value: e.target.value })}
                      placeholder="Leave blank for default male, or specify character name/appearance..."
                      className="w-full bg-slate-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      1Boy1Girl scenes will generate with a default male if left blank. Enter a character name or describe their appearance to override.
                    </p>
                  </div>

                  {/* Locations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Location Preferences <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    {formState.locations.map((loc, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={loc}
                          onChange={(e) => updateLocation(index, e.target.value)}
                          placeholder="e.g., Beach, Bedroom, School..."
                          className="flex-1 bg-slate-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                        />
                        {formState.locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLocation(index)}
                            className="p-2.5 bg-slate-900 border border-zinc-800 rounded-lg text-sky-400 hover:bg-zinc-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addLocation}
                      className="text-sm text-cyan-400 hover:text-purple-300"
                    >
                      + Add another location
                    </button>
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Body Type <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formState.bodyType}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'bodyType', value: e.target.value })}
                      placeholder="e.g., Curvy, Gigantic breasts, Skinny, Athletic..."
                      className="w-full bg-slate-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Custom Image Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Describe Your Custom Image <span className="text-sky-500">*</span>
                    </label>
                    <textarea
                      value={formState.customDescription}
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'customDescription', value: e.target.value })}
                      rows={6}
                      required
                      placeholder="Describe in detail what you'd like to see in your custom image..."
                      className="w-full bg-slate-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum of 3 characters per image. Additional characters are +$4 each.
                    </p>
                  </div>

                  {/* Reference Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Reference Images <span className="text-gray-500 text-xs">(Optional - Paste images here)</span>
                    </label>
                    <div
                      onPaste={handleImagePaste}
                      className="w-full min-h-[100px] bg-slate-900 border-2 border-dashed border-zinc-800 rounded-lg p-4 text-center cursor-pointer hover:border-zinc-700 focus:border-purple-500 focus:outline-none"
                      tabIndex={0}
                    >
                      {formState.referenceImages.length === 0 ? (
                        <p className="text-gray-500">Click here and paste images (Ctrl+V or Cmd+V)</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          {formState.referenceImages.map((img, index) => (
                            <div key={index} className="relative group">
                              <img src={img} alt={`Reference ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => removeReferenceImage(index)}
                                className="absolute top-1 right-1 p-1 bg-sky-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>  
              )}

              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
                  <p className="text-sm text-sky-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Link
                  href="/"
                  className="flex-1 py-3 px-6 bg-slate-900 text-gray-300 rounded-lg hover:bg-zinc-800 transition-colors text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Commission Request
                      {isFreeTier ? (
                        <span className="text-xs bg-green-600/20 text-green-300 px-2 py-0.5 rounded">FREE</span>
                      ) : (
                        <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">${pricing.total.toFixed(2)}</span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* View Commissions Tab */
          <div>
            {loadingCommissions ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-purple-600/20 rounded-full animate-spin border-t-purple-600"></div>
              </div>
            ) : userCommissions.length === 0 ? (
              <div className="bg-slate-900 border border-zinc-800 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-400">You haven't submitted any commission requests yet.</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Submit Your First Commission
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userCommissions.map((commission) => (
                  <div key={commission.id} className="bg-slate-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {commission.type === 'set' ? 'Character Set' : 'Custom Image'} Commission
                        </h3>
                        <p className="text-sm text-gray-400">
                          Submitted {new Date(commission.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {commission.is_free_tier && (
                          <span className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full font-semibold">
                            FREE TIER
                          </span>
                        )}
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          commission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          commission.status === 'in_progress' ? 'bg-purple-500/20 text-cyan-400' :
                          commission.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          'bg-sky-500/20 text-sky-400'
                        }`}>
                          {commission.status.replace('_', ' ').charAt(0).toUpperCase() + commission.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Price Display */}
                    {commission.request_data.price !== undefined && (
                      <div className="mb-4 p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Commission Cost:</span>
                          <span className="text-lg font-semibold text-white">
                            {commission.is_free_tier ? (
                              <span className="text-green-400">FREE</span>
                            ) : (
                              `$${commission.request_data.price.toFixed(2)} USD`
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Request Details */}
                    {commission.type === 'set' ? (
                      <div className="space-y-2 text-sm">
                        {commission.request_data.femaleCharacters?.length > 0 && (
                          <div>
                            <span className="text-gray-400">Characters:</span>
                            <span className="text-white ml-2">{commission.request_data.femaleCharacters.join(', ')}</span>
                          </div>
                        )}
                        {commission.request_data.maleCharacter && (
                          <div>
                            <span className="text-gray-400">Male Character:</span>
                            <span className="text-white ml-2">{commission.request_data.maleCharacter}</span>
                          </div>
                        )}
                        {commission.request_data.locations?.length > 0 && commission.request_data.locations.some((l: string) => l) && (
                          <div>
                            <span className="text-gray-400">Locations:</span>
                            <span className="text-white ml-2">{commission.request_data.locations.filter((l: string) => l).join(', ')}</span>
                          </div>
                        )}
                        {commission.request_data.bodyType && (
                          <div>
                            <span className="text-gray-400">Body Type:</span>
                            <span className="text-white ml-2">{commission.request_data.bodyType}</span>
                          </div>
                        )}
                        {commission.request_data.mode && (
                          <div>
                            <span className="text-gray-400">Preference Mode:</span>
                            <span className="text-white ml-2">{commission.request_data.mode === 'advanced' ? 'Advanced' : 'Simple'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm">
                        <span className="text-gray-400">Description:</span>
                        <p className="text-white mt-1">{commission.request_data.description}</p>
                      </div>
                    )}

                    {/* Status-specific messages */}
                    {commission.status === 'pending' && (
                      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-900/50 rounded-lg">
                        <p className="text-sm text-yellow-400">
                          Your commission is pending review. You can edit or cancel it while it's pending.
                        </p>
                      </div>
                    )}
                    {commission.status === 'in_progress' && (
                      <div className="mt-4 p-3 bg-purple-900/20 border border-purple-900/50 rounded-lg">
                        <p className="text-sm text-cyan-400">
                          The creator is currently working on your commission.
                        </p>
                      </div>
                    )}
                    {commission.status === 'completed' && (
                      <div className="mt-4 p-3 bg-green-900/20 border border-green-900/50 rounded-lg">
                        <p className="text-sm text-green-400">
                          Your commission has been completed! Check your DMs for details.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <Link
                        href="/community/dms"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Message Creator
                      </Link>
                      
                      {/* Edit button - only for pending commissions */}
                      {commission.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openEditModal(commission)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCommission(commission.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingCommission && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-zinc-800 rounded-lg max-w-4xl w-full my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-2xl font-bold text-white">Edit Commission</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingCommission(null)
                  setEditError(null)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {editFormState.type === 'set' ? (
                <>
                  {/* Female Characters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Female Character(s) <span className="text-sky-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {editFormState.femaleCharacters.map((char, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={char}
                            onChange={(e) => {
                              const newChars = [...editFormState.femaleCharacters]
                              newChars[index] = e.target.value
                              editDispatch({ type: 'UPDATE_FIELD', field: 'femaleCharacters', value: newChars })
                            }}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                          >
                            <option value="">Choose a character...</option>
                            {characters.map(character => (
                              <option key={character.id} value={character.name}>
                                {character.name} {character.series ? `(${character.series.name})` : ''}
                              </option>
                            ))}
                          </select>
                          {editFormState.femaleCharacters.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                editDispatch({ 
                                  type: 'UPDATE_FIELD', 
                                  field: 'femaleCharacters', 
                                  value: editFormState.femaleCharacters.filter((_, i) => i !== index) 
                                })
                              }}
                              className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sky-400 hover:bg-zinc-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          editDispatch({ 
                            type: 'UPDATE_FIELD', 
                            field: 'femaleCharacters', 
                            value: [...editFormState.femaleCharacters, ''] 
                          })
                        }}
                        className="text-sm text-cyan-400 hover:text-purple-300 flex items-center gap-1 mt-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add another character
                      </button>
                    </div>
                  </div>

                  {/* Mode Toggle */}
                  <ModeToggle
                    mode={editFormState.mode}
                    onChange={(mode) => editDispatch({ type: 'SET_MODE', payload: mode })}
                  />

                  {/* Preferences */}
                  {editFormState.mode === 'simple' ? (
                    <SimplePreferences
                      preferences={editFormState.simplePreferences}
                      onChange={(prefs) => editDispatch({ type: 'UPDATE_SIMPLE_PREFS', payload: prefs })}
                    />
                  ) : (
                    <AdvancedPreferences
                      poseWeights={editFormState.poseWeights}
                      onChange={(weights) => editDispatch({ type: 'UPDATE_POSE_WEIGHTS', payload: weights })}
                    />
                  )}

                  {/* Image Distribution */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Image Type Distribution</h3>
                    <ImageDistribution
                      distribution={editFormState.imageDistribution}
                      onChange={(dist) => editDispatch({ type: 'UPDATE_DISTRIBUTION', payload: dist })}
                      femaleCharacterCount={editFormState.femaleCharacters.filter(c => c).length}
                      maleEnabled={true}
                    />
                  </div>

                  {/* Male Character */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Male Character Override <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editFormState.maleCharacter}
                      onChange={(e) => editDispatch({ type: 'UPDATE_FIELD', field: 'maleCharacter', value: e.target.value })}
                      placeholder="Leave blank for default..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Locations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Location Preferences <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    {editFormState.locations.map((loc, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={loc}
                          onChange={(e) => {
                            const newLocs = [...editFormState.locations]
                            newLocs[index] = e.target.value
                            editDispatch({ type: 'UPDATE_FIELD', field: 'locations', value: newLocs })
                          }}
                          placeholder="e.g., Beach, Bedroom..."
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                        />
                        {editFormState.locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              editDispatch({ 
                                type: 'UPDATE_FIELD', 
                                field: 'locations', 
                                value: editFormState.locations.filter((_, i) => i !== index) 
                              })
                            }}
                            className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sky-400 hover:bg-zinc-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        editDispatch({ 
                          type: 'UPDATE_FIELD', 
                          field: 'locations', 
                          value: [...editFormState.locations, ''] 
                        })
                      }}
                      className="text-sm text-cyan-400 hover:text-purple-300"
                    >
                      + Add another location
                    </button>
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Body Type <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editFormState.bodyType}
                      onChange={(e) => editDispatch({ type: 'UPDATE_FIELD', field: 'bodyType', value: e.target.value })}
                      placeholder="e.g., Curvy, Athletic..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Custom Image Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Description <span className="text-sky-500">*</span>
                    </label>
                    <textarea
                      value={editFormState.customDescription}
                      onChange={(e) => editDispatch({ type: 'UPDATE_FIELD', field: 'customDescription', value: e.target.value })}
                      rows={6}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}

              {editError && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
                  <p className="text-sm text-sky-400">{editError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-4 p-6 border-t border-zinc-800 sticky bottom-0 bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingCommission(null)
                  setEditError(null)
                }}
                className="flex-1 py-3 px-6 bg-zinc-800 text-gray-300 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {editLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}