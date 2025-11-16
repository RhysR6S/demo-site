// src/lib/auth.config.ts
import { AuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import PatreonProvider from "next-auth/providers/patreon"
import { getSupabaseAdmin } from "@/lib/supabase"
import type { AuthError, AuthErrorCode } from "@/types/auth-errors"

const TOKEN_REFRESH_INTERVAL = 21600000 // 6 hours

/**
 * Create a detailed error object for debugging
 */
function createAuthError(
  code: AuthErrorCode,
  message: string,
  error?: any,
  userId?: string,
  email?: string
): AuthError {
  return {
    code,
    message,
    details: error?.message || error?.toString(),
    stackTrace: error?.stack || new Error().stack,
    timestamp: new Date().toISOString(),
    userId,
    attemptedEmail: email
  }
}

/**
 * Fetch fresh membership data from Patreon API
 */
async function fetchPatreonMembership(accessToken: string, userId: string) {
  try {
    const membershipResponse = await fetch(
      `https://www.patreon.com/api/oauth2/v2/identity?include=memberships.campaign&fields[user]=email,full_name&fields[member]=patron_status,currently_entitled_amount_cents,campaign_lifetime_support_cents`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!membershipResponse.ok) {
      const errorText = await membershipResponse.text()
      throw new Error(`Patreon API returned ${membershipResponse.status}: ${errorText}`)
    }

    const patreonData = await membershipResponse.json()
    const membership = patreonData.included?.find((item: any) => item.type === 'member')
    const campaigns = patreonData.included?.filter((item: any) => item.type === 'campaign') || []
    
    // Check if user is the creator
    const ownsCampaign = campaigns.some((campaign: any) => 
      campaign.id === process.env.NEXT_PUBLIC_PATREON_CREATORS_PAGE_ID
    )
    const isCreator = ownsCampaign || userId === process.env.PATREON_CREATOR_USER_ID
    
    // Determine user status
    const isActivePatron = membership?.attributes?.patron_status === 'active_patron'
    const campaignId = membership?.relationships?.campaign?.data?.id
    
    // Determine membership tier based on amount
    const entitledAmount = membership?.attributes?.currently_entitled_amount_cents || 0
    let membershipTier: string | null = null
    
    if (isCreator) {
      membershipTier = 'creator'
    } else if (isActivePatron) {
      if (entitledAmount >= 2500) {
        membershipTier = 'platinum'
      } else if (entitledAmount >= 1500) {
        membershipTier = 'gold'
      } else if (entitledAmount >= 500) {
        membershipTier = 'silver'
      } else {
        membershipTier = 'bronze'
      }
    }

    console.log('✅ Patreon membership fetched:', {
      userId,
      isCreator,
      isActivePatron,
      membershipTier,
      entitledAmount
    })

    return {
      isActivePatron,
      isCreator,
      membershipTier,
      campaignId,
      entitledAmount
    }
  } catch (error) {
    console.error('❌ Error fetching Patreon membership:', error)
    throw error
  }
}

/**
 * Update user in database with fresh membership data
 */
async function updateUserInDatabase(
  userId: string,
  email: string | null | undefined,
  name: string | null | undefined,
  membershipData: {
    isActivePatron: boolean
    isCreator: boolean
    membershipTier: string | null
    entitledAmount: number
  }
) {
  try {
    const supabase = getSupabaseAdmin()
    const { isActivePatron, isCreator, membershipTier, entitledAmount } = membershipData
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    const now = new Date().toISOString()
    const effectivelyActive = isActivePatron || isCreator
    
    let freeCommissions = 0
    if (membershipTier === 'gold') freeCommissions = 1
    else if (membershipTier === 'platinum') freeCommissions = 2
    else if (membershipTier === 'creator') freeCommissions = 999

    if (existingUser) {
      const shouldResetCommissions = 
        (!existingUser.is_active_patron && effectivelyActive) ||
        (existingUser.membership_tier !== membershipTier && ['gold', 'platinum', 'creator'].includes(membershipTier || ''))

      const updateData: any = {
        email: email || existingUser.email,
        name: name || existingUser.name,
        patreon_user_id: userId,
        is_active_patron: effectivelyActive,
        is_creator: isCreator,
        membership_tier: membershipTier,
        last_login_at: now,
        login_count: (existingUser.login_count || 0) + 1,
        updated_at: now,
      }

      if (effectivelyActive) {
        updateData.subscription_status = 'active'
        if (!existingUser.subscription_started_at) {
          updateData.subscription_started_at = now
        }
        
        if (shouldResetCommissions) {
          updateData.subscription_renewed_at = now
          updateData.free_commissions_remaining = freeCommissions
          updateData.free_commissions_reset_at = now
        }
      } else {
        updateData.subscription_status = 'inactive'
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error

      console.log('✅ User updated in database:', { userId, membershipTier })
    } else {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email || '',
          name: name || '',
          patreon_user_id: userId,
          is_active_patron: effectivelyActive,
          is_creator: isCreator,
          membership_tier: membershipTier,
          subscription_status: effectivelyActive ? 'active' : 'inactive',
          subscription_started_at: effectivelyActive ? now : null,
          subscription_renewed_at: effectivelyActive ? now : null,
          free_commissions_remaining: freeCommissions,
          free_commissions_reset_at: effectivelyActive ? now : null,
          last_login_at: now,
          login_count: 1,
          created_at: now,
          updated_at: now,
        })

      if (error) throw error

      console.log('✅ New user created in database:', { userId, membershipTier })
    }
  } catch (error) {
    console.error('❌ Database error:', error)
    throw error
  }
}

