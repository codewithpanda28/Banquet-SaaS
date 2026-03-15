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
                    console.log('⚡ [CUSTOMER REALTIME] Order updated:', payload.eventType)
                    fetchOrder(true) // Silent update
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items'
                    // We don't filter order_items here because we re-fetch everything from order anyway
                },
                (payload: any) => {
                    // Only refresh if it belongs to our bill
                    // Since we can't easily filter by bill_id on order_items table in Postgres Filter 
                    // without a join (which Realtime doesn't support for filters), 
                    // we just re-fetch. It's safe.
                    fetchOrder(true)
                }
            )
            .subscribe((status) => {
                console.log(`📡 [CUSTOMER REALTIME] Status: ${status}`)
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    // Fallback to polling strictly if realtime fails
                    console.warn('Realtime connection issues. Falling back to high-frequency polling.')
                }
            })

        // FALLBACK: Silent polling every 10 seconds (as safety net)
        pollingInterval = setInterval(() => {
            fetchOrder(true) // Silent update
        }, 10000)

        return () => {
            if (channel) supabase.removeChannel(channel)
            if (pollingInterval) clearInterval(pollingInterval)
        }
    }, [billId])

    return { order, items, loading, error }
}
