// src/types/auth-errors.ts

export type AuthErrorCode = 
  | 'not_patron'
  | 'patreon_api_error'
  | 'network_error'
  | 'database_error'
  | 'oauth_error'
  | 'unknown_error'

export interface AuthError {
  code: AuthErrorCode
  message: string
  details?: string
  stackTrace?: string
  timestamp: string
  userId?: string
  attemptedEmail?: string
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, { title: string; description: string }> = {
  not_patron: {
    title: 'No Active Membership Found',
    description: 'You need an active Patreon membership to access this content. Please subscribe on Patreon and try again.'
  },
  patreon_api_error: {
    title: 'Patreon Connection Error',
    description: 'We couldn\'t verify your membership with Patreon. This is usually temporary - please try again in a few minutes.'
  },
  network_error: {
    title: 'Network Connection Error',
    description: 'There was a problem connecting to our servers. Please check your internet connection and try again.'
  },
  database_error: {
    title: 'Database Error',
    description: 'We encountered an error saving your account information. Please try again.'
  },
  oauth_error: {
    title: 'Authentication Error',
    description: 'There was a problem during the login process. Please try signing in again.'
  },
  unknown_error: {
    title: 'Unknown Error',
    description: 'An unexpected error occurred. Please try again or contact support if the issue persists.'
  }
}

/**
 * Type guard to check if a string is a valid AuthErrorCode
 */
export function isAuthErrorCode(code: string): code is AuthErrorCode {
  return ['not_patron', 'patreon_api_error', 'network_error', 'database_error', 'oauth_error', 'unknown_error'].includes(code)
}
