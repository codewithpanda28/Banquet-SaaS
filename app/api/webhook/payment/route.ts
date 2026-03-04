
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const payload = await req.json()
        const TARGET_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant'

        console.log('🔄 [PAYMENT] Routing to Unified Webhook:', payload.bill_id)

        const response = await fetch(TARGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'payment-confirmation',
                ...payload
            })
        })

        return NextResponse.json({ success: response.ok })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
