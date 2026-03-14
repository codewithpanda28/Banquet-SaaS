import { supabase, RESTAURANT_ID } from '@/lib/supabase'

export async function getActiveOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, customers(*), order_items(*, menu_items(*)), restaurant_tables(*)')
            .eq('restaurant_id', RESTAURANT_ID)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching active orders:', error)
        return []
    }
}

export async function updateOrderStatus(orderId: string, status: string) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId)

        if (error) throw error

        // Trigger Webhook if status is 'served' or 'cancelled'
        if (status === 'served' || status === 'cancelled') {
            const { data: order } = await supabase
                .from('orders')
                .select('*, customers(*), restaurant_tables(id, table_number), order_items(*)')
                .eq('id', orderId)
                .single()

            if (order) {
                // ✅ release table status
                if (order.table_id) {
                    await supabase
                        .from('restaurant_tables')
                        .update({ status: 'available' })
                        .eq('id', order.table_id)
                }

                const { triggerPaymentWebhook } = await import('@/lib/webhook')
                await triggerPaymentWebhook({
                    bill_id: order.bill_id,
                    amount: order.total,
                    customer: {
                        name: order.customers?.name || 'Walk-in',
                        phone: order.customers?.phone || 'N/A',
                        address: order.delivery_address || order.customers?.address
                    },
                    order_type: order.order_type,
                    table_number: order.restaurant_tables?.table_number,
                    items: order.order_items?.map((i: any) => ({
                        name: i.item_name,
                        quantity: i.quantity,
                        price: i.price || (i.total / i.quantity),
                        total: i.total
                    })),
                    payment_method: order.payment_method || 'pending',
                    payment_status: order.payment_status,
                    restaurant_id: RESTAURANT_ID,
                    updated_at: new Date().toISOString(),
                    source: status === 'cancelled' ? 'kitchen_cancelled' : 'kitchen_served',
                    trigger_type: status === 'cancelled' ? 'order_cancelled' : 'order_served'
                })
            }
        }

        return true
    } catch (error) {
        console.error('Error updating order status:', error)
        return false
    }
}

export async function updateOrderItemStatus(itemId: string, status: string) {
    try {
        const { error } = await supabase
            .from('order_items')
            .update({ status })
            .eq('id', itemId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error updating order item status:', error)
        return false
    }
}
