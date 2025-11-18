'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DemoLogin() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const demoAccounts = [
    { email: 'bronze@demo.com', tier: 'Bronze', color: 'bg-orange-500' },
    { email: 'silver@demo.com', tier: 'Silver', color: 'bg-gray-400' },
    { email: 'gold@demo.com', tier: 'Gold', color: 'bg-yellow-500' },
    { email: 'diamond@demo.com', tier: 'Diamond', color: 'bg-blue-500' },
    { email: 'platinum@demo.com', tier: 'Platinum', color: 'bg-purple-500' },
    { email: 'admin@demo.com', tier: 'Admin', color: 'bg-sky-500' },
  ]

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true)
    setError('')

    const result = await signIn('demo-credentials', {
      email: demoEmail,
      password: 'demo123',
      redirect: false,
    })

    if (result?.error) {
      setError('Login failed. Please try again.')
      setLoading(false)
    } else {
      router.push('/gallery')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Demo Platform</h2>
          <p className="text-gray-300 text-sm">Portfolio Demonstration</p>
        </div>

        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-200 text-sm text-center">
            This is a demo version with safe placeholder content.
            All accounts use password: <code className="bg-black/30 px-2 py-1 rounded">demo123</code>
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-gray-300 text-sm font-medium">Quick Login:</p>
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              onClick={() => handleQuickLogin(account.email)}
              disabled={loading}
              className={`w-full ${account.color} text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium`}
            >
              Login as {account.tier}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-sky-500/20 border border-sky-500/30 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>For employers: This demonstrates authentication flow</p>
          <p>Original project uses Patreon OAuth integration</p>
        </div>
      </div>
    </div>
  )
}