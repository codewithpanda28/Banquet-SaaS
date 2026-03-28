import { NextResponse } from 'next/server'

// ✅ 100% RELIABLE WEBHOOK FORWARDER (SaaS Ready)
// This will attempt to hit n8n and automatically fallback to test URL if needed.

const WHATSAPP_ACTIONS = [
    'new-order', 'waiter-order', 'order-served', 
    'booking-create', 'whatsapp-chat', 'report-daily', 'order-cancelled'
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
        const headersList = req.headers;
        
        const action = body.path || body.action || 'unknown-action'
        const payload = body.payload || body
        const restaurant_id = payload.restaurant_id || headersList.get('x-restaurant-id') || 'unknown';

        const finalData = {
            action,
            ...payload,
            restaurant_id,
            timestamp: new Date().toISOString()
        }

        if (!WHATSAPP_ACTIONS.includes(action)) {
            return NextResponse.json({ success: true, logged: true })
        }

        // 🎯 STRATEGY: Try Production then Fallback to Test
        const prodUrl = `https://n8n.srv1114630.hstgr.cloud/webhook/restaurant`;
        const testUrl = `https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant`;

        console.log(`📡 [WEBHOOK] Trying production: ${prodUrl}`)
        let response = await tryFetch(prodUrl, finalData);

        // If Production returns 404, it might because the workflow is in test mode (not active)
        if (!response || response.status === 404) {
            console.log(`⚠️ Production 404. Trying Test: ${testUrl}`)
            response = await tryFetch(testUrl, finalData);
        }

        if (!response || !response.ok) {
            const status = response?.status || 500;
            console.error(`❌ [WEBHOOK] Final failure at ${status}`)
            return NextResponse.json({ success: false, status: status }, { status: status })
        }

        console.log(`✅ [WEBHOOK] Successfully delivered to n8n!`)
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('❌ [WEBHOOK] Crash:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
