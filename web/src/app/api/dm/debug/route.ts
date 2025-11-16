// Path: src/app/api/dm/debug/route.ts
// Fixed version without the syntax error
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth.config'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  
  // Test 1: Basic connection
  const { data: testConnection, error: connError } = await supabase
    .from('dm_conversations')
    .select('count')
    .single()
  
  // Test 2: Get raw count
  const { count, error: countError } = await supabase
    .from('dm_conversations')
    .select('*', { count: 'exact', head: true })
  
  // Test 3: Get all conversations without any conditions
  const { data: allConversations, error: allError } = await supabase
    .from('dm_conversations')
    .select('*')
  
  // Test 4: Get table info
  const { data: tableInfo, error: tableError } = await supabase
    .from('dm_conversations')
    .select('*')
    .limit(1)
  
  return NextResponse.json({
    session: {
      userId: session?.user?.id,
      isCreator: session?.user?.isCreator,
      email: session?.user?.email
    },
    tests: {
      connectionTest: {
        success: !connError,
        error: connError?.message,
        data: testConnection
      },
      countTest: {
        count: count,
        error: countError?.message
      },
      allConversations: {
        count: allConversations?.length || 0,
        data: allConversations,
        error: allError?.message
      },
      tableStructure: {
        hasData: !!tableInfo,
        firstRow: tableInfo?.[0],
        error: tableError?.message
      }
    },
    debug: {
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      nodeEnv: process.env.NODE_ENV
    }
  })
}