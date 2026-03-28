import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🚀 [API/WEBHOOK] RELIABLE MULTI-TENANT FORWARDER (With Identity Enrichment)
// This route is the central hub for ALL n8n automation.
// It automatically fetches tenant settings (WhatsApp + Google Review Link) from Supabase.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WHATSAPP_ACTIONS = [
  'new-order', 'waiter-order', 'order-served', 
  'booking-create', 'whatsapp-chat', 'report-daily', 'order-cancelled', 'submit_rating'
]

async function tryFetch(url: string, data: any) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // 1. Resolve Identity (Headers OR Cookies)
    const cookies = req.headers.get('cookie') || '';
    const tenantCookie = cookies.split('; ').find(row => row.startsWith('tenant_id='));
    const cookieId = tenantCookie ? tenantCookie.split('=')[1] : null;

    const restaurant_id = body.restaurant_id || req.headers.get('x-restaurant-id') || cookieId;

    if (!restaurant_id) {
      console.warn(`⚠️ [WEBHOOK] No tenant identity found for action: ${body.action}`)
      return NextResponse.json({ success: false, error: 'Identity required' }, { status: 400 })
    }

    // 2. 🔍 ENRICH DATA (Fetch real-time config from Database)
    const { data: config } = await supabase
      .from('restaurants')
      .select('name, whatsapp_api_url, whatsapp_api_id, whatsapp_token, google_review_url')
      .eq('id', restaurant_id)
      .maybeSingle();

    const finalData = {
      ...body,
      action: body.action || body.path || 'unknown',
      restaurant_id,
      restaurant_name: config?.name || body.restaurant_name || 'Restaurant',
      // Dynamic Config Injection
      whatsapp_api_url: config?.whatsapp_api_url || 'https://thinkaiq.in/api',
      whatsapp_api_id: config?.whatsapp_api_id || 'bd54faee-23fd-4dfb-8f1c-fda0e6c8af53',
      whatsapp_token: config?.whatsapp_token || '',
      google_review_url: config?.google_review_url || 'https://g.page/review',
      timestamp: new Date().toISOString()
    }

    if (!WHATSAPP_ACTIONS.includes(finalData.action)) {
      return NextResponse.json({ success: true, logged: true })
    }

    // 🎯 STRATEGY: Try Production THEN Test
    const prodUrl = `https://n8n.srv1114630.hstgr.cloud/webhook/restaurant`;
    const testUrl = `https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant`;

    console.log(`📡 [WEBHOOK] Forwarding ${finalData.action} (Review: ${finalData.google_review_url})`)
    let response = await tryFetch(prodUrl, finalData);

    if (!response || response.status === 404) {
      response = await tryFetch(testUrl, finalData);
    }

    return NextResponse.json({ 
        success: response?.ok || false, 
        remote_status: response?.status || 500 
    })

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Crash:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
