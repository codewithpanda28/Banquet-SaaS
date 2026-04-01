import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const WHATSAPP_ACTIONS = ['bill_closed', 'payment_success', 'order_status_update', 'submit_rating'];

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.log('📬 [WEBHOOK] Raw Payload Received:', JSON.stringify(rawBody, null, 2));

    const body = rawBody.data || rawBody.body || rawBody || {};
    const restaurant_id = body.restaurant_id || body.restaurantId || body.id || 'dfe4401a-48b8-475b-8fe8-7c5034323be5';

    // 🥗 FETCH RESTAURANT CONFIG (Use maybeSingle to avoid 406/500 errors)
    const { data: config, error: dbError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (dbError) {
      console.warn('⚠️ [WEBHOOK] Database lookup error:', dbError.message);
    }

    // 📱 Normalization of Phone Number
    const rawPhone = body.customer_phone || body.phone || (body.customer && body.customer.phone);
    if (rawPhone) {
        let cleanPhone = String(rawPhone).replace(/\D/g, '');
        if (cleanPhone.length === 10) {
            cleanPhone = '+91' + cleanPhone;
        }
        // Normalize in body
        if (body.phone) body.phone = cleanPhone;
        if (body.customer && body.customer.phone) body.customer.phone = cleanPhone;
    }

    // Determine Base URL dynamically
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'admin.thegoldbiryani.com';
    const baseUrl = `${protocol}://${host}`;
    
    // 🔗 DYNAMIC FEEDBACK LINK
    const billIdVal = body.billId || body.bill_id || body.orderId || '';
    const custName = body.customerName || body.customer_name || body.name || 'Guest';
    const custPhone = body.customer_phone || body.phone || '';
    const itemsStr = body.itemsOrdered || body.items || '';

    const feedbackUrl = `${baseUrl}/customer/review?id=${restaurant_id}&billId=${billIdVal}&name=${encodeURIComponent(custName)}&phone=${encodeURIComponent(custPhone)}&items=${encodeURIComponent(itemsStr)}`;

    const finalData = {
      ...body,
      action: body.action || body.path || 'unknown',
      restaurant_id,
      restaurant_name: config?.name || body.restaurant_name || 'Restaurant',
      feedback_url: feedbackUrl,
      billId: billIdVal,
      customerName: custName,
      customer_phone: custPhone,
      itemsOrdered: itemsStr,
      api_url: config?.whatsapp_api_url || 'https://thinkaiq.in/api',
      api_id: config?.whatsapp_api_id || 'bd54faee-23fd-4dfb-8f1c-fda0e6c8af53',
      api_token: config?.whatsapp_token || '',
      google_review_url: config?.google_review_url || 'https://g.page/review',
      timestamp: new Date().toISOString()
    }

    if (!WHATSAPP_ACTIONS.includes(finalData.action)) {
      console.log(`ℹ️ [WEBHOOK] Action '${finalData.action}' not in trigger list. Skipping n8n.`);
      return NextResponse.json({ success: true, logged: true });
    }

    const webhook_url = config?.webhook_url || 'https://n8n.thinkaiq.in/webhook/feedback-bridge';
    console.log(`🚀 [WEBHOOK] Forwarding to: ${webhook_url}`);

    try {
        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`n8n responded with ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return NextResponse.json({ success: true, result });
    } catch (fetchError: any) {
        console.error('❌ [WEBHOOK] n8n Fetch Error:', fetchError.message);
        // We log but don't strictly 500 here if it's just an n8n connection issue?
        // Actually, let's return a specific error
        return NextResponse.json({ success: false, error: 'Automation service unreachable', detail: fetchError.message }, { status: 502 });
    }

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Fatal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
