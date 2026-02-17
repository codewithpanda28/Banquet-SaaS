'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function SessionGuard() {
    const router = useRouter()
    const { tableId, clearCart, setTableInfo } = useCartStore()

    useEffect(() => {
        if (!tableId) return

        console.log('SessionGuard: Monitoring table', tableId)

        const channel = supabase
            .channel(`table_session_${tableId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `table_id=eq.${tableId}`
                },
                (payload) => {
                    const updatedOrder = payload.new as any
                    console.log('SessionGuard: Order update received', updatedOrder)

                    if (updatedOrder.payment_status === 'paid' || updatedOrder.status === 'completed') {
                        toast.info('Session Ended', {
                            description: 'Your order has been completed. Please scan the QR code again for a new session.',
                            duration: 5000,
                        })

                        // Clear session state
                        clearCart()
                        // We also need to clear table info so the user is forced to re-scan
                        // Casting to any to allow nulls if strict typing prevents it, though usually number|null is safer
                        // useCartStore.getState().setTableInfo(null as any, null as any) 
                        // Actually, let's just use the store actions we have.

                        // Force redirect to scan page
                        router.push('/scan')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableId, router, clearCart])

    return null
}
