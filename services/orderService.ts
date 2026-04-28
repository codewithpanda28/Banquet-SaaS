import { supabase, getRestaurantId } from '@/lib/supabase'

export async function getActiveOrders() {
    // ✅ Always call as function — never use static RESTAURANT_ID which can be stale
    const rid = getRestaurantId() || process.env.NEXT_PUBLIC_RESTAURANT_ID;
    
    try {
        if (!rid) {
            console.error('🛑 [getActiveOrders] Missing RESTAURANT_ID!');
            return [];
        }

        console.log('🔄 [getActiveOrders] Fetching for RID:', rid);
        
        // Try the query with explicit relationship names
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                customers!customer_id(id, name, phone),
                order_items(*, menu_items!menu_item_id(id, name, is_veg, image_url)),
                restaurant_tables!table_id(id, table_number)
            `)
            .eq('restaurant_id', rid)
            .in('status', ['pending_confirmation', 'pending', 'confirmed', 'preparing', 'ready', 'served'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ [getActiveOrders] Query Error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            
            // Fallback: Try a simpler query if the join fails
            console.log('⚠️ [getActiveOrders] Attempting fallback query...');
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('restaurant_id', rid)
                .in('status', ['pending_confirmation', 'pending', 'confirmed', 'preparing', 'ready', 'served'])
                .order('created_at', { ascending: false });
                
            if (fallbackError) {
                console.error('❌ [getActiveOrders] Fallback also failed:', fallbackError.message);
                return [];
            }
            return fallbackData || [];
        }
        
        console.log(`✅ [getActiveOrders] Success! Found ${data?.length || 0} orders.`);
        return data || []
    } catch (err: any) {
        console.error('🛑 [getActiveOrders] Critical Exception:', err);
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

        if (status === 'cancelled') {
            const { data: order } = await supabase
                .from('orders')
                .select('table_id')
                .eq('id', orderId)
                .single()

            if (order?.table_id) {
                await supabase
                    .from('restaurant_tables')
                    .update({ status: 'available' })
                    .eq('id', order.table_id)
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
