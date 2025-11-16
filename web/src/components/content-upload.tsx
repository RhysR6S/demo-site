// src/components/content-upload.tsx
"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { StyledContentTitle } from '@/components/styled-content-title'
import { motion, AnimatePresence } from 'framer-motion'
import type { Character, Series } from '@/types/database'

interface UploadFormData {
  title: string
  description: string
  characterIds: string[]
  seriesIds: string[]
  tags: string[]
  isCommission: boolean
  scheduledTime: string
  publishImmediately: boolean
}

interface TimeSlot {
  hour: number
  date: Date
  status: 'available' | 'scheduled' | 'published' | 'error'
  setId?: string
  setTitle?: string
}

interface CharacterWithSeries extends Character {
  series?: Series | null
}

interface UploadProgress {
  current: number
  total: number
  percentage: number
  processing: boolean
  currentFile?: string
  success?: boolean
}

interface SearchableTagInputProps<T extends { id: string; name: string }> {
  items: T[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder: string
  label: string
  icon?: React.ReactNode
  maxHeight?: string
}

function SearchableTagInput<T extends { id: string; name: string }>({
  items,
  selectedIds,
  onChange,
  placeholder,
  label,
  icon,
  maxHeight = '200px'
}: SearchableTagInputProps<T>) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedItems = items.filter(item => selectedIds.includes(item.id))

