// Path: src/app/admin/profile/page.tsx

"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { WatermarkSettings } from '@/components/admin/watermark-settings'

interface CreatorProfile {
  display_name: string
  profile_picture_url: string | null
  bio: string | null
}

export default function CreatorProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'watermark'>('profile')
  const [profile, setProfile] = useState<CreatorProfile>({
    display_name: 'DemoCreator',
    profile_picture_url: null,
    bio: null
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (session && !session.user?.isCreator) {
      router.push('/')
    } else if (session) {
      loadProfile()
    }
  }, [session, router])

  async function loadProfile() {
    try {
      const response = await fetch('/api/creator/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/creator/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        
        // Refresh the session to update the displayed name immediately
        await fetch('/api/auth/refresh', { method: 'POST' })
        
        // Reload the page to show the updated profile
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-sky-600/20 rounded-full animate-spin border-t-sky-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Creator Settings</h1>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-slate-900/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab('watermark')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'watermark'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Watermark Settings
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  id="display_name"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent"
                  placeholder="Enter your display name"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">
                  This name will be shown to members instead of your Patreon name
                </p>
              </div>

              {/* Profile Picture URL */}
              <div>
                <label htmlFor="profile_picture_url" className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Picture URL
                </label>
                <input
                  type="url"
                  id="profile_picture_url"
                  value={profile.profile_picture_url || ''}
                  onChange={(e) => setProfile({ ...profile, profile_picture_url: e.target.value || null })}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent"
                  placeholder="https://example.com/profile.jpg"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Optional: URL to your profile picture (recommended size: 200x200px)
                </p>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
                  rows={4}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-transparent resize-none"
                  placeholder="Tell members a bit about yourself..."
                />
                <p className="mt-2 text-xs text-gray-400">
                  Optional: A short bio that can be displayed on your profile
                </p>
              </div>

              {/* Preview */}
              <div className="mt-8 p-6 bg-black/30 rounded-lg border border-white/5">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Preview</h3>
                <div className="flex items-center gap-4">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt={profile.display_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/10"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {profile.display_name[0]?.toUpperCase() || 'C'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-white font-semibold">{profile.display_name}</h4>
                    {profile.bio && (
                      <p className="text-sm text-gray-400 mt-1">{profile.bio}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-600/10 border border-green-600/20 text-green-400'
                    : 'bg-sky-600/10 border border-sky-600/20 text-sky-400'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Watermark Tab */}
        {activeTab === 'watermark' && session?.user?.id && (
          <WatermarkSettings userId={session.user.id} />
        )}

        {/* Privacy Note */}
        <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
          <p className="text-sm text-blue-400">
            <strong>Privacy Note:</strong> Your email address is never shown to members. Only your display name and optional profile picture are visible in the community features.
          </p>
        </div>

        {/* Tier Information */}
        {activeTab === 'watermark' && (
          <div className="mt-4 p-4 bg-purple-600/10 border border-purple-600/20 rounded-lg">
            <p className="text-sm text-cyan-400">
              <strong>Tier System:</strong> Bronze members will see watermarks on all images. Silver, Gold, and Platinum members get clean, unwatermarked images for both viewing and downloading.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}