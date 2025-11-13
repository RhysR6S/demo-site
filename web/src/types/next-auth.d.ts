// src/types/next-auth.d.ts

import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"
import type { AuthError } from "./auth-errors"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isActivePatron: boolean
      isCreator: boolean
      membershipTier: string | null
      patreonUserId?: string
      creatorProfile?: {
        displayName: string
        profilePictureUrl: string | null
        bio: string | null
      } | null
    } & DefaultSession["user"]
    error?: AuthError
  }

  interface User extends DefaultUser {
    id: string
    isActivePatron?: boolean
    isCreator?: boolean
    membershipTier?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string
    patreonUserId?: string
    isActivePatron?: boolean
    isCreator?: boolean
    membershipTier?: string | null
    campaignId?: string
    creatorProfile?: {
      displayName: string
      profilePictureUrl: string | null
      bio: string | null
    } | null
    lastRefreshed?: number
    authError?: AuthError
  }
}
