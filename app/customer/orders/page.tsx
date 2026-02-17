'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, ShoppingBag, ChevronRight, Utensils, Box, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/customer/cartStore'
import { Badge } from '@/components/ui/badge'

interface Order {
    id: string
    created_at: string
    total: number
    status: string
    order_type: string
    bill_id: string
    quantity_count?: number
}

export default function OrderHistoryPage() {
    const router = useRouter()
    const { customerPhone } = useCartStore()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = async () => {
        if (!customerPhone) {
            setLoading(false)
            return
        }

        try {
            // Get customer ID first
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', customerPhone)
                .maybeSingle()

            if (customerError || !customerData) {
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, 
                    created_at, 
                    total, 
                    status, 
                    order_type, 
                    bill_id,
                    order_items(id, item_name, quantity)
                `)
                .eq('customer_id', customerData.id)
                .order('created_at', { ascending: false })

            if (!error && data) {
                setOrders(data)
            }
        } catch (err) {
            console.error('Error fetching orders:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let channel: any

        const setupRealtime = async () => {
            fetchOrders() // Initial fetch

            if (!customerPhone) return

            // 1. Get Customer ID for filter
            const { data: customerData } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', customerPhone)
                .maybeSingle()

            if (!customerData) return

            // 2. Subscribe with filter
            channel = supabase
                .channel(`customer-orders-${customerData.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `customer_id=eq.${customerData.id}`
                    },
                    (payload) => {
                        console.log('🔔 Order Update:', payload)
                        fetchOrders()
                    }
                )
                .subscribe()
        }

        setupRealtime()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [customerPhone])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700'
            case 'served': return 'bg-green-100 text-green-700'
            case 'cancelled': return 'bg-red-100 text-red-700'
            case 'preparing': return 'bg-orange-100 text-orange-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b p-4 flex items-center gap-4 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-muted">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold tracking-tight">Order History</h1>
            </header>

            <div className="p-4 max-w-lg mx-auto space-y-4">
                {!customerPhone ? (
                    <div className="text-center py-10 space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-lg">No orders found</h3>
                        <p className="text-muted-foreground text-sm">Place an order to see it here.</p>
                        <Button onClick={() => router.push('/customer/menu')}>Browse Menu</Button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted-foreground text-sm">Loading history...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10 space-y-4">
                        <h3 className="font-bold text-lg">No past orders</h3>
                        <p className="text-muted-foreground text-sm">Looks like you haven't ordered yet.</p>
                        <Button onClick={() => router.push('/customer/menu')}>Order Now</Button>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => router.push(`/customer/track/${order.bill_id}`)}
                            className="bg-white p-4 rounded-xl border shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md group relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded">#{order.bill_id.slice(-6)}</span>
                                    <Badge variant="secondary" className={`text-[10px] uppercase font-bold border-0 ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                                        {order.order_type === 'dine_in' ? <Utensils className="w-3 h-3" /> :
                                            order.order_type === 'take_away' ? <Box className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                        <span className="capitalize">{order.order_type.replace('_', ' ')}</span>
                                    </div>
                                    <p className="font-black text-lg">₹{order.total.toFixed(2)}</p>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                        {(order as any).order_items?.slice(0, 3).map((item: any) => (
                                            <span key={item.id} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold whitespace-nowrap">
                                                {item.quantity}x {item.item_name}
                                            </span>
                                        ))}
                                        {(order as any).order_items?.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground font-bold">
                                                +{(order as any).order_items.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0">
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
