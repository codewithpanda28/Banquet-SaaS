"use client"

import { useEffect } from 'react'

import { useKitchenStore } from '@/store/kitchenStore'
import OrderColumn from '@/components/kitchen/OrderColumn'
import OrderDetails from '@/components/kitchen/OrderDetails'

export default function KitchenPage() {
    const orders = useKitchenStore((state) => state.orders)
    const orderTypeFilter = useKitchenStore((state) => state.orderTypeFilter)
    const selectedOrder = useKitchenStore((state) => state.selectedOrder)
    const setSelectedOrder = useKitchenStore((state) => state.setSelectedOrder)
    const setOrders = useKitchenStore((state) => state.setOrders)

    // ULTRA-AGGRESSIVE 2 SEC REFRESH
    useEffect(() => {
        const refreshData = async () => {
            try {
                const { getActiveOrders } = await import('@/services/orderService')
                const freshOrders = await getActiveOrders()
                setOrders(freshOrders)
                console.log('🔄 [KITCHEN] 2s Heartbeat Sync Completed')
            } catch (err) {
                console.error('❌ [KITCHEN] Heartbeat Sync Failed:', err)
            }
        }
        
        const timer = setInterval(refreshData, 2000)
        return () => clearInterval(timer)
    }, [setOrders])

    // Computed data - Only show active orders (not served/completed/cancelled)
    // IMPORTANT: We also show 'pending_confirmation' IF it's an update to an existing bill 
    // (detected by having any item that is already in progress, or being older than 10 seconds)
    const isOrderVisible = (o: any) => {
        const isActiveStatus = ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
        const isUpdateStatus = o.status === 'pending_confirmation'
        
        if (isActiveStatus) return true
        if (isUpdateStatus) {
            // STRICT MODE: Only show unapproved orders to the kitchen if they contain items 
            // that were ALREADY in progress before the update (Preparing/Ready/Confirmed).
            // Brand new unapproved tables will be HIDDEN completely.
            const items = o.order_items || []
            if (items.length === 0) return false

            const hasAlreadyStartedWork = items.some((i: any) => i.status !== 'pending')
            return hasAlreadyStartedWork
        }
        return false
    }

    const newOrders = orders.filter(o => {
        if (!isOrderVisible(o)) return false
        if (orderTypeFilter !== 'all' && o.order_type !== orderTypeFilter) return false
        
        // If it's specifically pending/confirmed, it's a new order
        if (o.status === 'pending' || o.status === 'confirmed') return true
        
        // If it's pending_confirmation AND has NO items being prepared/ready, it's also a "new" update
        if (o.status === 'pending_confirmation') {
            const hasActiveWork = o.order_items?.some((i: any) => i.status === 'preparing' || i.status === 'ready')
            return !hasActiveWork
        }
        return false
    })

    const preparingOrders = orders.filter(o => {
        if (!isOrderVisible(o)) return false
        if (orderTypeFilter !== 'all' && o.order_type !== orderTypeFilter) return false

        // Explicitly preparing
        if (o.status === 'preparing') return true
        
        // Or it's a re-approval but the kitchen is already preparing pieces of it
        if (o.status === 'pending_confirmation') {
            const hasPreparing = o.order_items?.some((i: any) => i.status === 'preparing')
            const itemsCount = o.order_items?.length || 0
            const allReady = itemsCount > 0 && o.order_items?.every((i: any) => i.status === 'ready')
            return hasPreparing && !allReady
        }
        return false
    })

    const readyOrders = orders.filter(o => {
        if (!isOrderVisible(o)) return false
        if (orderTypeFilter !== 'all' && o.order_type !== orderTypeFilter) return false

        // Explicitly ready
        if (o.status === 'ready') return true

        // Or it's a re-approval but everything they already cooked is ready
        if (o.status === 'pending_confirmation') {
            const itemsCount = o.order_items?.length || 0
            const isMeaningfullyReady = itemsCount > 0 && o.order_items?.every((i: any) => i.status === 'ready')
            return isMeaningfullyReady
        }
        return false
    })

    return (
        <div className="flex bg-muted/20 h-full w-full gap-4 p-4 overflow-x-auto min-h-0">
            <div className="flex-1 min-w-[320px] max-w-[450px] flex flex-col min-h-0">
                <OrderColumn
                    title="New Orders"
                    orders={newOrders}
                    emptyMessage="No new orders"
                    columnType="new"
                />
            </div>
            <div className="flex-1 min-w-[320px] max-w-[450px] flex flex-col min-h-0">
                <OrderColumn
                    title="Preparing"
                    orders={preparingOrders}
                    emptyMessage="No orders being prepared"
                    columnType="preparing"
                />
            </div>
            <div className="flex-1 min-w-[320px] max-w-[450px] flex flex-col min-h-0">
                <OrderColumn
                    title="Ready"
                    orders={readyOrders}
                    emptyMessage="No orders ready"
                    columnType="ready"
                />
            </div>

            <OrderDetails
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />
        </div>
    )
}
