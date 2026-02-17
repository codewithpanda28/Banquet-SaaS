
"use client"

import { useKitchenStore } from '@/store/kitchenStore'
import OrderColumn from '@/components/kitchen/OrderColumn'
import OrderDetails from '@/components/kitchen/OrderDetails'

export default function KitchenPage() {
    const orders = useKitchenStore((state) => state.orders)
    const orderTypeFilter = useKitchenStore((state) => state.orderTypeFilter)
    const selectedOrder = useKitchenStore((state) => state.selectedOrder)
    const setSelectedOrder = useKitchenStore((state) => state.setSelectedOrder)

    // Computed data - Only show active orders (not served/completed/cancelled)
    const newOrders = orders.filter(o =>
        (o.status === 'pending' || o.status === 'confirmed') &&
        !['served', 'completed', 'cancelled'].includes(o.status) &&
        (orderTypeFilter === 'all' || o.order_type === orderTypeFilter)
    )

    const preparingOrders = orders.filter(o =>
        o.status === 'preparing' &&
        !['served', 'completed', 'cancelled'].includes(o.status) &&
        (orderTypeFilter === 'all' || o.order_type === orderTypeFilter)
    )

    const readyOrders = orders.filter(o =>
        o.status === 'ready' &&
        !['served', 'completed', 'cancelled'].includes(o.status) &&
        (orderTypeFilter === 'all' || o.order_type === orderTypeFilter)
    )

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
