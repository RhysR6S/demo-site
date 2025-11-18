// src/app/commissions/public/page.tsx
"use client"

import { useState, useEffect, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressLink as Link } from '@/components/progress-link'
import { ModeToggle } from '@/components/commission/ModeToggle'
import { SimplePreferences } from '@/components/commission/SimplePreferences'
import { AdvancedPreferences } from '@/components/commission/AdvancedPreferences'
import { ImageDistribution } from '@/components/commission/ImageDistribution'
import { SMART_TAG_CATEGORIES } from '../constants'

// Interfaces
interface Character {
  id: string
  name: string
  series?: {
    name: string
  }
}

interface PublicCommissionFormState {
  // Contact Information
  contactPlatform: 'x' | 'kofi' | ''
  contactUsername: string
  
  // Commission Fields (same as authenticated version)
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
    duo: number
    boyGirl: number
  }
  
  // Simple mode preferences
  simplePreferences: {
    vaginal: number
    anal: number
    oral: number
    handjobTitjob: number
    masturbation: number
    povSex: number
    nonPovSex: number
  }
  
  // Advanced mode weights
  poseWeights: Record<string, number>
  locationWeights: Record<string, number>
  
  // Custom image fields
  customDescription: string
  referenceImages: string[]
}

const initialFormState: PublicCommissionFormState = {
  contactPlatform: '',
  contactUsername: '',
  mode: 'simple',
  type: 'set',
  femaleCharacters: [''],
  customCharactersList: [],
  maleCharacter: '',
  locations: [''],
  bodyType: '',
  imageDistribution: {
    solo: 100,
    duo: 100,
    boyGirl: 100
  },
  simplePreferences: {
    vaginal: 100,
    anal: 100,
    oral: 100,
    handjobTitjob: 100,
    masturbation: 100,
    povSex: 100,
    nonPovSex: 100
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
  | { type: 'UPDATE_DISTRIBUTION'; payload: { solo: number; duo: number; boyGirl: number } }
  | { type: 'UPDATE_FIELD'; field: string; value: any }
  | { type: 'RESET_FORM' }

function formReducer(state: PublicCommissionFormState, action: FormAction): PublicCommissionFormState {
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
      return { ...state, imageDistribution: action.payload }
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value }
    case 'RESET_FORM':
      return initialFormState
    default:
      return state
  }
}