export const authOptions: AuthOptions = {
  providers: [
    PatreonProvider({
      clientId: process.env.PATREON_CLIENT_ID!,
      clientSecret: process.env.PATREON_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identity identity[email] campaigns campaigns.members",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, user, trigger }) {
      const now = Date.now()
      
      // Initial sign in
      if (account && user) {
        console.log('🔐 Initial sign in detected:', { userId: user.id, email: user.email })
        
        token.accessToken = account.access_token
        token.patreonUserId = user.id
        token.lastRefreshed = now
        token.authError = undefined // Clear any previous errors
        
        try {
          // Fetch fresh membership data
          const membershipData = await fetchPatreonMembership(account.access_token!, user.id)
          
          token.isActivePatron = membershipData.isActivePatron || membershipData.isCreator
          token.isCreator = membershipData.isCreator
          token.membershipTier = membershipData.membershipTier || 'creator'
          token.campaignId = membershipData.campaignId
          
          // Check if user has access (patron or creator)
          if (!membershipData.isActivePatron && !membershipData.isCreator) {
            console.warn('⚠️ User is not an active patron or creator:', { userId: user.id })
            token.authError = createAuthError(
              'not_patron',
              'No active Patreon membership found',
              null,
              user.id,
              user.email || undefined
            )
            return token
          }
          
          // Update database
          await updateUserInDatabase(user.id, user.email, user.name, {
            isActivePatron: membershipData.isActivePatron,
            isCreator: membershipData.isCreator,
            membershipTier: membershipData.membershipTier,
            entitledAmount: membershipData.entitledAmount
          })
          
          // Fetch creator profile if creator
          if (membershipData.isCreator) {
            const supabase = getSupabaseAdmin()
            const { data: creatorProfile } = await supabase
              .from('creator_profile')
              .select('display_name, profile_picture_url, bio')
              .eq('user_id', user.id)
              .single()
            
            token.creatorProfile = creatorProfile ? {
              displayName: creatorProfile.display_name,
              profilePictureUrl: creatorProfile.profile_picture_url,
              bio: creatorProfile.bio
            } : {
              displayName: 'KamiXXX',
              profilePictureUrl: null,
              bio: null
            }
          }
          
          console.log('✅ Sign in successful:', { 
            userId: user.id, 
            tier: token.membershipTier 
          })
          
        } catch (error: any) {
          console.error('❌ Error during sign in:', error)
          
          // Determine error type
          let errorCode: AuthErrorCode = 'unknown_error'
          if (error.message?.includes('Patreon API')) {
            errorCode = 'patreon_api_error'
          } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
            errorCode = 'network_error'
          } else if (error.message?.includes('database') || error.code?.startsWith('PG')) {
            errorCode = 'database_error'
          }
          
          token.authError = createAuthError(
            errorCode,
            `Sign in failed: ${error.message}`,
            error,
            user.id,
            user.email || undefined
          )
          token.isActivePatron = false
          token.isCreator = false
        }
      }
      
      // Automatic refresh check
      else if (token.accessToken && token.patreonUserId) {
        const timeSinceRefresh = now - ((token.lastRefreshed as number) || 0)
        const shouldRefresh = timeSinceRefresh > TOKEN_REFRESH_INTERVAL
        
        if (shouldRefresh) {
          console.log('🔄 Refreshing token...', {
            timeSinceRefresh: Math.round(timeSinceRefresh / 1000 / 60) + ' minutes',
            userId: token.patreonUserId
          })
          
          try {
            const membershipData = await fetchPatreonMembership(
              token.accessToken as string,
              token.patreonUserId as string
            )
            
            const oldTier = token.membershipTier
            token.isActivePatron = membershipData.isActivePatron || membershipData.isCreator
            token.isCreator = membershipData.isCreator
            token.membershipTier = membershipData.membershipTier || 'creator'
            token.campaignId = membershipData.campaignId
            token.lastRefreshed = now
            token.authError = undefined // Clear any previous errors
            
            if (oldTier !== token.membershipTier) {
              console.log('⚡ Membership tier changed:', { oldTier, newTier: token.membershipTier })
            }
            
            await updateUserInDatabase(
              token.patreonUserId as string,
              token.email as string,
              token.name as string,
              {
                isActivePatron: membershipData.isActivePatron,
                isCreator: membershipData.isCreator,
                membershipTier: membershipData.membershipTier,
                entitledAmount: membershipData.entitledAmount
              }
            )
          } catch (error: any) {
            console.error('❌ Error refreshing token:', error)
            // Keep existing token data but update refresh timestamp
            token.lastRefreshed = now
          }
        }
        
        // Always refresh creator profile if creator
        if (token.isCreator) {
          try {
            const supabase = getSupabaseAdmin()
            const { data: creatorProfile } = await supabase
              .from('creator_profile')
              .select('display_name, profile_picture_url, bio')
              .eq('user_id', token.sub)
              .single()
            
            if (creatorProfile) {
              token.creatorProfile = {
                displayName: creatorProfile.display_name,
                profilePictureUrl: creatorProfile.profile_picture_url,
                bio: creatorProfile.bio
              }
            }
          } catch (error) {
            console.error('Error fetching creator profile:', error)
          }
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Check for authentication errors
      if (token.authError) {
        return {
          ...session,
          error: token.authError,
          user: {
            ...session.user,
            id: token.sub!,
            isActivePatron: false,
            isCreator: false,
            membershipTier: null,
            patreonUserId: token.patreonUserId,
            creatorProfile: null
          },
        }
      }
      
      // Check if user is authorized
      const isAuthorized = token.isActivePatron || token.isCreator || false
      
      if (!isAuthorized && session.user) {
        return {
          ...session,
          error: createAuthError(
            'not_patron',
            'No active membership found',
            null,
            token.sub,
            session.user.email || undefined
          ),
          user: {
            ...session.user,
            id: token.sub!,
            isActivePatron: false,
            isCreator: false,
            membershipTier: null,
            patreonUserId: token.patreonUserId,
            creatorProfile: null
          },
        }
      }
      
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub!,
          isActivePatron: token.isActivePatron || false,
          isCreator: token.isCreator || false,
          membershipTier: token.membershipTier,
          patreonUserId: token.patreonUserId,
          creatorProfile: token.creatorProfile
        },
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
}