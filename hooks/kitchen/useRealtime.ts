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

                    const oldTotal = payload.old?.total || 0
                    const newTotal = payload.new?.total || 0
                    const itemsAdded = newTotal > oldTotal && oldTotal > 0 // Only if previously had total

                    // Update local state
                    fetchOrders()

                    if (itemsAdded) {
                        playNotificationSound()
                        toast.info('➕ New Items Added!', {
                            description: `Check details for ${payload.new.bill_id}`,
                            duration: 5000,
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items',
                },
                () => {
                    // Just refresh data when items change, no sounds here to avoid duplication
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
