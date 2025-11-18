// src/app/privacy/manage/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AuthWrapper } from "@/components/auth-wrapper"

interface PrivacySettings {
  trackingConsent: boolean
  communicationConsent: boolean
  consentDate?: string
}

export default function PrivacyManagePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<PrivacySettings>({
    trackingConsent: false,
    communicationConsent: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadPrivacySettings()
    }
  }, [session])

  async function loadPrivacySettings() {
    try {
      const response = await fetch('/api/privacy/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateSettings() {
    setSaving(true)
    try {
      const response = await fetch('/api/privacy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        alert('Privacy settings updated successfully')
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      alert('Failed to update privacy settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function exportData() {
    setExportingData(true)
    try {
      const response = await fetch('/api/privacy/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `photovault-data-export-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      alert('Failed to export data. Please try again.')
    } finally {
      setExportingData(false)
    }
  }

  async function deleteAccount() {
    setDeletingAccount(true)
    try {
      const response = await fetch('/api/privacy/delete', {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('Your account has been deleted. You will be redirected.')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        throw new Error('Deletion failed')
      }
    } catch (error) {
      alert('Failed to delete account. Please contact support.')
    } finally {
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-black">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h1 className="text-3xl font-bold text-white mb-2">Privacy Settings</h1>
              <p className="text-gray-400">Control how we collect and use your data</p>
            </div>

            {/* Consent Settings */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Data Collection Consent</h2>
              
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Activity Tracking */}
                  <div className="flex items-start justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex-1 pr-4">
                      <h3 className="font-semibold text-white mb-1">Activity Tracking</h3>
                      <p className="text-sm text-gray-400">
                        Allow us to collect viewing patterns and download history to improve content recommendations and service performance.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.trackingConsent}
                        onChange={(e) => setSettings({ ...settings, trackingConsent: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-red-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {/* Communication */}
                  <div className="flex items-start justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5">
                    <div className="flex-1 pr-4">
                      <h3 className="font-semibold text-white mb-1">Service Communications</h3>
                      <p className="text-sm text-gray-400">
                        Receive updates about new content, features, and important service announcements.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.communicationConsent}
                        onChange={(e) => setSettings({ ...settings, communicationConsent: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-red-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {settings.consentDate && (
                    <p className="text-xs text-gray-500">
                      Consent last updated: {new Date(settings.consentDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={updateSettings}
                disabled={saving || loading}
                className="mt-6 px-6 py-3 bg-sky-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {/* Data Rights */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Your Data Rights</h2>
              
              <div className="space-y-4">
                {/* Export Data */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white mb-1">Export Your Data</h3>
                      <p className="text-sm text-gray-400">
                        Download all data we have collected about you in JSON format
                      </p>
                    </div>
                    <button
                      onClick={exportData}
                      disabled={exportingData}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      {exportingData ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-red-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white mb-1">Delete Account</h3>
                      <p className="text-sm text-gray-400">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-sky-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
              <p className="text-blue-400 text-sm">
                For additional privacy requests or questions, contact us at{' '}
                <a href="mailto:privacy@photovault-demo.com" className="underline">
                  privacy@photovault-demo.com
                </a>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-sky-600/20"
            >
              <h3 className="text-xl font-bold text-white mb-4">Delete Account?</h3>
              <p className="text-gray-300 mb-6">
                This action cannot be undone. All your data will be permanently deleted, including:
              </p>
              <ul className="list-disc list-inside text-gray-400 mb-6 space-y-1">
                <li>View history and favorites</li>
                <li>Download records</li>
                <li>Messages and comments</li>
                <li>All activity logs</li>
              </ul>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deletingAccount}
                  className="flex-1 px-4 py-2 bg-sky-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {deletingAccount ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AuthWrapper>
  )
}