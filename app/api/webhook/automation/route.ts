
import { NextResponse } from 'next/server'

const WEBHOOK_BASE = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.srv1114630.hstgr.cloud/webhook/restaurant'

// ✅ Sirf yeh actions n8n ko bhejenge — WhatsApp message inhi se aayega
// ❌ qr-scan NAHI hai yahan — WhatsApp welcome message n8n ke apne
//    WhatsApp Business trigger se aata hai (customer "I am at Table 1" bhejta hai)
//    Hamare code se qr-scan pe koi WhatsApp message NAHI jaana chahiye
const WHATSAPP_ACTIONS = [
    'new-order',       // Customer ne order place kiya
    'waiter-order',    // Waiter ne order place kiya
    'order-served',    // Order serve ho gaya
    'booking-create',  // Table booking confirm hui
    'whatsapp-chat',    // Manual messages & flash sales
    'report-daily',    // Sales reports
]

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const action = body.path || 'unknown-action'
        const payload = body.payload || body

        const finalData = {
            action: action,
            ...payload,
            restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID || payload.restaurant_id || 'unknown',
            timestamp: new Date().toISOString()
        }

        console.log(`🚀 [WEBHOOK] Action: ${action}`)

        // ── Sirf important actions n8n ko bhejo ──
        if (!WHATSAPP_ACTIONS.includes(action)) {
            console.log(`ℹ️ [WEBHOOK] "${action}" — sirf log, n8n call NAHI (no WhatsApp needed)`)
            return NextResponse.json({ success: true, logged: true })
        }

        console.log(`📦 [WEBHOOK] Sending to n8n:`, JSON.stringify(finalData, null, 2))

        const response = await fetch(WEBHOOK_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ [WEBHOOK] n8n error ${response.status}:`, errorText)
            return NextResponse.json(
                { success: false, status: response.status, error: response.statusText },
                { status: response.status }
            )
        }

        console.log(`✅ [WEBHOOK] n8n ko bheja! Action: ${action}`)
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('❌ [WEBHOOK] Crash:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
