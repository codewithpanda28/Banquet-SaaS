import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🚀 [API/WEBHOOK] RELIABLE MULTI-TENANT FORWARDER (With Identity Enrichment)
// Uses Service Role Key (server-side only) to bypass RLS for config reads.
// Falls back to Anon Key if service role key is not yet configured.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // ✅ Service Role Key = server-side only, never NEXT_PUBLIC_, bypasses RLS safely
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    const restaurant_id = body.restaurant_id || body.restaurantId || req.headers.get('x-restaurant-id') || cookieId;

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

    // 🏹 PHONE SANITIZATION: Ensure WhatsApp format (Prepend 91 for India if missing)
    if (body.phone || (body.customer && body.customer.phone)) {
        let rawPhone = body.phone || body.customer.phone;
        let cleanPhone = rawPhone.replace(/\D/g, ''); // Remove everything but digits
        
        // If it's a 10-digit number, assume it's Indian and add +91
        if (cleanPhone.length === 10) {
            cleanPhone = '+91' + cleanPhone;
        }

        if (body.phone) body.phone = cleanPhone;
        if (body.customer && body.customer.phone) body.customer.phone = cleanPhone;
        console.log(`📱 [WEBHOOK] Normalized Phone: ${rawPhone} -> ${cleanPhone}`);
    }

    let whatsapp_api_url = config?.whatsapp_api_url || 'https://thinkaiq.in/api';
    if (whatsapp_api_url.includes('thinkaiq.in') && !whatsapp_api_url.endsWith('/api') && !whatsapp_api_url.endsWith('/api/')) {
      whatsapp_api_url = whatsapp_api_url.replace(/\/$/, '') + '/api';
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.thegoldbiryani.com';
    const baseUrl = origin.replace(/\/$/, '');
    
    // 🔗 DYNAMIC FEEDBACK LINK (For 1-tap SEO Reviews)
    const feedbackUrl = `${baseUrl}/customer/review?id=${restaurant_id}&name=${encodeURIComponent(body.customerName || body.name || '')}&phone=${encodeURIComponent(body.phone || '')}&items=${encodeURIComponent(body.itemsOrdered || body.items || '')}`;

    const finalData = {
      ...body,
      action: body.action || body.path || 'unknown',
      restaurant_id,
      restaurant_name: config?.name || body.restaurant_name || 'Restaurant',
      // Dynamic Config Injection
      feedback_url: feedbackUrl, // 🚀 SEO Booster: Link for n8n to send
      itemsOrdered: body.itemsOrdered || body.items || '',
      api_url: whatsapp_api_url,
      api_id: config?.whatsapp_api_id || 'bd54faee-23fd-4dfb-8f1c-fda0e6c8af53',
      api_token: config?.whatsapp_token || '',
      whatsapp_api_url,
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
