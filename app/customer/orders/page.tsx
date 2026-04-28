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
        <div className="min-h-screen bg-[#FCFBF7] pb-32 font-sans">
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#D4AF37]/20 p-6 flex items-center gap-4 shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-[#F4EBD0]/50 text-[#8B6508]">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-sm font-black uppercase tracking-[0.3em] text-[#8B6508]">Order History</h1>
            </header>

            <div className="p-6 max-w-lg mx-auto space-y-6">
                {!customerPhone ? (
                    <div className="text-center py-20 space-y-6 bg-white rounded-3xl border border-[#D4AF37]/10 shadow-sm">
                        <div className="w-20 h-20 bg-[#F4EBD0] rounded-full flex items-center justify-center mx-auto border border-[#D4AF37]/20">
                            <ShoppingBag className="w-10 h-10 text-[#8B6508]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-serif font-bold text-2xl text-[#1A1A1A]">No orders found</h3>
                            <p className="text-[#8B6508]/60 text-sm">Your banquet journey starts here.</p>
                        </div>
                        <Button onClick={() => router.push('/customer/menu')} className="rounded-full px-8 bg-[#D4AF37] hover:bg-[#B8860B] text-white">Browse Menu</Button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[#8B6508]/60 text-sm italic font-serif">Recalling your selections...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 space-y-6 bg-white rounded-3xl border border-[#D4AF37]/10 shadow-sm">
                        <h3 className="font-serif font-bold text-2xl text-[#1A1A1A]">No past orders</h3>
                        <p className="text-[#8B6508]/60 text-sm">You haven't made any selections yet.</p>
                        <Button onClick={() => router.push('/customer/menu')} className="rounded-full px-8 bg-[#D4AF37] hover:bg-[#B8860B] text-white">Order Now</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => router.push(`/customer/track/${order.bill_id}`)}
                                className="bg-white p-6 rounded-2xl border border-[#D4AF37]/10 shadow-sm active:scale-[0.99] transition-all cursor-pointer hover:shadow-md group relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-[10px] tracking-widest text-[#D4AF37] bg-[#F4EBD0]/30 px-3 py-1 rounded-full border border-[#D4AF37]/20 uppercase">#{order.bill_id.slice(-6)}</span>
                                        <Badge variant="secondary" className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 border-0 ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </Badge>
                                    </div>
                                    <span className="text-[10px] text-[#8B6508]/50 font-bold uppercase tracking-tighter">
                                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8B6508]/40">
                                            {order.order_type === 'dine_in' ? <Utensils className="w-3 h-3" /> :
                                                order.order_type === 'take_away' ? <Box className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                            <span>{order.order_type.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {(order as any).order_items?.slice(0, 3).map((item: any) => (
                                                <span key={item.id} className="text-[10px] bg-[#FCFBF7] border border-[#F4EBD0] px-2 py-1 rounded-md text-[#8B6508] font-bold">
                                                    {item.quantity}x {item.item_name}
                                                </span>
                                            ))}
                                            {(order as any).order_items?.length > 3 && (
                                                <span className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest self-center ml-1">
                                                    +{(order as any).order_items.length - 3} More
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[#FCFBF7] border border-[#F4EBD0] flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-white transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
