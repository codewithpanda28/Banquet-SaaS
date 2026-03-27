"use client"

import { useEffect } from "react"
import { useKitchenStore } from "@/store/kitchenStore"
import { getActiveOrders } from "@/services/orderService"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export function useRealtime() {
    const { setOrders, addOrder, updateOrder, setConnectionStatus, isSoundEnabled } = useKitchenStore()
    const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID!

    // Play premium notification sound
    const playNotificationSound = () => {
        if (!isSoundEnabled) return
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
            audio.volume = 0.5
            audio.play().catch(e => console.log('🔊 Audio blocked by browser policy'))
        } catch (err) {
            console.log('🔊 Audio fail:', err)
        }
    }

    useEffect(() => {
        let fetchTimer: NodeJS.Timeout | null = null;

        // Debounced fetch function to prevent rapid multiple fetches
        const fetchOrders = async () => {
            if (fetchTimer) clearTimeout(fetchTimer);
            fetchTimer = setTimeout(async () => {
                const orders = await getActiveOrders()
                setOrders(orders)
            }, 50); // 50ms fast debounce
        }

        fetchOrders()

        // Setup realtime subscription
        const channel = supabase
            .channel('kitchen-orders-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                async (payload: any) => {
                    if (payload.new.restaurant_id !== RESTAURANT_ID) return

                    // Fetch full order for Toast info
                    const fullOrders = await getActiveOrders();
                    const targetOrder = fullOrders.find(o => o.id === payload.new.id);
                    
                    // ONLY show toast for these statuses (BRAND NEW logic)
                    const APPROVED_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
                    const isStrictlyApproved = APPROVED_STATUSES.includes(payload.new.status);
                    
                    if (isStrictlyApproved && targetOrder) {
                        addOrder(targetOrder);
                        playNotificationSound();
                        toast.success('🔔 New Order!', {
                            description: `${targetOrder.bill_id} - Table ${targetOrder.restaurant_tables?.table_number || 'N/A'}`,
                            duration: 5000,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                },
                async (payload: any) => {
                    if (payload.new.restaurant_id !== RESTAURANT_ID) return;

                    const APPROVED_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
                    const isStrictlyApproved = APPROVED_STATUSES.includes(payload.new.status);
                    const wasJustApproved = payload.old?.status === 'pending_confirmation' && payload.new.status === 'pending';

                    // Always sync data for update
                    fetchOrders();

                    // NO NOTIFICATION if unapproved or cancelled
                    if (!isStrictlyApproved) return;

                    const totalIncreased = payload.new.total > (payload.old?.total || 0);

                    if (wasJustApproved || totalIncreased) {
                        // Find matching order in state
                        const existingOrder = useKitchenStore.getState().orders.find(o => o.id === payload.new.id);
                        playNotificationSound();
                        
                        toast.info(wasJustApproved ? '✅ Order Approved!' : '➕ Items Added!', {
                            description: `${existingOrder?.restaurant_tables?.table_number ? `Table ${existingOrder.restaurant_tables.table_number}` : 'Delivery/Takeaway'} (Bill: ${payload.new.bill_id})`,
                            duration: 8000,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_items',
                },
                async (payload: any) => {
                    const currentOrders = useKitchenStore.getState().orders;
                    const targetOrder = currentOrders.find(o => o.id === payload.new.order_id);

                    // WORKABLE whitelisted parent status
                    const WORKABLE = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
                    const isOrderWorkable = targetOrder && WORKABLE.includes(targetOrder.status);

                    if (isOrderWorkable) {
                        playNotificationSound();
                        toast.error('🔥 EXTRA ITEM ADDED!', {
                            description: `${payload.new.item_name} added to Table ${targetOrder.restaurant_tables?.table_number || 'N/A'}`,
                            duration: 12000,
                            style: { background: '#ef4444', color: '#fff', border: 'none' }
                        });
                    }

                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // Also listen for item updates (like instructions)
                    schema: 'public',
                    table: 'order_items',
                },
                () => {
                    fetchOrders()
                }
            )
            .subscribe((status) => {
                setConnectionStatus(status === 'SUBSCRIBED')
            })

        // ULTRA-RESPONSIVE POLLING BACKUP (1.5 seconds)
        const interval = setInterval(() => {
            console.log('🥘 [Kitchen] Heartbeat Sync:', new Date().toLocaleTimeString());
            fetchOrders();
        }, 1500);

        return () => {
            if (fetchTimer) clearTimeout(fetchTimer)
            channel.unsubscribe()
            clearInterval(interval)
        }
    }, [RESTAURANT_ID, isSoundEnabled])
}
