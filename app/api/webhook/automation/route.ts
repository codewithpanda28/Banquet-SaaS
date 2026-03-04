
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Single URL for EVERYTHING
        const TARGET_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant'

        // Identify the action (path comes from our internal triggerAutomationWebhook)
        const action = body.path || 'unknown-action'
        const payload = body.payload || body

        const finalData = {
            action: action,
            ...payload,
            restaurant_id: process.env.NEXT_PUBLIC_RESTAURANT_ID
        }

        console.log(`🚀 [WEBHOOK] Sending to: ${TARGET_URL}`)
        console.log(`📦 [WEBHOOK] Action: ${action}`, JSON.stringify(finalData, null, 2))

        const response = await fetch(TARGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
        })

        if (!response.ok) {
            console.error(`❌ [WEBHOOK] n8n responded with error: ${response.status} ${response.statusText}`)
            const errorText = await response.text()
            console.error(`📦 [WEBHOOK] Error body:`, errorText)
            return NextResponse.json({ success: false, status: response.status, error: response.statusText }, { status: response.status })
        }

        console.log(`✅ [WEBHOOK] Successfully sent to n8n! Status: ${response.status}`)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
