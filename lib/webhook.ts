
export type WebhookType =
    | 'qr-scan'
    | 'new-order'
    | 'order-served'
    | 'waiter-login'
    | 'waiter-order'
    | 'waiter-tables'
    | 'waiter-menu'
    | 'review-submit'
    | 'booking-check'
    | 'booking-create'
    | 'inventory-upload'
    | 'inventory-add'
    | 'add-stock'
    | 'inventory-low'
    | 'inventory-all'
    | 'zomato-order'
    | 'swiggy-order'
    | 'upsell'
    | 'report-realtime'
    | 'report-daily'
    | 'whatsapp-chat';

export async function triggerAutomationWebhook(type: WebhookType, payload: any) {
    try {
        console.log(`🚀 [Automation] Triggering ${type}`, payload);

        // 🎯 SHALLOW API PATH (Ensures better routing in multi-tenant subdomains)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const endpoint = `${baseUrl}/api/webhook`;
        
        console.log(`📡 [Automation] Internal fetch: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: type, ...payload })
        });

        if (!response.ok) {
            console.error(`❌ [Automation] ${type} failed at Internal Proxy. Status: ${response.status}`);
            return { success: false, status: response.status };
        }

        console.log(`✅ [Automation] ${type} sent successfully!`);
        return await response.json();
    } catch (e) {
        console.error(`❌ [Automation] CRITICAL FAILURE: ${type} could not be sent to Internal Proxy:`, e);
        // We only show toast if we are on the client side
        if (typeof window !== 'undefined') {
            const { toast } = require('sonner');
            toast.error(`Automation Error: ${type} webhook failed.`);
        }
        return { success: false, error: e };
    }
}

// Backward compatibility
export async function triggerPaymentWebhook(payload: any) {
    return triggerAutomationWebhook('new-order', payload);
}
