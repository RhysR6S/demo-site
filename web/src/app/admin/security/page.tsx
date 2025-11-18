// src/app/admin/security/page.tsx
import { AntiScrapingSystem } from '@/lib/anti-scraping'
import { getRateLimitStats, checkSuspiciousRateLimitActivity } from '@/lib/rate-limit-helpers'
import { getSupabaseAdmin } from '@/lib/supabase'

export default async function SecurityDashboard() {
  
  // Get rate limit stats
  const rateLimitStats = await getRateLimitStats()
  
  // Get recent suspicious activity from database
  const supabase = getSupabaseAdmin()
  const { data: recentActivity } = await supabase
    .from('user_activity')
    .select('user_id, count')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('count', { ascending: false })
    .limit(10)
  
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Security Monitoring</h1>
        
        {/* High Activity Users */}
        <div className="bg-slate-900 rounded-lg p-6 border border-zinc-800">
          <h2 className="text-xl font-semibold text-white mb-4">High Activity Users (24h)</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-zinc-800">
                  <th className="pb-3 pr-4">User ID</th>
                  <th className="pb-3 pr-4">Activity Count</th>
                  <th className="pb-3 pr-4">Risk Score</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity?.map(async (activity) => {
                  const riskAnalysis = await checkSuspiciousRateLimitActivity(activity.user_id)
                  
                  return (
                    <tr key={activity.user_id} className="border-t border-zinc-800">
                      <td className="py-3 pr-4">
                        <code className="text-sm">{activity.user_id}</code>
                      </td>
                      <td className="py-3 pr-4">{activity.count}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          riskAnalysis.score > 50
                            ? 'bg-red-900/20 text-sky-400'
                            : riskAnalysis.score > 30
                            ? 'bg-yellow-900/20 text-yellow-400'
                            : 'bg-green-900/20 text-green-400'
                        }`}>
                          {riskAnalysis.score}%
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-sm text-blue-400 hover:text-blue-300 mr-3">
                          Investigate
                        </button>
                        <button className="text-sm text-sky-400 hover:text-red-300">
                          Ban
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Security Tips */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">Security Best Practices</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Review high-confidence alerts (70%+) immediately</li>
            <li>• Users with 80%+ confidence are auto-blocked</li>
            <li>• Monitor for patterns: rapid viewing + high downloads = likely scraper</li>
            <li>• Check banned users regularly for false positives</li>
            <li>• Export logs weekly for long-term analysis</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Client component for ban button
function BanUserButton({ identifier }: { identifier: string }) {
  return (
    <button
      onClick={async () => {
        if (confirm(`Ban user ${identifier}? This will block all access for 24 hours.`)) {
          // In production, call an API endpoint
          console.log(`Ban user: ${identifier}`)
          alert('Ban functionality would be implemented here')
        }
      }}
      className="px-3 py-1 bg-sky-600 hover:bg-red-700 text-white rounded text-sm font-medium"
    >
      Ban User
    </button>
  )
}