  const toggleItem = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      onChange(selectedIds.filter(id => id !== itemId))
    } else {
      onChange([...selectedIds, itemId])
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      
      {/* Selected items */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map(item => (
            <motion.span
              key={item.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm border border-purple-600/30"
            >
              {item.name}
              <button
                onClick={() => toggleItem(item.id)}
                className="ml-1 hover:text-purple-300 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.span>
          ))}
        </div>
      )}
      
      {/* Search input */}
      <div
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 focus:bg-zinc-900 transition-all duration-200 pr-10"
        />
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden"
          >
            <div className={`overflow-y-auto`} style={{ maxHeight }}>
              {filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${
                      isSelected 
                        ? 'bg-purple-600/20 text-purple-400' 
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ContentUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    characterIds: [],
    seriesIds: [],
    tags: [],
    isCommission: false,
    scheduledTime: '',
    publishImmediately: true
  })
  
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [characters, setCharacters] = useState<CharacterWithSeries[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [todaySlots, setTodaySlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    processing: false
  })
  const [detectionResults, setDetectionResults] = useState<{
    detected: string[]
    matched: string[]
    unmatched: string[]
  } | null>(null)
  
  // Add loading state for characters
  const [charactersLoading, setCharactersLoading] = useState(true)
  
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Generate title from selected characters
  function generateTitle(characterIds: string[]): string {
    if (characterIds.length === 0) return ''
    
    const selectedCharacters = characters.filter(c => characterIds.includes(c.id))
    
    if (selectedCharacters.length === 0) return ''
    
    // 1 character -> Character Name
    if (selectedCharacters.length === 1) {
      return selectedCharacters[0].name
    }
    
    // 2 characters -> Character1 & Character2
    if (selectedCharacters.length === 2) {
      return `${selectedCharacters[0].name} & ${selectedCharacters[1].name}`
    }
    
    // 3+ characters -> Check if they're all from the same series
    const seriesIds = selectedCharacters
      .map(c => c.series_id)
      .filter(Boolean) as string[]
    
    const uniqueSeriesIds = [...new Set(seriesIds)]
    
    // If all characters are from the same series and we have that series
    if (uniqueSeriesIds.length === 1 && seriesIds.length === selectedCharacters.length) {
      const seriesId = uniqueSeriesIds[0]
      const matchedSeries = series.find(s => s.id === seriesId)
      if (matchedSeries) {
        return matchedSeries.name
      }
    }
    
    // 3+ characters from different series (or some without series) -> Variety Set
    return 'Variety Set'
  }

  // Load characters and series on mount
  useEffect(() => {
    async function loadData() {
      setCharactersLoading(true)
      
      try {
        // Load characters with series
        const { data: charactersData } = await supabase
          .from('characters')
          .select(`
            *,
            series:series_id (*)
          `)
          .order('name')
        
        if (charactersData) {
          setCharacters(charactersData as CharacterWithSeries[])
        }
        
        // Load series
        const { data: seriesData } = await supabase
          .from('series')
          .select('*')
          .order('name')
        
        if (seriesData) {
          setSeries(seriesData)
        }
      } finally {
        setCharactersLoading(false)
      }
    }
    
    loadData()
    loadTimeSlots() // Load time slots for scheduling
  }, [])

  // Load previews when files change
  useEffect(() => {
    const newPreviews: string[] = []
    
    files.forEach((file, index) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string
        if (newPreviews.length === files.length) {
          setImagePreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
    
    if (files.length === 0) {
      setImagePreviews([])
    }
  }, [files])

  async function loadTimeSlots() {
    const slots: TimeSlot[] = []
    const now = new Date()
    const slotHours = [0, 10, 12, 14, 16, 18, 20, 22]
    
    // Generate slots for next 30 days
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    
    for (let day = 0; day < 30; day++) {
      for (const hour of slotHours) {
        const slotDate = new Date(startDate)
        slotDate.setDate(startDate.getDate() + day)
        slotDate.setHours(hour, 0, 0, 0)
        slotDate.setMilliseconds(0)
        
        // Include all slots from today onwards
        if (day > 0 && slotDate <= now) continue
        
        slots.push({
          hour,
          date: slotDate,
          status: 'available'
        })
      }
    }
    
    // Query all content sets with scheduled_time (includes both scheduled and published)
    const { data: scheduledSets, error } = await supabase
      .from('content_sets')
      .select('id, title, scheduled_time, published_at')
      .not('scheduled_time', 'is', null)
      .order('scheduled_time', { ascending: true })
    
    if (error) {
      console.error('[LoadTimeSlots] Query error:', error)
    }
    
    if (scheduledSets && scheduledSets.length > 0) {
      scheduledSets.forEach(set => {
        const setTime = new Date(set.scheduled_time!)
        
        // Find matching slot by timestamp
        const slot = slots.find(s => {
          const timeDiff = Math.abs(s.date.getTime() - setTime.getTime())
          return timeDiff < 60000 // Within 1 minute
        })
        
        if (slot) {
          // Set status based on published_at
          slot.status = set.published_at ? 'published' : 'scheduled'
          slot.setId = set.id
          slot.setTitle = set.title
        }
      })
    }
    
    setTimeSlots(slots)
    
    // Extract today's slots
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)
    
    const todaysSlots = slots.filter(slot => 
      slot.date >= todayStart && slot.date < todayEnd
    )
    
    setTodaySlots(todaysSlots)
  }

  /**
   * Parse character name from filename
   * Handles various formats: "Boa_Hancock_1.jpg", "generated_Boa_Hancock_One_Piece_1.jpg", 
   * "Boa_Hancock_20250719_214427_916.jpg", "Neferpitou_20250720_162858_096.jpg", etc.
   */
  function parseCharacterFromFilename(filename: string): string | null {
    // Remove file extension and common prefixes
    let cleanName = filename
      .replace(/\.(jpg|jpeg|png|webp)$/i, '')
      .replace(/^(generated_|img_|image_)/i, '')
    
    // Common descriptive terms that are NOT character names
    const descriptiveTerms = [
      'fur', 'dataset', 'furry', 'anthro', 'female', 'male', 'toned', 
      'narrow', 'waist', 'wide', 'hips', 'muscular', 'slim', 'tall', 
      'short', 'big', 'small', 'cute', 'sexy', 'hot', 'beautiful',
      'render', 'model', 'portrait', 'fullbody', 'halfbody', 'headshot',
      'commission', 'request', 'fanart', 'original', 'oc', 'custom',
      'giga', 'mega', 'ultra', 'super', 'hyper', 'extra'
    ]
    
    // Known series names to help identify boundaries
    const seriesNames = [
      'one_piece', 'my_hero_academia', 'teen_titans', 'naruto', 'bleach',
      'dragon_ball', 'attack_on_titan', 'demon_slayer', 'one_punch_man',
      'pokemon', 'digimon', 'sailor_moon', 'evangelion', 'fate', 'my_little_pony'
    ]
    
    // First, try the simplest approach: check if the filename starts with a character name
    // This handles cases like "Neferpitou_20250720_162858_096" or "Boa_Hancock_20250719_214427_916"
    const parts = cleanName.split('_')
    
    // Check single-word character name (e.g., "Neferpitou")
    if (parts.length > 0 && parts[0].length > 0) {
      const firstWord = parts[0]
      // Check if the second part is a number (indicating this is likely the character name)
      if (parts.length > 1 && /^\d/.test(parts[1])) {
        const characterName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()
        if (isValidCharacterName(characterName)) {
          return characterName
        }
      }
      
      // Check two-word character name (e.g., "Boa_Hancock")
      if (parts.length > 2 && parts[1].length > 0 && /^\d/.test(parts[2])) {
        const characterName = [
          parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
          parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
        ].join(' ')
        if (isValidCharacterName(characterName)) {
          return characterName
        }
      }
    }
    
    // Try to extract segments separated by double underscores
    const segments = cleanName.split(/__+/)
    
    for (const segment of segments) {
      // Skip empty segments or single underscores
      if (!segment || segment === '_') continue
      
      // Check if this segment looks like a character name
      // Character names often have capitalized words or are between descriptive terms
      const words = segment.split('_').filter(w => w.length > 0)
      
      // Check if all words are descriptive terms
      const nonDescriptiveWords = words.filter(word => 
        !descriptiveTerms.includes(word.toLowerCase())
      )
      
      // If we have non-descriptive words, this might be a character name
      if (nonDescriptiveWords.length > 0 && nonDescriptiveWords.length <= 4) {
        // Check if it's a series name
        const segmentLower = segment.toLowerCase()
        if (seriesNames.some(series => segmentLower.includes(series))) {
          continue
        }
        
        // Reconstruct the character name
        const characterName = segment
          .split('_')
          .filter(word => word.length > 0)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        
        if (isValidCharacterName(characterName)) {
          return characterName
        }
      }
    }
    
    // Fallback: Try standard patterns if simple parsing didn't work
    const patterns = [
      // Pattern 1: Character name followed by series name
      new RegExp(`([A-Za-z_]+?)_(?:${seriesNames.join('|')})`, 'i'),
      // Pattern 2: Character name followed by number(s) - handles timestamps, IDs, etc.
      /^([A-Za-z_]+?)_[\d_]+$/,
      // Pattern 3: Character name between prefixes and descriptors
      new RegExp(`^(?:generated_)?([A-Za-z_]+?)_(?:${descriptiveTerms.join('|')})`, 'i'),
      // Pattern 4: Character name followed by date pattern (YYYYMMDD or similar)
      /^([A-Za-z_]+?)_\d{8}/,
      // Pattern 5: Just the character name with underscores
      /^([A-Za-z_]+)$/
    ]
    
    for (const pattern of patterns) {
      const match = cleanName.match(pattern)
      if (match) {
        const characterName = match[1]
          .split('_')
          .filter(word => word.length > 0 && !descriptiveTerms.includes(word.toLowerCase()))
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        
        if (characterName && isValidCharacterName(characterName)) {
          return characterName
        }
      }
    }
    
    return null
  }

  /**
   * Check if a parsed name is likely a valid character name
   */
  function isValidCharacterName(name: string): boolean {
    // Must have at least 2 characters
    if (name.length < 2) return false
    
    // Must not be all numbers
    if (/^\d+$/.test(name)) return false
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false
    
    // Common false positives to filter out
    const invalidNames = ['Image', 'Generated', 'Photo', 'Picture', 'File', 'Test', 'Sample']
    if (invalidNames.includes(name)) return false
    
    return true
  }

  /**
   * Check if two character names are similar (handles variations)
   */
  function areNamesSimilar(name1: string, name2: string): boolean {
    // Normalize names for comparison
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    const n1 = normalize(name1)
    const n2 = normalize(name2)
    
    // Exact match after normalization
    if (n1 === n2) return true
    
    // Don't match if lengths are too different
    if (Math.abs(name1.length - name2.length) > 10) return false
    
    // Split into parts for more complex matching
    const parts1 = name1.trim().split(/\s+/)
    const parts2 = name2.trim().split(/\s+/)
    
    // For two-part names, check for reversal (Japanese names)
    if (parts1.length === 2 && parts2.length === 2) {
      const p1First = normalize(parts1[0])
      const p1Last = normalize(parts1[1])
      const p2First = normalize(parts2[0])
      const p2Last = normalize(parts2[1])
      
      // Check for exact reversal
      if (p1First === p2Last && p1Last === p2First) {
        return true
      }
    }
    
    // For multi-part names, check if they contain the same words
    if (parts1.length >= 2 && parts2.length >= 2) {
      const words1 = new Set(parts1.map(p => normalize(p)))
      const words2 = new Set(parts2.map(p => normalize(p)))
      
      // Calculate intersection
      const intersection = new Set([...words1].filter(x => words2.has(x)))
      
      // If most words match, consider it a match
      const matchRatio = intersection.size / Math.min(words1.size, words2.size)
      if (matchRatio >= 0.8) return true
    }
    
    // Levenshtein distance for catching typos (only for similar length names)
    if (Math.abs(n1.length - n2.length) <= 3) {
      const distance = levenshteinDistance(n1, n2)
      const maxLength = Math.max(n1.length, n2.length)
      const similarity = 1 - (distance / maxLength)
      
      // 85% similarity threshold
      if (similarity >= 0.85) return true
    }
    
    return false
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Auto-detect characters and series from uploaded files
   */
  async function autoDetectCharacters() {
    if (files.length === 0) {
      alert('Please upload images first')
      return
    }
    
    // Check if characters are still loading
    if (charactersLoading) {
      alert('Please wait, character database is still loading...')
      return
    }
    
    // Check if we have any characters loaded
    if (characters.length === 0) {
      alert('No characters found in database. Please add characters first.')
      return
    }
    
    // Extract potential character names from filenames
    const detectedNames: string[] = []
    const extractionLog: { filename: string; extracted: string | null }[] = []
    
    files.forEach(file => {
      const characterName = parseCharacterFromFilename(file.name)
      extractionLog.push({ filename: file.name, extracted: characterName })
      
      if (characterName && !detectedNames.some(name => areNamesSimilar(name, characterName))) {
        detectedNames.push(characterName)
      }
    })
    
    // Log extraction details for debugging
    console.log('Character extraction log:', extractionLog)
    
    if (detectedNames.length === 0) {
      alert('No character names detected in filenames. Make sure filenames contain character names (e.g., "Boa_Hancock_1.jpg")')
      return
    }
    
    // Match detected names with database characters
    const matchedCharacterIds: string[] = []
    const matchedSeriesIds: string[] = []
    const matchedNames: string[] = []
    const unmatchedNames: string[] = []
    
    for (const detectedName of detectedNames) {
      let found = false
      
      for (const character of characters) {
        if (areNamesSimilar(detectedName, character.name)) {
          if (!matchedCharacterIds.includes(character.id)) {
            matchedCharacterIds.push(character.id)
            matchedNames.push(`${detectedName} → ${character.name}`)
            
            // Add the character's series if it exists
            if (character.series_id && !matchedSeriesIds.includes(character.series_id)) {
              matchedSeriesIds.push(character.series_id)
            }
          }
          found = true
          break
        }
      }
      
      if (!found) {
        unmatchedNames.push(detectedName)
      }
    }
    
    // Update form data with detected characters and series
    const allCharacterIds = [...new Set([...formData.characterIds, ...matchedCharacterIds])]
    const allSeriesIds = [...new Set([...formData.seriesIds, ...matchedSeriesIds])]
    
    setFormData(prev => ({
      ...prev,
      characterIds: allCharacterIds,
      seriesIds: allSeriesIds
    }))
    
    // Show detection results
    setDetectionResults({
      detected: detectedNames,
      matched: matchedNames,
      unmatched: unmatchedNames
    })
    
    // Auto-generate title based on all selected characters
    if (!formData.title || formData.title === generateTitle(formData.characterIds)) {
      const newTitle = generateTitle(allCharacterIds)
      setFormData(prev => ({ ...prev, title: newTitle }))
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
    // Clear previous detection results when new files are added
    setDetectionResults(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    // Clear detection results when files change
    setDetectionResults(null)
  }

  // Add this image compression utility
  async function compressImage(file: File, maxWidth: number = 2048, quality: number = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          
          // Use better image smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Preserve original filename
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  // Optimized upload function
  const handleUpload = async () => {
    if (!formData.title || files.length === 0) {
      alert('Please add a title and at least one image')
      return
    }
    
    if (!formData.publishImmediately && !formData.scheduledTime) {
      alert('Please select a time slot for scheduling or choose to publish immediately')
      return
    }

    setUploading(true)
    setUploadProgress({
      current: 0,
      total: files.length,
      percentage: 0,
      processing: true,
      success: false,
      currentFile: 'Preparing images...'
    })

    try {
      // Step 1: Compress images in parallel (all at once)
      console.log('Compressing images...')
      const compressionStart = Date.now()
      
      const compressedFiles = await Promise.all(
        files.map(async (file, index) => {
          try {
            // Only compress if image is larger than 1MB or wider than 2048px
            if (file.size > 1024 * 1024 || file.type.includes('png')) {
              const compressed = await compressImage(file, 2048, 0.85)
              console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`)
              return compressed
            }
            return file
          } catch (error) {
            console.warn(`Failed to compress ${file.name}, using original`, error)
            return file
          }
        })
      )
      
      console.log(`Compression completed in ${((Date.now() - compressionStart) / 1000).toFixed(2)}s`)
      
      // Step 2: Create the content set
      setUploadProgress(prev => ({ ...prev, currentFile: 'Creating content set...' }))
      
      const createResponse = await fetch('/api/upload/create-set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          characterIds: formData.characterIds,
          tags: formData.tags,
          isCommission: formData.isCommission,
          publishImmediately: formData.publishImmediately,
          scheduledTime: formData.scheduledTime,
          imageCount: files.length
        })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || 'Failed to create content set')
      }

      const { contentSet } = await createResponse.json()
      console.log('Created content set:', contentSet)

      // Step 3: Upload all images in parallel (with connection limit)
      const MAX_CONCURRENT_UPLOADS = 10 // Increase concurrent uploads
      let completedUploads = 0
      const errors: string[] = []
      
      // Create upload queue
      const uploadQueue = compressedFiles.map((file, index) => ({ file, index }))
      const results: { success: boolean; index: number; error?: any }[] = []
      
      // Process uploads with concurrency limit
      const uploadPromises: Promise<void>[] = []
      
      for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, uploadQueue.length); i++) {
        uploadPromises.push(processUploadQueue())
      }
      
      async function processUploadQueue(): Promise<void> {
        while (uploadQueue.length > 0) {
          const item = uploadQueue.shift()
          if (!item) break
          
          const { file, index } = item
          
          try {
            const imageFormData = new FormData()
            imageFormData.append('contentSetId', contentSet.id)
            imageFormData.append('image', file)
            imageFormData.append('index', index.toString())
            imageFormData.append('isFirstImage', (index === 0).toString())

            const uploadResponse = await fetch('/api/upload/image', {
              method: 'POST',
              body: imageFormData
            })

            if (!uploadResponse.ok) {
              const error = await uploadResponse.json()
              throw new Error(error.error || `Failed to upload ${file.name}`)
            }

            results[index] = { success: true, index }
            completedUploads++
            
            setUploadProgress(prev => ({
              ...prev,
              current: completedUploads,
              currentFile: file.name,
              percentage: Math.round((completedUploads / compressedFiles.length) * 100),
              processing: false
            }))
          } catch (error) {
            console.error(`Failed to upload image ${index + 1}:`, error)
            errors.push(`Image ${index + 1} (${file.name}): ${error instanceof Error ? error.message : 'Upload failed'}`)
            results[index] = { success: false, index, error }
            completedUploads++
            
            setUploadProgress(prev => ({
              ...prev,
              current: completedUploads,
              percentage: Math.round((completedUploads / compressedFiles.length) * 100)
            }))
          }
        }
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises)
      
      // Final update
      const successCount = results.filter(r => r.success).length
      const success = successCount === compressedFiles.length
      
      setUploadProgress(prev => ({
        ...prev,
        percentage: 100,
        processing: false,
        success: success
      }))

      // Show results
      if (success) {
        setTimeout(async () => {
          alert('Upload successful!')
          // Reload time slots to update statuses
          await loadTimeSlots()
          
          // Reset form
          setFormData({
            title: '',
            description: '',
            characterIds: [],
            seriesIds: [],
            tags: [],
            isCommission: false,
            scheduledTime: '',
            publishImmediately: true
          })
          setFiles([])
          setImagePreviews([])
          setUploadProgress({
            current: 0,
            total: 0,
            percentage: 0,
            processing: false
          })
          setSelectedSlot(null)
          
          if (onUploadComplete) {
            onUploadComplete()
          }
        }, 1000)
      } else {
        alert(`Upload completed with errors:\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more errors` : ''}\n\nSuccessfully uploaded: ${successCount}/${compressedFiles.length} images`)
        // Reload slots even on partial success
        loadTimeSlots()
      }

    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      // Always refresh time slots after upload attempt
      setTimeout(() => {
        loadTimeSlots()
      }, 500)
    }
  }

  const canUpload = formData.title && files.length > 0 && (formData.publishImmediately || (selectedSlot !== null && formData.scheduledTime))

  // Get slots for selected date
  const slotsForSelectedDate = timeSlots.filter(slot => {
    const slotDate = new Date(slot.date)
    return slotDate.getFullYear() === selectedDate.getFullYear() &&
           slotDate.getMonth() === selectedDate.getMonth() &&
           slotDate.getDate() === selectedDate.getDate()
  })

  // Helper function to get slot color
  const getSlotColor = (status: TimeSlot['status']) => {
    switch (status) {
      case 'published': return 'bg-green-600'
      case 'scheduled': return 'bg-orange-600'
      default: return 'bg-zinc-700'
    }
  }

  const getSlotBorderColor = (status: TimeSlot['status']) => {
    switch (status) {
      case 'published': return 'border-green-600'
      case 'scheduled': return 'border-orange-600'
      default: return 'border-zinc-700'
    }
  }

  // Reload time slots periodically to catch status changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadTimeSlots()
    }, 60000) // Refresh every minute
    
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div className="space-y-8">
      {/* Today's Schedule Section */}
      <div className="bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Today's Schedule
        </h3>
        
        {/* Time slots display */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {todaySlots.map((slot, index) => {
            const slotTime = slot.date.toLocaleTimeString('en-GB', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true,
              timeZone: userTimezone
            })
            
            return (
              <div
                key={index}
                className={`relative p-3 rounded-xl ${getSlotColor(slot.status)} text-white text-center transition-all`}
              >
                <div className="text-sm font-medium">{slotTime}</div>
                {slot.status !== 'available' && (
                  <div className="text-xs mt-1 opacity-90">
                    {slot.status === 'published' ? 'Live' : 'Pending'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {todaySlots.length === 0 && (
          <p className="text-gray-500 text-center py-8">No upcoming slots for today</p>
        )}
        
        {/* Timezone indicator */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          All times shown in {userTimezone}
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Upload Images
        </h3>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragActive 
              ? 'border-purple-600 bg-purple-600/10' 
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30 hover:bg-zinc-900/50'
          }`}
        >
          <input {...getInputProps()} />
          
          <motion.div
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </motion.div>
          
          <p className="text-white font-medium mb-2">
            {isDragActive ? 'Drop images here...' : 'Drag & drop images here'}
          </p>
          <p className="text-sm text-gray-400 mb-4">or click to select files</p>
          <p className="text-xs text-gray-500">Supports JPG, JPEG, PNG, WebP • Max 50MB per file</p>
        </div>

        {/* Image previews */}
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center justify-between">
              <span>Selected Images ({files.length})</span>
              <button
                onClick={() => {
                  setFiles([])
                  setImagePreviews([])
                  setDetectionResults(null)
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {files.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-zinc-900">
                    {imagePreviews[index] ? (
                      <img
                        src={imagePreviews[index]}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-zinc-700 rounded-full animate-spin border-t-purple-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Overlay with file info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs text-white truncate mb-1">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600/90 hover:bg-red-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Order number */}
                  <div className="absolute top-2 left-2 w-8 h-8 bg-black/80 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium text-white">{index + 1}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Content Details
          </h3>
          {files.length > 0 && (
            <button
              type="button"
              onClick={autoDetectCharacters}
              disabled={charactersLoading}
              className={`px-4 py-2 text-white text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
                charactersLoading 
                  ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {charactersLoading ? 'Loading...' : 'Auto-Detect Tags'}
            </button>
          )}
        </div>

        {/* Detection Results */}
        {detectionResults && (
          <div className="mb-6 p-4 bg-zinc-900/50 rounded-xl border border-white/10">
            <h4 className="text-sm font-medium text-white mb-3">Detection Results</h4>
            
            {detectionResults.matched.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-green-400 mb-1">✓ Successfully matched:</p>
                <div className="space-y-1">
                  {detectionResults.matched.map((match, idx) => (
                    <div key={idx} className="text-sm text-gray-300">
                      {match}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {detectionResults.unmatched.length > 0 && (
              <div>
                <p className="text-xs text-amber-400 mb-1">⚠ Not found in database:</p>
                <div className="space-y-1">
                  {detectionResults.unmatched.map((name, idx) => (
                    <div key={idx} className="text-sm text-gray-300">
                      {name}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These characters may need to be added to the database first.
                </p>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setDetectionResults(null)}
              className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a descriptive title..."
              className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 focus:bg-zinc-900 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a description (optional)..."
              className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 focus:bg-zinc-900 transition-all duration-200 resize-none"
              rows={4}
            />
          </div>

          <SearchableTagInput
            items={characters}
            selectedIds={formData.characterIds}
            onChange={(ids) => {
              // Auto-update title if it appears to be auto-generated
              const currentTitle = formData.title
              const isLikelyAutoGenerated = !currentTitle || 
                currentTitle === generateTitle(formData.characterIds) ||
                characters.some(c => c.name === currentTitle) ||
                series.some(s => s.name === currentTitle) ||
                currentTitle === 'Variety Set' ||
                /^[^&]+ & [^&]+$/.test(currentTitle) ||
                /^[^&]+ & [^&]+ \+\d+$/.test(currentTitle) // Legacy format
              
              // Auto-detect series from selected characters
              const selectedCharacters = characters.filter(c => ids.includes(c.id))
              const characterSeriesIds = selectedCharacters
                .map(c => c.series_id)
                .filter(Boolean) as string[]
              const uniqueSeriesIds = [...new Set(characterSeriesIds)]
              
              if (isLikelyAutoGenerated) {
                const newTitle = generateTitle(ids)
                setFormData(prev => ({ 
                  ...prev, 
                  characterIds: ids,
                  seriesIds: uniqueSeriesIds,
                  title: newTitle 
                }))
              } else {
                setFormData(prev => ({ 
                  ...prev, 
                  characterIds: ids,
                  seriesIds: uniqueSeriesIds 
                }))
              }
            }}
            placeholder="Search and select characters..."
            label="Characters"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <SearchableTagInput
            items={series}
            selectedIds={formData.seriesIds}
            onChange={(ids) => setFormData(prev => ({ ...prev, seriesIds: ids }))}
            placeholder="Search and select series..."
            label="Series"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0)
                setFormData(prev => ({ ...prev, tags }))
              }}
              placeholder="Enter tags separated by commas..."
              className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50 focus:bg-zinc-900 transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">e.g., "NEW, featured, exclusive"</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isCommission}
              onChange={(e) => setFormData(prev => ({ ...prev, isCommission: e.target.checked }))}
              className="w-5 h-5 bg-zinc-900/50 border border-white/10 rounded text-purple-600 focus:ring-purple-600 focus:ring-offset-0 focus:ring-2"
            />
            <span className="text-sm text-gray-300">This is a commission</span>
          </label>
        </div>
      </div>

      {/* Publishing Options */}
      <div className="bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Publishing Options
        </h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer p-4 bg-zinc-900/30 rounded-xl border border-white/5 hover:border-purple-600/30 transition-all">
            <input
              type="radio"
              name="publishOption"
              checked={formData.publishImmediately}
              onChange={() => {
                setFormData(prev => ({ ...prev, publishImmediately: true, scheduledTime: '' }))
                setSelectedSlot(null)
              }}
              className="w-5 h-5 text-purple-600 focus:ring-purple-600"
            />
            <div>
              <p className="text-sm font-medium text-white">Publish immediately</p>
              <p className="text-xs text-gray-400">Content will be live right after upload</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-4 bg-zinc-900/30 rounded-xl border border-white/5 hover:border-purple-600/30 transition-all">
            <input
              type="radio"
              name="publishOption"
              checked={!formData.publishImmediately}
              onChange={() => setFormData(prev => ({ ...prev, publishImmediately: false }))}
              className="w-5 h-5 text-purple-600 focus:ring-purple-600"
            />
            <div>
              <p className="text-sm font-medium text-white">Schedule for later</p>
              <p className="text-xs text-gray-400">Choose a specific time to publish</p>
            </div>
          </label>
        </div>

        {/* Time slots */}
        {!formData.publishImmediately && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-300 mb-4">Select time slot</h4>
            
            {/* Date navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(newDate.getDate() - 1)
                  setSelectedDate(newDate)
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <div className="text-lg font-medium text-white">
                  {selectedDate.toLocaleDateString('en-GB', { weekday: 'long' })}
                </div>
                <div className="text-sm text-gray-400">
                  {selectedDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(newDate.getDate() + 1)
                  setSelectedDate(newDate)
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Time slots for selected date */}
            <div className="grid grid-cols-4 gap-3">
              {slotsForSelectedDate.map((slot, index) => {
                const globalIndex = timeSlots.indexOf(slot)
                const isSelected = selectedSlot === globalIndex
                const slotTime = slot.date.toLocaleTimeString('en-GB', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true,
                  timeZone: userTimezone
                })
                const isDisabled = slot.status !== 'available'
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedSlot(globalIndex)
                        // Store the time in UTC
                        setFormData(prev => ({ 
                          ...prev, 
                          scheduledTime: slot.date.toISOString() 
                        }))
                      }
                    }}
                    disabled={isDisabled}
                    className={`relative p-4 rounded-xl border-2 font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-600 text-purple-400'
                        : isDisabled
                        ? `bg-transparent ${getSlotBorderColor(slot.status)} text-gray-500 cursor-not-allowed opacity-50`
                        : 'bg-transparent border-zinc-700 text-gray-300 hover:border-zinc-600 hover:bg-zinc-900/30'
                    }`}
                    title={slot.status === 'scheduled' ? `Taken by: ${slot.setTitle}` : ''}
                  >
                    <div className="text-sm">{slotTime}</div>
                    {slot.status !== 'available' && (
                      <div className="text-xs mt-1 opacity-75">
                        {slot.status === 'published' ? 'Published' : 'Scheduled'}
                      </div>
                    )}
                    {isSelected && (
                      <motion.div
                        layoutId="selectedSlot"
                        className="absolute inset-0 border-2 border-purple-600 rounded-xl pointer-events-none"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
            
            {slotsForSelectedDate.length === 0 && (
              <p className="text-gray-500 text-center py-8">No available slots for this date</p>
            )}
            
            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-zinc-700 rounded"></div>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-orange-600 rounded"></div>
                <span className="text-gray-400">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-600 rounded"></div>
                <span className="text-gray-400">Published</span>
              </div>
            </div>
            
            {/* Timezone reminder */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              Times shown in {userTimezone} • Stored as UTC
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !canUpload}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform ${
          uploading || !canUpload
            ? 'bg-gray-700 cursor-not-allowed opacity-50'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-3 border-white/30 rounded-full animate-spin border-t-white"></div>
            <span>Uploading... {uploadProgress.percentage}%</span>
          </div>
        ) : (
          'Upload Content'
        )}
      </button>
    </div>

    {/* Upload Progress Modal */}
    <AnimatePresence>
      {uploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold text-white mb-6 text-center">
              Uploading Content...
            </h3>
            
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="relative">
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress.percentage}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                  {uploadProgress.percentage}%
                </span>
              </div>
              
              {/* Status text */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-400">
                  Uploading image {uploadProgress.current} of {uploadProgress.total}
                </p>
                {uploadProgress.currentFile && (
                  <p className="text-xs text-gray-500 truncate max-w-xs mx-auto">
                    {uploadProgress.currentFile}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  Processing and uploading to storage...
                </p>
              </div>
              
              {/* Success state */}
              {uploadProgress.success && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex justify-center mt-6"
                >
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}