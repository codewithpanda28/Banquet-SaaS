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

        const audioContext = new AudioContext()

        // Create a more pleasant notification sound
        const playTone = (frequency: number, duration: number, delay: number) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator()
                const gainNode = audioContext.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(audioContext.destination)

                oscillator.frequency.value = frequency
                oscillator.type = 'sine'

                gainNode.gain.setValueAtTime(0.15, audioContext.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

                oscillator.start(audioContext.currentTime)
                oscillator.stop(audioContext.currentTime + duration)
            }, delay)
        }

        // Pleasant two-tone notification
        playTone(800, 0.15, 0)
        playTone(1000, 0.2, 150)
    }

    useEffect(() => {
        let fetchTimer: NodeJS.Timeout | null = null;

        // Debounced fetch function to prevent rapid multiple fetches
        const fetchOrders = async () => {
            if (fetchTimer) clearTimeout(fetchTimer);
            fetchTimer = setTimeout(async () => {
                const orders = await getActiveOrders()
                setOrders(orders)
            }, 500); // 500ms debounce
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

                    // Fetch full order to show in toast
                    const fullOrders = await getActiveOrders()
                    const newOrder = fullOrders.find(o => o.id === payload.new.id)

                    if (newOrder) {
                        addOrder(newOrder)
                        playNotificationSound()
                        toast.success('🔔 New Order!', {
                            description: `${newOrder.bill_id} - Table ${newOrder.table_number || 'N/A'}`,
                            duration: 5000,
                        })
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
                    if (payload.new.restaurant_id !== RESTAURANT_ID) return

                    // Check if items were added (total increased or updated_at changed significantly)
                    // We also check if it's not just a status change to 'served/completed'
                    const isExtraItems =
                        (payload.new.total > (payload.old?.total || 0)) ||
                        (payload.new.status === payload.old?.status && payload.new.total === payload.old?.total); // Message might have changed or items updated

                    // Refresh data
                    fetchOrders()

                    // If it's an update to an existing order that's not just a status change
                    if (payload.new.status !== 'served' && payload.new.status !== 'completed' && payload.new.status !== 'cancelled') {
                        // Play sound and toast only if total changed or specifically marked as updated
                        if (payload.new.total > (payload.old?.total || 0)) {
                            // Find the existing order in store to get table number
                            const existingOrder = useKitchenStore.getState().orders.find(o => o.id === payload.new.id)

                            playNotificationSound()
                            toast.info('➕ Order Updated: New Items!', {
                                description: `${existingOrder?.restaurant_tables?.table_number ? `Table ${existingOrder.restaurant_tables.table_number}` : 'Delivery/Takeaway'} (Bill: ${payload.new.bill_id})`,
                                duration: 8000,
                            })
                        }
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
                    // Check if this item belongs to an existing order being tracked
                    const currentOrders = useKitchenStore.getState().orders
                    const targetOrder = currentOrders.find(o => o.id === payload.new.order_id)

                    if (targetOrder) {
                        // This is a new item added to an EXISTING order
                        // If the order is already in "preparing" or "ready", notify specifically
                        playNotificationSound()
                        toast.error('🔥 EXTRA ITEM ADDED!', {
                            description: `${payload.new.item_name} added to ${targetOrder.restaurant_tables?.table_number ? `Table ${targetOrder.restaurant_tables.table_number}` : 'Order'}`,
                            duration: 10000,
                            style: { background: '#ef4444', color: '#fff', border: 'none' }
                        })
                    }

                    fetchOrders()
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

        // Polling backup (30 seconds)
        const interval = setInterval(fetchOrders, 30000)

        return () => {
            if (fetchTimer) clearTimeout(fetchTimer)
            channel.unsubscribe()
            clearInterval(interval)
        }
    }, [RESTAURANT_ID, isSoundEnabled])
}
