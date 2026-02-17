export async function triggerPaymentWebhook(payload: any) {
    try {
        console.log('🚀 Triggering Webhook (Proxy):', payload)
        // Use internal API proxy to avoid CORS
        await fetch('/api/webhook/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        console.log('✅ Webhook triggered successfully via Proxy')
    } catch (e) {
        console.error('❌ Webhook failed:', e)
        // Don't block UI if webhook fails
    }
}
