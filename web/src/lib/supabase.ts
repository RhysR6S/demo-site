// Path: src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Client-side Supabase client (uses anon key)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
    db: {
      schema: 'public'
    },
    global: {
      headers: { 
        'x-client-info': 'messaging-app',
        'x-connection-pooling': 'true' // Enable connection pooling
      }
    }
  }
)

// Singleton instance for admin client to prevent multiple connections
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null

// Server-side Supabase admin client factory with singleton pattern
// This function only runs in API routes, never in the browser
export function getSupabaseAdmin() {
  // Return existing instance if available
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    console.error('[getSupabaseAdmin] Missing environment variables:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey
    })
    throw new Error('Server-side Supabase configuration missing')
  }
  
  // Create and cache the admin client instance
  supabaseAdminInstance = createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-connection-pooling': 'true' // Enable connection pooling
      }
    }
  })

  return supabaseAdminInstance
}

// Optional: Function to reset the admin client (useful for testing or connection issues)
export function resetSupabaseAdmin() {
  supabaseAdminInstance = null
}