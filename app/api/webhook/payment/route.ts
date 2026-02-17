
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const payload = await req.json()
        const WEBHOOK_URL = process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL || 'https://n8n.srv1114630.hstgr.cloud/webhook/payment-confirmation'
        console.log('🔄 [API] Proxying Webhook:', payload.bill_id)

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ [API] Webhook Target Error:', response.status, errorText)
            return NextResponse.json({ error: 'Target webhook failed' }, { status: response.status })
        }

        console.log('✅ [API] Webhook Delivered')
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('❌ [API] Webhook Proxy Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
