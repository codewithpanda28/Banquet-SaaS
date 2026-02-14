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
import { Search, Download, Eye, Printer } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'

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
            console.log('🔍 [ORDERS PAGE] Fetching order details for:', orderId)

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

            console.log('📦 [ORDERS PAGE] Order Details Response:')
            console.log('  - Data:', data)
            console.log('  - Error:', error)

            if (data) {
                console.log('👤 [ORDERS PAGE] Customer Info:')
                console.log('  - customer_id:', data.customer_id)
                console.log('  - 🔥 customer_name (DIRECT):', data.customer_name)
                console.log('  - 🔥 customer_phone (DIRECT):', data.customer_phone)
                console.log('  - customers object:', data.customers)
                console.log('  - customers?.name:', data.customers?.name)
                console.log('  - customers?.phone:', data.customers?.phone)
                console.log('  - customers?.address:', data.customers?.address)
                console.log('  - All customer keys:', data.customers ? Object.keys(data.customers) : 'NO CUSTOMER')
                console.log('  - All customer values:', data.customers ? Object.values(data.customers) : 'NO CUSTOMER')
            }

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
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .info { margin: 20px 0; }
                        .info p { margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
                        @media print {
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Order Receipt - ${order.bill_id}</h1>
                    <div class="info">
                        <p><strong>Customer:</strong> ${order.customers?.name || 'Walk-in'}</p>
                        <p><strong>Phone:</strong> ${order.customers?.phone || 'N/A'}</p>
                        ${(order.delivery_address || order.customer?.address || order.customers?.address) ? `<p><strong>Address:</strong> ${order.delivery_address || order.customer?.address || order.customers?.address}</p>` : ''}
                        <p><strong>Order Type:</strong> ${order.order_type.replace('_', ' ')}</p>
                        ${order.restaurant_tables ? `<p><strong>Table:</strong> ${order.restaurant_tables.table_number}</p>` : ''}
                        <p><strong>Date:</strong> ${format(new Date(order.created_at), 'dd/MM/yyyy hh:mm a')}</p>
                        <p><strong>Status:</strong> ${order.status}</p>
                    </div>
                    <div class="total">
                        <p>Total Amount: ₹${order.total.toFixed(2)}</p>
                        <p style="font-size: 14px; color: #666;">Payment: ${order.payment_method} - ${order.payment_status}</p>
                    </div>
                    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Receipt</button>
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
                    status: 'completed' // Mark as completed when paid
                })
                .eq('id', selectedOrder.id)

            if (error) throw error

            // 2. Trigger Automation Webhook
            const webhookUrl = process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL
            if (webhookUrl && !webhookUrl.includes('your-n8n-webhook-url')) {
                const payload = {
                    event: 'payment_received',
                    bill_id: selectedOrder.bill_id,
                    customer_name: selectedOrder.customers?.name || 'Walk-in',
                    customer_phone: selectedOrder.customers?.phone,
                    amount: selectedOrder.total,
                    payment_method: method,
                    items: selectedOrder.order_items?.map((i: any) => `${i.item_name} x ${i.quantity}`).join(', '),
                    timestamp: new Date().toISOString()
                }

                // Send non-blocking request to webhook
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(err => console.error('Webhook failed:', err))
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
        const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
            pending: { variant: 'outline', label: 'Pending' },
            confirmed: { variant: 'secondary', label: 'Confirmed' },
            preparing: { variant: 'default', label: 'Preparing' },
            ready: { variant: 'default', label: 'Ready' },
            served: { variant: 'secondary', label: 'Served' },
            completed: { variant: 'secondary', label: 'Completed' },
            cancelled: { variant: 'destructive', label: 'Cancelled' },
        }
        const { variant, label } = config[status] || config.pending
        return <Badge variant={variant}>{label}</Badge>
    }

    const getOrderTypeBadge = (type: string) => {
        const config: Record<string, { color: string, label: string, icon: string }> = {
            dine_in: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Dine-in', icon: '🍽️' },
            take_away: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Takeaway', icon: '🥡' },
            home_delivery: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Delivery', icon: '🚚' },
        }
        const { color, label, icon } = config[type] || config.dine_in
        return (
            <Badge variant="outline" className={`${color} px-2 py-1 flex items-center gap-1 font-bold`}>
                <span>{icon}</span>
                {label}
            </Badge>
        )
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-muted-foreground">Loading orders...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Orders"
                description="Manage all your restaurant orders"
            >
                <Button variant="outline" onClick={exportOrders}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </PageHeader>

            {/* Filters */}
            <Card className="bg-card border-2 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search Bill ID or Phone..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                            <Label>Order Type</Label>
                            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="dine_in">Dine In</SelectItem>
                                    <SelectItem value="takeaway">Takeaway</SelectItem>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1">
                    <TabsTrigger value="active">
                        Active Orders ({orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({orders.filter((o) => o.status === 'completed').length})
                    </TabsTrigger>
                    <TabsTrigger value="cancelled">
                        Cancelled ({orders.filter((o) => o.status === 'cancelled').length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6 space-y-3">
                    {filteredOrders.length === 0 ? (
                        <Card className="bg-card">
                            <CardContent className="flex h-32 items-center justify-center">
                                <p className="text-muted-foreground">No orders found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredOrders.map((order: any) => (
                            <Card key={order.id} className="hover:shadow-md transition-shadow bg-card">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        {/* Order Info */}
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl font-bold tracking-tight">{order.bill_id}</span>
                                                {getStatusBadge(order.status)}
                                                <Badge variant="outline" className="capitalize">
                                                    {order.order_type.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    {order.customers?.name || order.customer_name || 'Walk-in'}
                                                </span>
                                                {(order.customers?.phone || order.customer_phone) && (
                                                    <span className="flex items-center gap-1">
                                                        {order.customers?.phone || order.customer_phone}
                                                    </span>
                                                )}
                                                {order.restaurant_tables && (
                                                    <span className="flex items-center gap-1">
                                                        Table {order.restaurant_tables.table_number}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    {format(new Date(order.created_at), 'dd/MM/yyyy • hh:mm a')}
                                                </span>
                                            </div>
                                            {order.special_instructions && (
                                                <p className="text-sm italic text-muted-foreground">
                                                    Note: {order.special_instructions}
                                                </p>
                                            )}
                                        </div>

                                        {/* Order Amount & Actions */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                                <p className="text-2xl font-bold">₹{order.total.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {order.payment_method} • {order.payment_status}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="outline" onClick={() => handleViewOrder(order.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" onClick={() => handlePrintOrder(order)}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-2xl bg-white">
                    <DialogHeader>
                        <DialogTitle>Order Details - {selectedOrder?.bill_id}</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Customer Name</p>
                                    <p className="font-bold text-lg">{selectedOrder.customers?.name || selectedOrder.customer_name || 'Walk-in'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Phone Number</p>
                                    <p className="font-bold text-lg">{selectedOrder.customers?.phone || selectedOrder.customer_phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order Type</p>
                                    <p className="font-bold capitalize">{selectedOrder.order_type.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                                </div>
                            </div>

                            {(selectedOrder.delivery_address || selectedOrder.customers?.address || selectedOrder.customer?.address) && (
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">
                                        Delivery / Customer Address
                                    </p>
                                    <p className="text-sm font-medium leading-relaxed">
                                        {selectedOrder.delivery_address || selectedOrder.customers?.address || selectedOrder.customer?.address}
                                    </p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Order Items</p>
                                <div className="border rounded-lg p-4 space-y-2 bg-white">
                                    {selectedOrder.order_items?.map((item: any, index: number) => (
                                        <div key={index} className="flex justify-between">
                                            <span>{item.item_name} x {item.quantity}</span>
                                            <span className="font-semibold">₹{item.total.toFixed(2)}</span>
                                        </div>
                                    )) || <p className="text-muted-foreground">No items</p>}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <span className="font-semibold">Total Amount</span>
                                <span className="text-2xl font-bold text-primary">
                                    ₹{selectedOrder.total.toFixed(2)}
                                </span>
                            </div>



                            {/* Payment Actions */}
                            <div className="flex gap-3 mt-6 pt-4 border-t">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handlePayment('cash')}
                                    disabled={processingPayment || selectedOrder.payment_status === 'paid'}
                                >
                                    {processingPayment ? 'Processing...' : 'Cash Paid 💵'}
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => handlePayment('upi')}
                                    disabled={processingPayment || selectedOrder.payment_status === 'paid'}
                                >
                                    {processingPayment ? 'Processing...' : 'UPI Paid 📱'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    )
}
