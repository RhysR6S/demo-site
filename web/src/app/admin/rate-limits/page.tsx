// src/app/admin/rate-limits/page.tsx
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter'
import { getTopRateLimitUsers, getRateLimitStats } from '@/lib/rate-limit-helpers'

// Server component for admin dashboard
export default async function RateLimitsPage() {
  // Get current stats
  const stats = await getRateLimitStats()
  const topUsers = await getTopRateLimitUsers(10)
  
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Rate Limit Monitoring</h1>
        
        {/* Rate Limit Configuration */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Current Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(RATE_LIMITS).map(([type, config]) => (
              <div key={type} className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                <h3 className="text-sm font-medium text-gray-400 mb-1">{type}</h3>
                <p className="text-2xl font-bold text-white">{config.maxRequests}</p>
                <p className="text-xs text-gray-500">
                  per {config.windowMs / 1000}s
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Overall Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Total Requests</h3>
              <p className="text-2xl font-bold text-white">{stats.totalRequests.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Blocked Requests</h3>
              <p className="text-2xl font-bold text-red-400">{stats.blockedRequests.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Unique Users</h3>
              <p className="text-2xl font-bold text-white">{stats.uniqueUsers.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Block Rate</h3>
              <p className="text-2xl font-bold text-yellow-400">
                {stats.totalRequests > 0 
                  ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(1)
                  : '0'
                }%
              </p>
            </div>
          </div>
        </div>
        
        {/* High Usage Users */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h2 className="text-xl font-semibold text-white mb-4">High Usage Users</h2>
          
          {topUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-zinc-800">
                    <th className="pb-3 pr-4">Identifier</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Requests</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user, index) => (
                    <tr key={`${user.identifier}-${user.type}`} className="border-t border-zinc-800">
                      <td className="py-3 pr-4">
                        <code className="text-sm text-gray-300">{user.identifier}</code>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-300">
                          {user.email || '-'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm px-2 py-1 bg-zinc-800 rounded">
                          {user.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-medium">
                          {user.count}
                        </span>
                      </td>
                      <td className="py-3">
                        <ResetButton 
                          identifier={user.identifier} 
                          type={user.type}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No rate limit data available yet. Users will appear here as they use the API.
            </p>
          )}
        </div>
        
        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">Rate Limiting Info</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Rate limits are applied per user (authenticated) or per IP (anonymous)</li>
            <li>• Different tiers have different limits (Gold: 2x, Silver: 1.5x, Bronze: 1x)</li>
            <li>• Limits reset after the specified time window</li>
            <li>• Consistent limit hitting may indicate automated scraping</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Client component for reset button
function ResetButton({ identifier, type }: { identifier: string; type: string }) {
  return (
    <button
      className="text-sm text-blue-400 hover:text-blue-300 font-medium"
      onClick={async () => {
        // In a real app, this would call an API endpoint
        console.log(`Reset ${type} limit for ${identifier}`)
        alert(`Reset functionality would be implemented here`)
      }}
    >
      Reset
    </button>
  )
}
