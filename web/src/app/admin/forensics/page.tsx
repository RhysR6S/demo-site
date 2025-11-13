// src/app/admin/forensics/page.tsx
'use client'

import { useState } from 'react'

export default function ForensicsPage() {
  const [imageId, setImageId] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function investigateImage() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/forensics/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId })
      })
      
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Investigation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Forensic Investigation</h1>
      
      <div className="mb-8">
        <label className="block mb-2">Image ID to Investigate:</label>
        <input
          type="text"
          value={imageId}
          onChange={(e) => setImageId(e.target.value)}
          className="px-4 py-2 border rounded w-full max-w-md"
          placeholder="Enter image UUID"
        />
        <button
          onClick={investigateImage}
          disabled={loading || !imageId}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Investigating...' : 'Investigate'}
        </button>
      </div>

      {results && (
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Access History</h2>
          
          <div className="space-y-4">
            {results.accesses?.map((access: any, index: number) => (
              <div key={index} className="border-b border-gray-700 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>User:</strong> {access.users?.email}
                  </div>
                  <div>
                    <strong>Name:</strong> {access.users?.name}
                  </div>
                  <div>
                    <strong>Tier:</strong> {access.users?.membership_tier}
                  </div>
                  <div>
                    <strong>Time:</strong> {new Date(access.created_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>IP:</strong> {access.ip_address}
                  </div>
                  <div>
                    <strong>Action:</strong> {access.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
