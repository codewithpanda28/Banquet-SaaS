'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, Download, Eye, Printer, ShoppingBag, Truck, Utensils, Clock, MapPin, User, Phone, DollarSign, Smartphone, XCircle, UtensilsCrossed, Users, CheckCircle2, Calendar } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all')
    const [activeTab, setActiveTab] = useState('active')
    const [processingPayment, setProcessingPayment] = useState(false)

    useEffect(() => {
        fetchOrders()

        // Realtime
        const ch = supabase.channel('ord-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${RESTAURANT_ID}` }, () => fetchOrders()).subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [])

    useEffect(() => {
        filterOrders()
    }, [orders, searchTerm, orderTypeFilter, activeTab])

    async function fetchOrders() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *,
          customers (id, name, phone, email, address),
          restaurant_tables (table_number)
        `)
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    function filterOrders() {
        let filtered = [...orders]

        if (activeTab === 'active') {
            filtered = filtered.filter((o) =>
                ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
            )
        } else if (activeTab === 'completed') {
            filtered = filtered.filter((o) => o.status === 'completed')
        } else if (activeTab === 'cancelled') {
            filtered = filtered.filter((o) => o.status === 'cancelled')
        }

        if (orderTypeFilter !== 'all') {
            filtered = filtered.filter((o) => o.order_type === orderTypeFilter)
        }

        if (searchTerm) {
            filtered = filtered.filter((o: any) =>
                o.bill_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.customer?.phone || o.customers?.phone)?.includes(searchTerm) ||
                (o.customer?.name || o.customers?.name)?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        setFilteredOrders(filtered)
    }

    async function handleViewOrder(orderId: string) {
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
            console.error('❌ [ORDERS PAGE] Error fetching order details:', error)
            toast.error('Failed to load order details')
        }
    }

    function handlePrintOrder(order: any) {
        const printWindow = window.open('', '', 'height=600,width=800')
        if (!printWindow) {
            toast.error('Please allow popups to print')
            return
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Order ${order.bill_id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        h1 { font-size: 18px; margin: 0; }
                        p { margin: 2px 0; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th, td { text-align: left; padding: 4px 0; }
                        .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px; text-align: right; font-weight: bold; }
                        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                        @media print { button { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>RESTAURANT NAME</h1>
                        <p>123 Food Street, City</p>
                        <p>Phone: +91 7282871506</p>
                    </div>
                    <p><strong>Order:</strong> ${order.bill_id}</p>
                    <p><strong>Date:</strong> ${format(new Date(order.created_at), 'dd/MM/yy hh:mm a')}</p>
                    <p><strong>Customer:</strong> ${order.customers?.name || 'Walk-in'}</p>
                   
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align:right">Qty</th>
                                <th style="text-align:right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.order_items?.map((item: any) => `
                                <tr>
                                    <td>${item.item_name}</td>
                                    <td style="text-align:right">${item.quantity}</td>
                                    <td style="text-align:right">${item.total.toFixed(2)}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>
                    
                    <div class="total">
                        <p>Total: ₹${order.total.toFixed(2)}</p>
                    </div>
                    <div class="footer">
                        <p>Thank get for dining with us!</p>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    function exportOrders() {
        try {
            const csvContent = [
                ['Bill ID', 'Customer', 'Phone', 'Type', 'Table', 'Total', 'Status', 'Payment', 'Date'],
                ...filteredOrders.map((order: any) => [
                    order.bill_id,
                    order.customers?.name || 'Walk-in',
                    order.customers?.phone || 'N/A',
                    order.order_type.replace('_', ' '),
                    order.restaurant_tables ? `Table ${order.restaurant_tables.table_number}` : 'N/A',
                    `₹${order.total.toFixed(2)}`,
                    order.status,
                    order.payment_method,
                    format(new Date(order.created_at), 'dd/MM/yyyy hh:mm a')
                ])
            ]

            const csv = csvContent.map(row => row.join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `orders-${format(new Date(), 'dd-MM-yyyy')}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Orders exported successfully!')
        } catch (error) {
            console.error('Error exporting orders:', error)
            toast.error('Failed to export orders')
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
                    status: 'completed'
                })
                .eq('id', selectedOrder.id)

            if (error) throw error

            // Trigger n8n Webhook for Payment Confirmation
            try {
                console.log('🚀 Sending Webhook to n8n...', { method, bill_id: selectedOrder.bill_id })

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
            fetchOrders()
        } catch (error) {
            console.error('Error processing payment:', error)
            toast.error('Failed to update payment')
        } finally {
            setProcessingPayment(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:text-yellow-400',
            confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200/50 dark:text-blue-400',
            preparing: 'bg-orange-500/10 text-orange-600 border-orange-200/50 dark:text-orange-400',
            ready: 'bg-purple-500/10 text-purple-600 border-purple-200/50 dark:text-purple-400',
            served: 'bg-green-500/10 text-green-600 border-green-200/50 dark:text-green-400',
            completed: 'bg-green-500/10 text-green-600 border-green-200/50 dark:text-green-400',
            cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
        }
        return (
            <Badge variant="outline" className={cn("backdrop-blur-md uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 border", styles[status] || styles.pending)}>
                {status}
            </Badge>
        )
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Orders...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Orders Management"
                description="Track and manage all your restaurant orders in real-time"
            >
                <Button variant="outline" onClick={exportOrders} className="glass-panel hover:bg-white/20 border-primary/20 bg-primary/5">
                    <Download className="mr-2 h-4 w-4 text-primary" />
                    Export CSV
                </Button>
            </PageHeader>

            {/* Filters */}
            <Card className="glass-card border-0 relative overflow-hidden mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 via-transparent to-green-50/50 pointer-events-none" />
                <CardContent className="pt-6 relative z-10">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Search Orders</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search by Bill ID, Customer Name or Phone..."
                                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-green-500 transition-all text-black placeholder:text-gray-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-56 space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter by Type</Label>
                            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                                <SelectTrigger className="h-10 bg-gray-50 border-gray-200 text-black focus:ring-green-500">
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200 text-black">
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="dine_in">🍽️ Dine In</SelectItem>
                                    <SelectItem value="takeaway">🥡 Takeaway</SelectItem>
                                    <SelectItem value="delivery">🚚 Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
                <div className="flex justify-center mb-6">
                    <TabsList className="bg-gray-100 p-1 rounded-full border border-gray-200">
                        <TabsTrigger value="active" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all text-gray-500 font-medium">
                            Active Orders <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-200 border-0">{orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm transition-all text-gray-500 font-medium">
                            Completed <span className="ml-2 opacity-70 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{orders.filter((o) => o.status === 'completed').length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all text-gray-500 font-medium">
                            Cancelled <span className="ml-2 opacity-70 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{orders.filter((o) => o.status === 'cancelled').length}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="space-y-4">
                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-3xl border-dashed border-2 bg-gray-50/50">
                            <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-xl font-medium text-gray-500">No orders found</p>
                            <p className="text-sm text-gray-400">Try changing filters or wait for new orders</p>
                        </div>
                    ) : (
                        filteredOrders.map((order: any) => (
                            <div
                                key={order.id}
                                className="glass-card p-0 rounded-2xl border border-gray-100 overflow-hidden group hover:border-green-500/50 hover:shadow-lg transition-all duration-300 bg-white"
                            >
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-transparent" />

                                    {/* Left Side: Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-black tracking-tight text-gray-900">{order.bill_id}</h3>
                                            {getStatusBadge(order.status)}
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0">
                                                {order.order_type === 'dine_in' && <Utensils className="h-3 w-3 mr-1" />}
                                                {order.order_type === 'takeaway' && <ShoppingBag className="h-3 w-3 mr-1" />}
                                                {order.order_type === 'delivery' && <Truck className="h-3 w-3 mr-1" />}
                                                {order.order_type.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-green-600" />
                                                <span className="font-medium text-gray-900">{order.customers?.name || order.customer_name || 'Walk-in'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-green-600" />
                                                <span>{format(new Date(order.created_at), 'hh:mm a')}</span>
                                            </div>
                                            {order.restaurant_tables && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-green-600" />
                                                    <span>Table {order.restaurant_tables.table_number}</span>
                                                </div>
                                            )}
                                        </div>

                                        {order.special_instructions && (
                                            <div className="flex items-start gap-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded-lg border border-yellow-100 max-w-md">
                                                <span className="font-bold shrink-0">Note:</span>
                                                <span className="italic">{order.special_instructions}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Side: Actions & Price */}
                                    <div className="flex items-center gap-6 border-l border-gray-100 pl-6 border-dashed">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Amount</p>
                                            <p className="text-3xl font-black text-gray-900">₹{order.total.toFixed(0)}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                <span className={cn("h-2 w-2 rounded-full", order.payment_status === 'paid' ? "bg-green-500" : "bg-red-500")} />
                                                <p className="text-xs font-medium text-gray-500 uppercase">{order.payment_status}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-green-50 text-green-700 hover:bg-green-600 hover:text-white font-bold transition-all shadow-none border border-green-200"
                                                onClick={() => handleViewOrder(order.id)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" /> View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                onClick={() => handlePrintOrder(order)}
                                            >
                                                <Printer className="h-4 w-4 mr-2" /> Print
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>
            </Tabs>


            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-xl bg-background p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">Order Details</DialogTitle>
                    {selectedOrder && (
                        <div className="flex flex-col bg-white">
                            {/* Premium Header */}
                            <div className="flex flex-col gap-1 p-6 pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            Order #{selectedOrder.bill_id}
                                            <Badge className={cn(
                                                "ml-2 text-[10px] px-2 py-0.5 uppercase tracking-wide border-0",
                                                selectedOrder.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                    selectedOrder.status === 'pending' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                                                        "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            )}>
                                                {selectedOrder.status}
                                            </Badge>
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {format(new Date(selectedOrder.created_at), 'PPP')} at {format(new Date(selectedOrder.created_at), 'p')}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" onClick={() => setSelectedOrder(null)}>
                                        <XCircle className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>

                            <div className="px-6 py-2">
                                <div className="h-px bg-gray-100 w-full" />
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-6 p-6 pt-2">
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5" /> Customer
                                    </p>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-base">{selectedOrder.customers?.name || 'Walk-in Customer'}</p>
                                        <p className="text-sm text-gray-500 font-medium">{selectedOrder.customers?.phone || 'No Phone'}</p>
                                    </div>
                                    {(selectedOrder.delivery_address || selectedOrder.customers?.address) && (
                                        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                                            {selectedOrder.delivery_address || selectedOrder.customers?.address}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UtensilsCrossed className="h-3.5 w-3.5" /> Order Info
                                    </p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Type:</span>
                                            <span className="font-semibold text-gray-900 capitalize">{selectedOrder.order_type?.replace('_', ' ') || 'Dine In'}</span>
                                        </div>
                                        {selectedOrder.restaurant_tables && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 font-medium">Table No:</span>
                                                <span className="font-semibold text-gray-900">#{selectedOrder.restaurant_tables.table_number}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Payment:</span>
                                            <span className={cn("font-semibold capitalize", selectedOrder.payment_status === 'paid' ? "text-green-600" : "text-orange-600")}>
                                                {selectedOrder.payment_status || 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="px-6 pb-6 space-y-4">
                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <div className="col-span-6 pl-2">Item</div>
                                        <div className="col-span-2 text-center">Qty</div>
                                        <div className="col-span-4 text-right pr-2">Total</div>
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto custom-scrollbar">
                                        {selectedOrder.order_items?.map((item: any) => (
                                            <div key={item.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50/50 transition-colors">
                                                <div className="col-span-6 pl-2">
                                                    <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium">₹{(item.total / item.quantity).toFixed(0)} each</p>
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                                        {item.quantity}
                                                    </div>
                                                </div>
                                                <div className="col-span-4 text-right pr-2">
                                                    <p className="text-sm font-bold text-gray-900">₹{item.total.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Summary */}
                                    <div className="bg-gray-50 p-4 border-t border-gray-200">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="text-gray-500 font-medium">Subtotal</span>
                                            <span className="font-semibold text-gray-900">₹{selectedOrder.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                                            <span className="text-base font-bold text-gray-900">Grand Total</span>
                                            <span className="text-2xl font-black text-gray-900">₹{selectedOrder.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-2">
                                    {selectedOrder.status !== 'completed' && selectedOrder.payment_status !== 'paid' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                className="h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm"
                                                onClick={() => handlePayment('cash')}
                                                disabled={processingPayment}
                                            >
                                                <DollarSign className="mr-2 h-4 w-4" /> Collect Cash
                                            </Button>
                                            <Button
                                                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                                                onClick={() => handlePayment('upi')}
                                                disabled={processingPayment}
                                            >
                                                <Smartphone className="mr-2 h-4 w-4" /> Collect UPI
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="w-full h-11 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
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
