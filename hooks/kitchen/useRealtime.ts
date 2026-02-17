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

        // Setup realtime subscription with aggressive settings
        const channel = supabase
            .channel('kitchen-orders-realtime', {
                config: {
                    broadcast: { self: true },
                    presence: { key: 'kitchen' }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                async (payload: any) => {
                    console.log('🔥 [REALTIME] New order received:', payload)
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
                    console.log('🔄 [REALTIME] Order updated:', payload)
                    if (payload.new.restaurant_id !== RESTAURANT_ID) return

                    // Check if items were added (total increased or updated_at changed significantly)
                    const oldTotal = payload.old?.total || 0
                    const newTotal = payload.new?.total || 0
                    const itemsAdded = newTotal > oldTotal

                    console.log(`💰 [TOTAL CHECK] Old: ₹${oldTotal}, New: ₹${newTotal}, Items Added: ${itemsAdded}`)

                    // Fetch updated order with items
                    const orders = await getActiveOrders()
                    const updatedOrder = orders.find(o => o.id === payload.new.id)

                    if (updatedOrder) {
                        updateOrder(payload.new.id, updatedOrder)

                        // Notify kitchen staff when items are added to existing order
                        if (itemsAdded) {
                            console.log('🔔 [NOTIFICATION] Triggering notification for new items!')
                            playNotificationSound()
                            toast.info('➕ Items Added!', {
                                description: `New items added to ${updatedOrder.bill_id}`,
                                duration: 6000,
                            })
                        }
                    } else {
                        // Order moved to completed/cancelled, remove from active list
                        fetchOrders()
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
                    console.log('📦 [REALTIME] New order item added:', payload)

                    // Find the order this item belongs to
                    const orderId = payload.new?.order_id
                    if (!orderId) return

                    // Refresh orders to get updated data
                    const orders = await getActiveOrders()
                    const order = orders.find(o => o.id === orderId)

                    if (order) {
                        // Check if this is adding to an existing order (not a brand new order)
                        // If order already has multiple items or was created more than 30 seconds ago, it's adding to existing
                        const orderCreatedStr = order.created_at
                        const orderCreated = new Date(orderCreatedStr.includes('Z') || orderCreatedStr.includes('+') ? orderCreatedStr : orderCreatedStr + 'Z')
                        const now = new Date()
                        const secondsSinceCreated = (now.getTime() - orderCreated.getTime()) / 1000

                        console.log(`⏰ [TIME CHECK] Order age: ${secondsSinceCreated.toFixed(0)}s, Threshold: 5s`)

                        if (secondsSinceCreated > 5) {
                            // This is adding items to an existing order
                            console.log('🔔 [NOTIFICATION] Triggering notification for new items!')
                            playNotificationSound()
                            toast.info('➕ Items Added!', {
                                description: `New items added to ${order.bill_id}`,
                                duration: 6000,
                            })
                        } else {
                            console.log(`⏭️ [SKIP] Order too new (${secondsSinceCreated.toFixed(0)}s), skipping notification`)
                        }

                        // Update the order in store
                        updateOrder(orderId, order)
                    }

                    // Also refresh all orders
                    fetchOrders()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'order_items',
                },
                async () => {
                    console.log('📦 [REALTIME] Order item updated')
                    // Just refresh, no notification for updates
                    fetchOrders()
                }
            )
            .subscribe((status, err) => {
                console.log('📡 [REALTIME] Kitchen subscription status:', status)
                if (err) console.error('❌ [REALTIME] Subscription error:', err)
                setConnectionStatus(status === 'SUBSCRIBED')

                if (status === 'SUBSCRIBED') {
                    console.log('✅ [REALTIME] Kitchen dashboard is now LIVE!')
                }
            })

        // Aggressive polling as backup (every 5 seconds for instant updates)
        const interval = setInterval(() => {
            console.log('🔄 [POLLING] Refreshing kitchen orders...')
            fetchOrders()
        }, 5000)

        return () => {
            console.log('🔌 [CLEANUP] Unsubscribing from kitchen realtime')
            channel.unsubscribe()
            clearInterval(interval)
        }
    }, [RESTAURANT_ID, isSoundEnabled])
}
