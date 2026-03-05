
import { create } from 'zustand'
import { Order, OrderStatus, OrderType } from '@/types'
import { updateOrderStatus, updateOrderItemStatus } from '@/services/orderService'

interface KitchenStore {
    // Orders State
    orders: Order[]
    selectedOrder: Order | null

    // Filters
    orderTypeFilter: 'all' | OrderType

    // Settings
    refreshInterval: number // seconds
    prepTimeThreshold: number // minutes for warning

    // UI State
    isSoundEnabled: boolean
    isConnected: boolean
    lastUpdated: Date | null

    // Actions
    setOrders: (orders: Order[]) => void
    addOrder: (order: Order) => void
    updateOrder: (orderId: string, updates: Partial<Order>) => void
    removeOrder: (orderId: string) => void

    setSelectedOrder: (order: Order | null) => void
    setOrderTypeFilter: (filter: 'all' | OrderType) => void
    setRefreshInterval: (interval: number) => void
    setPrepTimeThreshold: (threshold: number) => void

    toggleSound: () => void
    setConnectionStatus: (status: boolean) => void

    // Computed (as helpers)
    getNewOrders: () => Order[]
    getPreparingOrders: () => Order[]
    getReadyOrders: () => Order[]
    getOrdersByType: (type: string) => Order[]
}

export const useKitchenStore = create<KitchenStore>((set, get) => ({
    orders: [],
    selectedOrder: null,
    orderTypeFilter: 'all',
    refreshInterval: 30,
    prepTimeThreshold: 20,
    isSoundEnabled: true,
    isConnected: true,
    lastUpdated: null,

    setOrders: (orders) => set({ orders: orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), lastUpdated: new Date() }),

    addOrder: (order) => set((state) => ({
        orders: [...state.orders, order].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        lastUpdated: new Date()
    })),

    updateOrder: (orderId, updates) => {
        const { orders } = get()
        const targetOrder = orders.find(o => o.id === orderId)

        // Update database if status changes
        if (updates.status) {
            updateOrderStatus(orderId, updates.status as OrderStatus)

            // If marking as READY, also mark all items as ready in DB
            if (updates.status === 'ready' && targetOrder) {
                const items = targetOrder.order_items || []
                items.forEach(item => {
                    if (item.status !== 'ready') {
                        updateOrderItemStatus(item.id, 'ready')
                    }
                })
            }
        }

        // Update local state
        set((state) => ({
            orders: state.orders.map((o) => {
                if (o.id === orderId) {
                    const newOrder = { ...o, ...updates }
                    // Also update local items if marking as ready
                    if (updates.status === 'ready') {
                        newOrder.order_items = o.order_items?.map(item => ({ ...item, status: 'ready' }))
                    }
                    return newOrder
                }
                return o
            }),
            lastUpdated: new Date()
        }))
    },

    removeOrder: (orderId) => set((state) => ({
        orders: state.orders.filter((o) => o.id !== orderId)
    })),

    setSelectedOrder: (order) => set({ selectedOrder: order }),

    setOrderTypeFilter: (filter) => set({ orderTypeFilter: filter }),
    setRefreshInterval: (interval) => set({ refreshInterval: interval }),
    setPrepTimeThreshold: (threshold) => set({ prepTimeThreshold: threshold }),

    toggleSound: () => set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),

    setConnectionStatus: (status) => set({ isConnected: status }),

    getNewOrders: () => {
        const { orders, orderTypeFilter } = get()
        // New orders are pending or confirmed
        let filtered = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.order_type === orderTypeFilter)
        }
        return filtered
    },

    getPreparingOrders: () => {
        const { orders, orderTypeFilter } = get()
        let filtered = orders.filter(o => o.status === 'preparing')
        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.order_type === orderTypeFilter)
        }
        return filtered
    },

    getReadyOrders: () => {
        const { orders, orderTypeFilter } = get()
        let filtered = orders.filter(o => o.status === 'ready')
        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter(o => o.order_type === orderTypeFilter)
        }
        return filtered
    },

    getOrdersByType: (type) => {
        const { orders } = get()
        if (type === 'all') return orders
        return orders.filter(o => o.order_type === type)
    }
}))
