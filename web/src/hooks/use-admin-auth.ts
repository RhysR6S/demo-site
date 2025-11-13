// src/hooks/use-admin-auth.ts
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAdminAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isLoading = status === 'loading'
  const isCreator = session?.user?.isCreator || false
  
  useEffect(() => {
    if (!isLoading && !isCreator) {
      router.push('/')
    }
  }, [isLoading, isCreator, router])
  
  return {
    session,
    isCreator,
    isLoading,
    user: session?.user
  }
}
