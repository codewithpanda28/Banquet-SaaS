
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

        // We send EVERYTHING to our internal proxy, which uses the ONE URL from .env
        const response = await fetch('/api/webhook/automation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: type, payload })
        });

        if (!response.ok) {
            console.error(`❌ [Automation] ${type} failed with status ${response.status}`);
            return { success: false, status: response.status };
        }

        return await response.json();
    } catch (e) {
        console.error(`❌ [Automation] ${type} failed:`, e);
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
