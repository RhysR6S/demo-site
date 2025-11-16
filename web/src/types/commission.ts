// src/types/commission.ts

export interface Commission {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_tier: string
  type: 'set' | 'custom'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  is_free_tier: boolean
  request_data: CommissionRequestData
  notes?: string | null
  created_at: string
  completed_at?: string | null
}

export interface CommissionRequestData {
  type: 'set' | 'custom'
  // For character sets
  femaleCharacters?: string[]
  maleCharacter?: string | null
  locations?: string[]
  setBias?: string
  clothing?: string
  expressions?: string
  bodyType?: string
  otherRequests?: string
  // For custom images
  description?: string
  references?: string[]
}

export interface CommissionStatus {
  available: number  // Total free commissions per month based on tier
  used: number       // Free commissions used this month
  total: number      // Total commissions submitted this month
  tier: string       // User's membership tier
}

export interface CreateCommissionRequest {
  type: 'set' | 'custom'
  // Include all fields from CommissionRequestData
}

export interface UpdateCommissionRequest {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
}

// Commission tier limits
export const COMMISSION_LIMITS = {
  bronze: 0,
  silver: 0,
  gold: 2,
  diamond: 4,
  platinum: 6
} as const

// Helper function to get commission limit for a tier
export function getCommissionLimit(tier: string): number {
  const lowerTier = tier.toLowerCase()
  return COMMISSION_LIMITS[lowerTier as keyof typeof COMMISSION_LIMITS] || 0
}

// Helper function to format commission status
export function formatCommissionStatus(status: Commission['status']): string {
  const statusMap = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}