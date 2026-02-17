
"use client"

import { useRealtime } from '@/hooks/useRealtime'
import KitchenHeader from '@/components/kitchen/KitchenHeader'
import { Toaster } from '@/components/ui/sonner'
import { useEffect } from 'react'
import { useKitchenStore } from '@/store/kitchenStore'
import { getActiveOrders } from '@/services/orderService'

export default function KitchenClientLayout({ children }: { children: React.ReactNode }) {
    useRealtime()
    const { setOrders } = useKitchenStore()

    useEffect(() => {
        // Initial fetch
        const fetchOrders = async () => {
            const orders = await getActiveOrders()
            setOrders(orders)
        }
        fetchOrders()
    }, [])

    return (
        <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
            <KitchenHeader />
            <main className="flex-1 overflow-hidden relative bg-muted/20">
                {children}
            </main>
            <Toaster />
        </div>
    )
}
