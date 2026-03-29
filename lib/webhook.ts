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
    | 'swiggy-order'
    | 'upsell'
    | 'report-realtime'
    | 'report-daily'
    | 'submit_rating'
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

// Backward compatibility - used for payment collection confirmation
export async function triggerPaymentWebhook(payload: any) {
    return triggerAutomationWebhook('submit_rating', payload);
}

// 🎁 VIP Reward Logic
export async function handleWhatsAppCoupon(customer: string, phone: string, code: string, rewardText: string, restaurantId: string) {
    return triggerAutomationWebhook('new-reward' as any, {
        customer,
        phone,
        coupon_code: code,
        reward_text: rewardText,
        restaurant_id: restaurantId,
        type: 'vip-reward',
        message: `👑 VIP Reward: Congratulations ${customer}! As a top patron of Gold Biryani, you have unlocked an exclusive reward: *${rewardText}*. Use code: *${code}* on your next visit! 🎁🎉`
    });
}
