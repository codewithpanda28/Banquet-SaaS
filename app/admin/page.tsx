'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { DollarSign, ShoppingCart, TrendingUp, Clock, Download, Eye, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { DashboardMetrics, Order } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'

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

    async function fetchDashboardData() {
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

            // Debug logging
            if (recent && recent.length > 0) {
                console.log('===== ADMIN DASHBOARD DEBUG =====')
                console.log('First order:', recent[0])
                console.log('Customer data:', recent[0].customers)
                console.log('Customer keys:', recent[0].customers ? Object.keys(recent[0].customers) : 'no customer data')
            }
            if (recentError) {
                console.error('Error fetching recent orders:', recentError)
            }

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
    }

    async function handleViewDetails(orderId: string) {
        try {
            console.log('🔍 Fetching order details for:', orderId)

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

            console.log('📦 Order Details Response:')
            console.log('  - Data:', data)
            console.log('  - Error:', error)

            if (data) {
                console.log('👤 Customer Info:')
                console.log('  - customer_id:', data.customer_id)
                console.log('  - customers object:', data.customers)
                console.log('  - customers.name:', data.customers?.name)
                console.log('  - customers.phone:', data.customers?.phone)
                console.log('  - customers.address:', data.customers?.address)
                console.log('  - All customer keys:', data.customers ? Object.keys(data.customers) : 'NO CUSTOMER')
                console.log('  - All customer values:', data.customers ? Object.values(data.customers) : 'NO CUSTOMER')
            }

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
                    order.customers?.name || 'Walk-in',
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

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            confirmed: 'secondary',
            preparing: 'default',
            ready: 'default',
            served: 'secondary',
            completed: 'secondary',
            cancelled: 'destructive',
        }
        return (
            <Badge variant={variants[status] || 'outline'}>
                {status.toUpperCase()}
            </Badge>
        )
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                description="Overview of your restaurant"
            >
                <Button onClick={downloadReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                </Button>
            </PageHeader>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 ">
                <Card className="bg-white border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Today's Revenue
                                </p>
                                <p className="text-2xl font-bold">
                                    ₹{metrics.todayRevenue.toFixed(0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Today's Orders
                                </p>
                                <p className="text-2xl font-bold">{metrics.todayOrders}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <ShoppingCart className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Average Order Value
                                </p>
                                <p className="text-2xl font-bold">
                                    ₹{metrics.avgOrderValue.toFixed(0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Active Orders
                                </p>
                                <p className="text-2xl font-bold">{metrics.activeOrders}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders */}
            <Card className="bg-card  border-2 shadow-sm">
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentOrders.length === 0 ? (
                        <div className="flex h-40  items-center justify-center text-muted-foreground">
                            No orders yet
                        </div>
                    ) : (
                        <div className="space-y-4 bg-white">
                            {recentOrders.map((order: any) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 rounded-lg border-2 bg-muted/30"
                                >
                                    <div>
                                        <p className="font-semibold truncate max-w-[150px]">{order.bill_id}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {order.customers?.name || 'Walk-in'} • {order.order_type?.replace('_', ' ')}
                                            {order.restaurant_tables && ` • Table ${order.restaurant_tables.table_number}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold">₹{order.total.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(order.created_at), 'hh:mm a')}
                                            </p>
                                        </div>
                                        {getStatusBadge(order.status)}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewDetails(order.id)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                    <p className="font-bold text-lg">{selectedOrder.customers?.name || 'Walk-in'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Phone Number</p>
                                    <p className="font-bold text-lg">{selectedOrder.customers?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order Type</p>
                                    <p className="font-bold capitalize">{selectedOrder.order_type?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Order Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                                </div>
                            </div>

                            {(selectedOrder.delivery_address || selectedOrder.customers?.address || selectedOrder.customer?.address) && (
                                <div className="p-3 bg-muted/50 rounded-xl border border-dashed border-primary/20">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> Address
                                    </p>
                                    <p className="text-sm font-medium">
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
