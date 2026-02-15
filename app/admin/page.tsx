'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { DollarSign, ShoppingCart, TrendingUp, Clock, Download, Eye, MapPin, Sparkles, Zap, Utensils, Users, ChevronRight, ArrowRight, ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { DashboardMetrics, Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        todayRevenue: 0,
        todayOrders: 0,
        avgOrderValue: 0,
        activeOrders: 0,
    })
    const [recentOrders, setRecentOrders] = useState<Order[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processingPayment, setProcessingPayment] = useState(false)

    useEffect(() => {
        fetchDashboardData()

        const channel = supabase
            .channel('dashboard-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${RESTAURANT_ID}`
                },
                () => {
                    fetchDashboardData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true)

            const today = new Date().toISOString().split('T')[0]
            const { data: todayOrders } = await supabase
                .from('orders')
                .select('total, status')
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)

            const todayRevenue = todayOrders
                ?.filter((o) => o.status === 'completed')
                .reduce((sum, o) => sum + o.total, 0) || 0

            const todayOrdersCount = todayOrders?.length || 0

            const { count: activeCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)
                .in('status', ['pending', 'confirmed', 'preparing', 'ready'])


            const { data: recent, error: recentError } = await supabase
                .from('orders')
                .select(`
          *,
          customers (id, name, phone, address),
          restaurant_tables (table_number)
        `)
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(10)

            setMetrics({
                todayRevenue,
                todayOrders: todayOrdersCount,
                avgOrderValue: todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0,
                activeOrders: activeCount || 0,
            })

            setRecentOrders(recent || [])
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    async function handleViewDetails(orderId: string) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers (id, name, phone, email, address),
                    restaurant_tables (table_number),
                    order_items (*)
                `)
                .eq('id', orderId)
                .single()

            if (error) throw error
            setSelectedOrder(data)
        } catch (error) {
            console.error('❌ Error fetching order details:', error)
            toast.error('Failed to load order details')
        }
    }

    function downloadReport() {
        try {
            const csvContent = [
                ['Metric', 'Value'],
                ['Today Revenue', `₹${metrics.todayRevenue.toFixed(2)}`],
                ['Today Orders', metrics.todayOrders],
                ['Average Order Value', `₹${metrics.avgOrderValue.toFixed(2)}`],
                ['Active Orders', metrics.activeOrders],
                [''],
                ['Recent Orders'],
                ['Bill ID', 'Customer', 'Type', 'Total', 'Status', 'Time'],
                ...recentOrders.map((order: any) => [
                    order.bill_id,
                    order.customers?.name || order.customer_name || 'Walk-in',
                    order.order_type.replace('_', ' '),
                    `₹${order.total.toFixed(2)}`,
                    order.status,
                    format(new Date(order.created_at), 'dd/MM/yyyy hh:mm a')
                ])
            ]

            const csv = csvContent.map(row => row.join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `dashboard-report-${format(new Date(), 'dd-MM-yyyy')}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Report downloaded successfully!')
        } catch (error) {
            console.error('Error downloading report:', error)
            toast.error('Failed to download report')
        }
    }

    async function handlePayment(method: 'cash' | 'upi') {
        if (!selectedOrder) return

        try {
            setProcessingPayment(true)

            // 1. Update Payment Status in Database
            const { error } = await supabase
                .from('orders')
                .update({
                    payment_status: 'paid',
                    payment_method: method,
                    status: 'completed' // Mark as completed when paid
                })
                .eq('id', selectedOrder.id)

            if (error) throw error

            // Trigger n8n Webhook for Payment Confirmation
            try {
                console.log('🚀 Sending Webhook to n8n (Dashboard)...', { method, bill_id: selectedOrder.bill_id })

                const webhookResponse = await fetch('https://n8n.srv1114630.hstgr.cloud/webhook-test/payment-confirmation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        bill_id: selectedOrder.bill_id,
                        amount: selectedOrder.total,
                        customer: {
                            name: selectedOrder.customers?.name || selectedOrder.customer_name || 'Walk-in',
                            phone: selectedOrder.customers?.phone || 'N/A',
                            address: selectedOrder.delivery_address || selectedOrder.customers?.address
                        },
                        order_type: selectedOrder.order_type,
                        table_number: Array.isArray(selectedOrder.restaurant_tables) ? selectedOrder.restaurant_tables[0]?.table_number : selectedOrder.restaurant_tables?.table_number,
                        items: selectedOrder.order_items?.map((i: any) => ({
                            name: i.item_name,
                            quantity: i.quantity,
                            price: i.price,
                            total: i.total
                        })),
                        payment_method: method,
                        payment_status: 'paid',
                        restaurant_id: RESTAURANT_ID,
                        updated_at: new Date().toISOString(),
                        source: 'admin_dashboard',
                        trigger_type: 'payment_marked_manually'
                    })
                })

                if (!webhookResponse.ok) {
                    const errorText = await webhookResponse.text()
                    console.error('❌ Webhook Failed:', webhookResponse.status, errorText)
                    toast.error(`Webhook Failed: ${webhookResponse.status}`)
                } else {
                    console.log('✅ Webhook Delivered Successfully')
                }
            } catch (webhookError) {
                console.error('❌ Failed to trigger webhook:', webhookError)
                toast.error('Webhook Error (Check Console)')
            }

            toast.success(`Payment marked as ${method.toUpperCase()} & Message Sent 🚀`)
            setSelectedOrder(null)
            fetchDashboardData() // Refresh dashboard data
        } catch (error) {
            console.error('Error processing payment:', error)
            toast.error('Failed to update payment')
        } finally {
            setProcessingPayment(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-200/20',
            confirmed: 'bg-blue-500/10 text-blue-500 border-blue-200/20',
            preparing: 'bg-orange-500/10 text-orange-500 border-orange-200/20',
            ready: 'bg-purple-500/10 text-purple-500 border-purple-200/20',
            served: 'bg-green-500/10 text-green-500 border-green-200/20',
            completed: 'bg-green-500/10 text-green-500 border-green-200/20',
            cancelled: 'bg-red-500/10 text-red-500 border-red-200/20',
        }
        return (
            <Badge variant="outline" className={cn("border backdrop-blur-md uppercase text-[10px] font-bold tracking-widest px-2 py-0.5", styles[status])}>
                {status}
            </Badge>
        )
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <PageHeader
                title="Restaurant Control Center"
                description="Real-time overview of your business"
            >
                <Button onClick={downloadReport} variant="outline" className="glass-panel hover:bg-white/20 border-primary/20 bg-primary/5 hidden sm:flex">
                    <Download className="mr-2 h-4 w-4 text-primary" />
                    Download Today's Report
                </Button>
            </PageHeader>

            {/* Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-green-200/20 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="h-16 w-16" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-0 text-[10px] font-extrabold">+12% vs yest</Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                            <h3 className="text-3xl font-black text-foreground mt-1">₹{metrics.todayRevenue.toFixed(0)}</h3>
                        </div>
                        <div className="mt-4 h-1 w-full bg-green-100 dark:bg-green-950 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[70%]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border-blue-200/20 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingCart className="h-16 w-16" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                            <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-0 text-[10px] font-extrabold">+5 Orders</Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
                            <h3 className="text-3xl font-black text-foreground mt-1">{metrics.todayOrders}</h3>
                        </div>
                        <div className="mt-4 h-1 w-full bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[60%]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent border-purple-200/20 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="h-16 w-16" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                            <h3 className="text-3xl font-black text-foreground mt-1">₹{metrics.avgOrderValue.toFixed(0)}</h3>
                        </div>
                        <div className="mt-4 h-1 w-full bg-purple-100 dark:bg-purple-950 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-[45%]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border-orange-200/20 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="h-16 w-16" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Zap className="h-6 w-6" />
                            </div>
                            <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-0 text-[10px] font-extrabold">LIVE</Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                            <h3 className="text-3xl font-black text-foreground mt-1">{metrics.activeOrders}</h3>
                        </div>
                        <div className="mt-4 h-1 w-full bg-orange-100 dark:bg-orange-950 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 w-[80%]" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Feed / Ticker */}
                <Card className="col-span-1 glass-panel border bg-background/50 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-yellow-500" /> Live Kitchen Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-0 divide-y divide-border/50">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-default">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Utensils className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">Chef started preparing <span className="text-primary font-bold">Butter Chicken</span></p>
                                        <p className="text-[10px] text-muted-foreground">Table 4 • 2 mins ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 bg-muted/20 text-center border-t border-border/50">
                            <Button variant="link" className="text-xs h-auto p-0 text-muted-foreground hover:text-primary">
                                View Kitchen Display System <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Orders List */}
                <Card className="col-span-1 lg:col-span-2 glass-panel border bg-background/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-bold">Recent Orders</CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs hover:bg-white/5">View All <ChevronRight className="ml-1 h-3 w-3" /></Button>
                    </CardHeader>
                    <CardContent>
                        {recentOrders.length === 0 ? (
                            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground gap-2">
                                <ShoppingBag className="h-8 w-8 opacity-20" />
                                <p>No orders yet today</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentOrders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:shadow-lg hover:border-primary/20 transition-all group gap-4 cursor-pointer"
                                        onClick={() => handleViewDetails(order.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-secondary/50 flex items-center justify-center font-black text-lg text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors shadow-inner">
                                                {order.restaurant_tables?.table_number || '#'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-foreground leading-none">{order.bill_id}</p>
                                                    <Badge variant="secondary" className="text-[10px] h-5">{order.order_type.replace('_', ' ')}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                                                    <Users className="h-3 w-3" /> {order.customers?.name || 'Guest'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-16 sm:pl-0">
                                            <div className="text-right">
                                                <p className="font-black text-foreground text-lg leading-none">₹{order.total.toFixed(0)}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 text-right">{order.order_items?.length || 1} items</p>
                                            </div>
                                            {getStatusBadge(order.status)}
                                            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-xl bg-background p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">Order Details</DialogTitle>
                    {selectedOrder && (
                        <div className="flex flex-col">
                            {/* Header Gradient */}
                            <div className="bg-gradient-to-r from-primary to-purple-800 p-6 text-white relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 h-32 w-32 bg-white/20 rounded-full blur-2xl" />
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-primary-foreground/80 text-xs font-bold uppercase tracking-wider mb-1">
                                            Order #{selectedOrder.bill_id}
                                        </p>
                                        <h2 className="text-3xl font-black">{selectedOrder.customers?.name || 'Walk-in Customer'}</h2>
                                        <p className="flex items-center gap-2 text-sm mt-1 opacity-90">
                                            <Users className="h-3 w-3" /> {selectedOrder.customers?.phone || 'No Phone'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                                            Table {selectedOrder.restaurant_tables?.table_number || 'N/A'}
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10 uppercase">
                                            {selectedOrder.status}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Items List */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Order Items</p>
                                        <Badge variant="outline">{selectedOrder.order_items?.length || 0} ITEMS</Badge>
                                    </div>
                                    <div className="bg-secondary/30 rounded-2xl border border-border overflow-hidden">
                                        {selectedOrder.order_items?.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-4 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 text-primary font-bold text-xs ring-1 ring-primary/20">
                                                        {item.quantity}x
                                                    </span>
                                                    <span className="font-semibold text-sm">{item.item_name}</span>
                                                </div>
                                                <span className="font-bold text-sm">₹{item.total.toFixed(2)}</span>
                                            </div>
                                        )) || <p className="p-4 text-center text-muted-foreground text-sm">No items found</p>}
                                    </div>
                                </div>

                                {/* Payment Section */}
                                <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-foreground">Total Amount</span>
                                        <span className="text-3xl font-black text-primary">₹{selectedOrder.total.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-right mb-6">Including all taxes & charges</p>

                                    {selectedOrder.status !== 'completed' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-green-900/20 active:scale-95 transition-all"
                                                onClick={() => handlePayment('cash')}
                                                disabled={processingPayment}
                                            >
                                                <DollarSign className="mr-2 h-4 w-4" /> Cash Paid
                                            </Button>
                                            <Button
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                                                onClick={() => handlePayment('upi')}
                                                disabled={processingPayment}
                                            >
                                                <DollarSign className="mr-2 h-4 w-4" /> UPI Paid
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 p-3 rounded-xl text-center font-bold text-sm border border-green-200 dark:border-green-500/30 flex items-center justify-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Payment Completed via {selectedOrder.payment_method?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
