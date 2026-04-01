import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 🚀 Transparent Bridge: Allow ALL actions to flow to n8n
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.log('📬 [WEBHOOK] Incoming Payload:', JSON.stringify(rawBody, null, 2));

    const body = rawBody.data || rawBody.body || rawBody || {};
    
    // Normalize IDs and Actions
    const restaurant_id = body.restaurant_id || body.restaurantId || body.id || 'dfe4401a-48b8-475b-8fe8-7c5034323be5';
    const actionName = body.action || body.type || 'unknown';

    // 🥗 Fetch Restaurant Config
    const { data: config } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurant_id)
      .maybeSingle();

    // 📱 Phone Normalization
    let cleanPhone = body.phone || body.customer_phone || (body.customer && body.customer.phone) || '';
    if (cleanPhone) {
        cleanPhone = String(cleanPhone).replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '+91' + cleanPhone;
    }

    // 🌐 Dynamic Origin Detection
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'admin.thegoldbiryani.com';
    const baseUrl = `${protocol}://${host}`;
    
    // 🔗 Construction of the universal Feedback/Review URL
    const billIdVal = body.billId || body.bill_id || body.orderId || '';
    const custName = body.customerName || body.customer_name || body.name || 'Guest';
    const itemsStr = body.itemsOrdered || body.items || '';

    const feedbackUrl = `${baseUrl}/customer/review?id=${restaurant_id}&billId=${billIdVal}&name=${encodeURIComponent(custName)}&phone=${encodeURIComponent(cleanPhone)}&items=${encodeURIComponent(itemsStr)}`;

    // Prepare Universal Payload for n8n
    const finalData = {
      ...body,
      action: actionName,
      restaurant_id,
      restaurant_name: config?.name || body.restaurant_name || 'Restaurant',
      feedback_url: feedbackUrl,
      customer_phone: cleanPhone,
      api_url: config?.whatsapp_api_url || 'https://thinkaiq.in/api',
      api_id: config?.whatsapp_api_id || 'bd54faee-23fd-4dfb-8f1c-fda0e6c8af53',
      api_token: config?.whatsapp_token || '',
      google_review_url: config?.google_review_url || 'https://g.page/review',
      timestamp: new Date().toISOString()
    };

    // Determine target URL: Database value preferred, fallback to known working n8n
    const webhook_url = config?.webhook_url || 'https://n8n.thinkaiq.in/webhook/46b5d7e4-98bf-485f-83d1-f5ec0f40f0a2';
    console.log(`🚀 [WEBHOOK] Forwarding ${actionName} -> ${webhook_url}`);

    try {
        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`n8n (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ [WEBHOOK] Success for ${actionName}`);
        return NextResponse.json({ success: true, result });
    } catch (fetchError: any) {
        console.error(`❌ [WEBHOOK] Forwarding Failed: ${fetchError.message}`);
        // Log but don't strictly crash the requester
        return NextResponse.json({ success: false, error: 'Target unreachable', detail: fetchError.message }, { status: 502 });
    }

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Fatal Exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
