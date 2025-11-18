// Path: src/app/commissions/success/page.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/main-layout'
import { AuthWrapper } from '@/components/auth-wrapper'
import { motion } from 'framer-motion'
import Link from 'next/link'

function SuccessContent() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timeout = setTimeout(() => {
      router.push('/commissions')
    }, 10000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 -z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
          
          {/* Animated gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-green-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-green-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-3/4 left-3/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
          
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto px-6"
          >
            {/* Success Icon with Glow */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.2
              }}
              className="relative inline-block mb-8"
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl"></div>
              <div className="relative w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-600/50">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  />
                </svg>
              </div>
            </motion.div>

            {/* Success Message */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4"
            >
              Commission Submitted!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-300 mb-8"
            >
              Your commission request has been successfully submitted.
            </motion.p>

            {/* Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10 mb-8"
            >
              <div className="space-y-4 text-left">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">What happens next?</h3>
                  <p className="text-gray-200">The creator will review your commission request and contact you within 24-48 hours to discuss details and confirm the commission.</p>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Track your commission</h3>
                  <p className="text-gray-200">You can check the status of your commission anytime from your commissions page.</p>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/commissions"
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-purple-600/25"
              >
                View All Commissions
              </Link>
              
              <Link
                href="/gallery"
                className="px-8 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all duration-300 border border-white/10"
              >
                Browse Gallery
              </Link>
            </motion.div>

            {/* Auto-redirect notice */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-sm text-gray-500 mt-8"
            >
              You'll be redirected to the commissions page in a few seconds...
            </motion.p>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  )
}

export default function CommissionSuccessPage() {
  return (
    <AuthWrapper>
      <SuccessContent />
    </AuthWrapper>
  )
}