export default function PublicCommissionsPage() {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [characterSearch, setCharacterSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFemaleCharacter, setCustomFemaleCharacter] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submittedPlatform, setSubmittedPlatform] = useState<'x' | 'kofi' | ''>('')
  
  // Use reducer for complex form state
  const [formState, dispatch] = useReducer(formReducer, initialFormState)

  // Fetch initial data
  useEffect(() => {
    fetchCharacters()
  }, [])

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
      const characterCount = 1 // Default to 1, could be parsed from description
      const additionalCharacterCost = Math.max(0, characterCount - 1) * 4
      return {
        base: basePrice,
        additionalCharacters: additionalCharacterCost,
        total: basePrice + additionalCharacterCost,
        characterCount: characterCount
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate contact information
    if (!formState.contactPlatform) {
      setError('Please select a contact platform')
      setLoading(false)
      return
    }

    if (!formState.contactUsername.trim()) {
      setError('Please provide your username/handle for contact')
      setLoading(false)
      return
    }

    // Validate X handle format
    if (formState.contactPlatform === 'x' && !formState.contactUsername.match(/^[A-Za-z0-9_]{1,15}$/)) {
      setError('Please enter a valid X handle (without the @ symbol, 1-15 characters, letters, numbers, and underscores only)')
      setLoading(false)
      return
    }

    const pricing = calculatePrice()

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

    // Prepare request data
    let requestData: any = {
      type: formState.type,
      mode: formState.mode,
      price: pricing.total,
      isPublic: true,
      contactPlatform: formState.contactPlatform,
      contactUsername: formState.contactUsername
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

      // Add preferences based on mode
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
      const response = await fetch('/api/commissions/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit commission')
      }

      // Store the platform before resetting form
      setSubmittedPlatform(formState.contactPlatform)
      setShowSuccessModal(true)
      dispatch({ type: 'RESET_FORM' })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit commission')
    } finally {
      setLoading(false)
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

  // Calculate pricing
  const pricing = calculatePrice()

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-zinc-800 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Commission Submitted!</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Your commission request has been successfully submitted. The creator will contact you on{' '}
                <span className="font-semibold text-cyan-400">
                  {submittedPlatform === 'x' ? 'X (Twitter)' : 'Ko-Fi'}
                </span>{' '}
                as soon as possible to discuss details and payment.
              </p>
              <p className="text-sm text-yellow-400 mb-4">
                Important: Please make sure your DMs are open and check for messages regularly!
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setSubmittedPlatform('')
                }}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Submit Another Commission
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Public Commission Request</h1>
          <p className="text-gray-400">
            Submit a commission request as a non-supporter. Please ensure your contact information is correct!
          </p>
        </div>

        {/* Critical Contact Information Warning */}
        <div className="mb-8 p-6 bg-red-900/20 border-2 border-sky-600/40 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-sky-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-lg font-bold text-sky-400 mb-2">⚠️ CRITICAL: Correct Contact Information Required!</p>
              <p className="text-sm text-gray-300 mb-2">
                <span className="font-semibold text-white">I cannot contact you about your commission if your information is incorrect!</span>
              </p>
              <ul className="text-sm text-gray-300 space-y-1 ml-4">
                <li>• Double-check your username/handle is spelled correctly</li>
                <li>• Make sure your DMs are open on your chosen platform</li>
                <li>• Invalid contact info = automatic commission cancellation</li>
                <li>• No refunds for cancelled commissions due to incorrect info</li>
              </ul>
              <p className="text-sm text-yellow-400 font-semibold mt-3">
                💡 TIP: Test that you can receive DMs before submitting!
              </p>
            </div>
          </div>
        </div>

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

          {/* Current Commission Cost */}
          {(formState.type === 'set' ? pricing.characterCount > 0 : true) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Current Commission Cost:</span>
                <span className="text-2xl font-bold text-white">${pricing.total.toFixed(2)} USD</span>
              </div>
              
              {/* Price Breakdown */}
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
                Submitting a commission request does NOT confirm your commission. The creator will review your request and contact you on your chosen platform to discuss details and arrange payment.
              </p>
              <p className="text-sm text-sky-400 font-semibold mt-2">
                DO NOT SEND MONEY UNTIL THE CREATOR HAS CONFIRMED THEY WILL DO IT!
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information Section */}
          <div className="p-6 bg-purple-900/20 border-2 border-purple-600/40 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Information (Required)
            </h3>
            
            {/* Platform Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contact Platform <span className="text-sky-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'contactPlatform', value: 'x' })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formState.contactPlatform === 'x'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">𝕏</span>
                    <span className="font-medium text-white">X (Twitter)</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'UPDATE_FIELD', field: 'contactPlatform', value: 'kofi' })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formState.contactPlatform === 'kofi'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">☕</span>
                    <span className="font-medium text-white">Ko-Fi</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Username/Handle Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {formState.contactPlatform === 'x' ? 'X Handle' : 'Username'} <span className="text-sky-500">*</span>
              </label>
              <div className="relative">
                {formState.contactPlatform === 'x' && (
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg font-medium">
                    @
                  </span>
                )}
                <input
                  type="text"
                  value={formState.contactUsername}
                  onChange={(e) => {
                    // For X, prevent @ symbol in the input
                    const value = formState.contactPlatform === 'x' 
                      ? e.target.value.replace('@', '') 
                      : e.target.value
                    dispatch({ type: 'UPDATE_FIELD', field: 'contactUsername', value })
                  }}
                  placeholder={
                    formState.contactPlatform === 'x' 
                      ? 'yourusername (without @)' 
                      : formState.contactPlatform === 'kofi'
                      ? 'Your Ko-Fi username'
                      : 'Select a platform first'
                  }
                  disabled={!formState.contactPlatform}
                  required
                  className={`w-full bg-slate-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none ${
                    formState.contactPlatform === 'x' ? 'pl-9' : ''
                  }`}
                />
              </div>
              {formState.contactPlatform === 'x' && (
                <p className="text-xs text-gray-500 mt-1">
                  Enter your X handle without the @ symbol (e.g., "johndoe" not "@johndoe")
                </p>
              )}
              {formState.contactPlatform === 'kofi' && (
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Ko-Fi username exactly as it appears in your Ko-Fi URL
                </p>
              )}
            </div>
          </div>

          {/* Commission Type Selector */}
          <div>
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

          {/* Rest of the form fields (same as authenticated version) */}
          {formState.type === 'set' ? (
            <>
              {/* Female Characters */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Female Character(s) <span className="text-sky-500">*</span>
                </label>
                
                {/* Character Selection Options */}
                <div className="space-y-4">
                  {/* Option 1: Select from list */}
                  <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center">1</span>
                      Select from character list
                    </h4>
                    
                    {/* Character Search */}
                    {characters.length > 0 && (
                      <input
                        type="text"
                        value={characterSearch}
                        onChange={(e) => setCharacterSearch(e.target.value)}
                        placeholder="Type to search characters..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none mb-3"
                      />
                    )}
                    
                    {/* Character Dropdowns */}
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
                      
                      {/* Add another character */}
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
                  
                  {/* OR Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-800"></div>
                    <span className="text-xs text-gray-500 uppercase">or</span>
                    <div className="flex-1 h-px bg-zinc-800"></div>
                  </div>
                  
                  {/* Option 2: Custom character */}
                  <div className="bg-slate-900/50 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center">2</span>
                      Request a custom character
                    </h4>
                    
                    {/* Custom characters list */}
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
                    
                    {/* Custom character input */}
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
                  />
                </div>
              </div>

              {/* Optional Fields (same as authenticated) */}
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
                  Male Character Override <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formState.maleCharacter}
                  onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'maleCharacter', value: e.target.value })}
                  placeholder="Leave blank for default male, or specify character name/appearance..."
                  className="w-full bg-slate-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
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
              disabled={loading || !formState.contactPlatform || !formState.contactUsername}
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
                  <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">
                    ${pricing.total.toFixed(2)}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}