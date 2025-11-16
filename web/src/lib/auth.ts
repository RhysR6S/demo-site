// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabase } from "@/lib/supabase"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Ensure user exists in database on every sign in
      try {
        await supabase.rpc('ensure_user_exists', {
          p_user_id: user.id!,
          p_email: user.email!,
          p_name: user.name
        })
      } catch (error) {
        console.error('Error ensuring user exists:', error)
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub!
        session.user.isCreator = token.isCreator as boolean
        session.user.isActivePatron = token.isActivePatron as boolean
        session.user.membershipTier = token.membershipTier as string
      }
      return session
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        
        // Fetch user data from database using ID
        const { data } = await supabase
          .from('users')
          .select('is_creator, is_active_patron, membership_tier')
          .eq('id', user.id)
          .single()
        
        if (data) {
          token.isCreator = data.is_creator
          token.isActivePatron = data.is_active_patron
          token.membershipTier = data.membership_tier
        }
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}