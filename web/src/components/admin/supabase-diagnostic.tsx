// src/components/admin/supabase-diagnostic.tsx
"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from 'next-auth/react'

export function SupabaseDiagnostic() {
  const { data: session } = useSession()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function runDiagnostics() {
    setLoading(true)
    const diagnosticResults = []
    
    try {
      // 1. Check authentication status
      console.log('=== SUPABASE DIAGNOSTICS STARTING ===')
      
      const { data: authData, error: authError } = await supabase.auth.getSession()
      diagnosticResults.push({
        test: 'Auth Session',
        success: !authError,
        data: authData,
        error: authError
      })
      console.log('Auth check:', { authData, authError })
      
      // 2. Test SELECT permissions
      console.log('Testing SELECT permissions...')
      const { data: selectData, error: selectError } = await supabase
        .from('content_sets')
        .select('*')
        .limit(1)
      
      diagnosticResults.push({
        test: 'SELECT Permission',
        success: !selectError,
        data: selectData,
        error: selectError
      })
      console.log('SELECT test:', { selectData, selectError })
      
      // 3. Test INSERT permissions
      console.log('Testing INSERT permissions...')
      const testId = `test-${Date.now()}`
      const { data: insertData, error: insertError } = await supabase
        .from('content_sets')
        .insert({
          title: 'Test Set - Delete Me',
          slug: testId,
          r2_folder_key: 'test/test'
        })
        .select()
        .single()
      
      diagnosticResults.push({
        test: 'INSERT Permission',
        success: !insertError,
        data: insertData,
        error: insertError
      })
      console.log('INSERT test:', { insertData, insertError })
      
      // 4. Test UPDATE permissions (if insert succeeded)
      if (insertData) {
        console.log('Testing UPDATE permissions...')
        const { data: updateData, error: updateError } = await supabase
          .from('content_sets')
          .update({ title: 'Test Set - Updated' })
          .eq('id', insertData.id)
          .select()
          .single()
        
        diagnosticResults.push({
          test: 'UPDATE Permission',
          success: !updateError,
          data: updateData,
          error: updateError
        })
        console.log('UPDATE test:', { updateData, updateError })
        
        // 5. Test DELETE permissions
        console.log('Testing DELETE permissions...')
        const { data: deleteData, error: deleteError } = await supabase
          .from('content_sets')
          .delete()
          .eq('id', insertData.id)
          .select()
        
        diagnosticResults.push({
          test: 'DELETE Permission',
          success: !deleteError,
          data: deleteData,
          error: deleteError
        })
        console.log('DELETE test:', { deleteData, deleteError })
      }
      
      // 6. Check RLS policies - properly handle potential RPC error
      console.log('Checking RLS policies...')
      let policiesData = null
      let policiesError = null
      
      try {
        const { data, error } = await supabase
          .rpc('check_rls_policies', {})
          .single()
        
        policiesData = data
        policiesError = error
      } catch (error) {
        policiesError = 'RPC function not found or error occurred'
      }
      
      diagnosticResults.push({
        test: 'RLS Policies Check',
        success: !policiesError,
        data: policiesData,
        error: policiesError
      })
      
      // 7. Check if using anon key vs service key
      const isAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('anon')
      diagnosticResults.push({
        test: 'Client Key Type',
        success: true,
        data: { 
          isAnonKey, 
          keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
        },
        error: null
      })
      
      // 8. Test API route
      console.log('Testing API route...')
      const apiResponse = await fetch('/api/admin/content')
      const apiData = await apiResponse.json()
      
      diagnosticResults.push({
        test: 'API Route',
        success: apiResponse.ok,
        data: apiData,
        error: !apiResponse.ok ? apiData.error : null
      })
      
      console.log('=== DIAGNOSTICS COMPLETE ===')
      console.log('Results:', diagnosticResults)
      
    } catch (error) {
      console.error('Diagnostic error:', error)
      diagnosticResults.push({
        test: 'General Error',
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    setResults(diagnosticResults)
    setLoading(false)
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
      <h3 className="text-xl font-semibold text-white mb-4">Supabase Diagnostics</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">Session Info:</p>
        <pre className="text-xs bg-zinc-800 p-2 rounded overflow-auto">
          {JSON.stringify({ 
            user: session?.user?.email,
            isCreator: session?.user?.isCreator 
          }, null, 2)}
        </pre>
      </div>
      
      <button
        onClick={runDiagnostics}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </button>
      
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${
                result.success 
                  ? 'bg-green-900/20 border-green-600/30' 
                  : 'bg-red-900/20 border-sky-600/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">{result.test}</h4>
                <span className={`text-sm ${result.success ? 'text-green-400' : 'text-sky-400'}`}>
                  {result.success ? '✓ PASS' : '✗ FAIL'}
                </span>
              </div>
              
              {result.error && (
                <div className="mb-2">
                  <p className="text-xs text-gray-400 mb-1">Error:</p>
                  <pre className="text-xs bg-zinc-800 p-2 rounded overflow-auto text-sky-400">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.data && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Data:</p>
                  <pre className="text-xs bg-zinc-800 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">Common Issues:</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• <strong>RLS Policies:</strong> If SELECT works but INSERT/UPDATE/DELETE fail, check RLS policies</li>
          <li>• <strong>Authentication:</strong> Client-side operations require proper auth context</li>
          <li>• <strong>Service Key:</strong> Admin operations should use service role key (server-side only)</li>
          <li>• <strong>API Routes:</strong> Consider using API routes for write operations</li>
        </ul>
      </div>
    </div>
  )
}