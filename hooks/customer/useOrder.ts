import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Order, OrderItem } from '@/types'

export function useOrder(billId: string) {
    const [order, setOrder] = useState<Order | null>(null)
    const [items, setItems] = useState<OrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!billId) return

        let channel: any
        let pollingInterval: NodeJS.Timeout
        let isInitialLoad = true

        const fetchOrder = async (silent = false) => {
            try {
                // Only show loading on initial load, not on background updates
                if (!silent) setLoading(true)

                // Fetch order with items
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
            *,
            order_items (*),
            restaurant_tables (table_number)
          `)
                    .eq('bill_id', billId)
                    .single()

                if (error) throw error
                setOrder(data)
                setItems(data.order_items || [])
            } catch (err: any) {
                console.error('Error fetching order:', err)
                setError(err.message)
            } finally {
                if (!silent) setLoading(false)
            }
        }

        // Initial fetch with loading
        fetchOrder(false)
        isInitialLoad = false

        // Realtime subscription
        channel = supabase
            .channel(`order-tracking-${billId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `bill_id=eq.${billId}`,
                },
                (payload) => {
                    console.log('🔴 [REALTIME] Order updated:', payload)
                    fetchOrder(true) // Silent update
                }
            )
            .subscribe()

        // FALLBACK: Silent polling every 5 seconds
        pollingInterval = setInterval(() => {
            fetchOrder(true) // Silent update
        }, 5000)

        return () => {
            if (channel) supabase.removeChannel(channel)
            if (pollingInterval) clearInterval(pollingInterval)
        }
    }, [billId])

    return { order, items, loading, error }
}
