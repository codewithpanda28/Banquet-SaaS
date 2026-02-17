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
        // Initial data fetch
        const fetchOrders = async () => {
            const orders = await getActiveOrders()
            setOrders(orders)
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
                    console.log('New order received:', payload)
                    if (payload.new.restaurant_id !== RESTAURANT_ID) return

                    // Fetch the complete order with items
                    const orders = await getActiveOrders()
                    const newOrder = orders.find(o => o.id === payload.new.id)

                    if (newOrder) {
                        addOrder(newOrder)
                        playNotificationSound()
                        toast.success('🔔 New Order!', {
                            description: `${newOrder.bill_id} - Table ${newOrder.table_number || 'N/A'}`,
                            duration: 8000,
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
                    console.log('Order updated:', payload)
                    if (payload.new.restaurant_id !== RESTAURANT_ID) return

                    // Fetch updated order with items
                    const orders = await getActiveOrders()
                    const updatedOrder = orders.find(o => o.id === payload.new.id)

                    if (updatedOrder) {
                        updateOrder(payload.new.id, updatedOrder)
                    } else {
                        // Order moved to completed/cancelled, remove from active list
                        fetchOrders()
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
                async () => {
                    // Refresh orders when items are changed/added
                    fetchOrders()
                }
            )
            .subscribe((status) => {
                console.log('Realtime status:', status)
                setConnectionStatus(status === 'SUBSCRIBED')
            })

        // Polling as backup (every 30 seconds)
        const interval = setInterval(fetchOrders, 30000)

        return () => {
            channel.unsubscribe()
            clearInterval(interval)
        }
    }, [RESTAURANT_ID, isSoundEnabled])
}
