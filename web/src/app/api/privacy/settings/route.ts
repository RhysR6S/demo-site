// src/app/api/privacy/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET privacy consent settings
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    
    // Check for existing consent record
    const { data: consent, error } = await supabase
      .from('user_privacy_consent')
      .select('*')
      .eq('user_id', token.sub)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Privacy settings error:', error)
      return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
    }

    // Return current settings or defaults
    return NextResponse.json({
      trackingConsent: consent?.tracking_consent ?? false,
      communicationConsent: consent?.communication_consent ?? false,
      consentDate: consent?.updated_at
    })
  } catch (error) {
    console.error('Privacy settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST update privacy consent
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trackingConsent, communicationConsent } = body

    const supabase = getSupabaseAdmin()
    
    // Upsert consent record
    const { error } = await supabase
      .from('user_privacy_consent')
      .upsert({
        user_id: token.sub,
        tracking_consent: trackingConsent ?? false,
        communication_consent: communicationConsent ?? false,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Consent update error:', error)
      return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 })
    }

    // Log consent change for compliance
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: token.sub,
        action: 'consent_update',
        details: {
          tracking_consent: trackingConsent,
          communication_consent: communicationConsent
        },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Consent update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}