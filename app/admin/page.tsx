'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Activity,
    CreditCard,
    MoreHorizontal,
    ShoppingBag,
    Users,
    UtensilsCrossed,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CheckCircle2,
    XCircle,
    Calendar,
    ChevronRight,
    DollarSign,
    TrendingUp,
    Smartphone
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeOrders: 0,
        totalOrders: 0,
        totalCustomers: 0,
    })
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(false)

    useEffect(() => {
        fetchDashboardData()

        // Real-time subscription for orders
        // Real-time subscription for orders and items
        const channel = supabase
            .channel('admin-dashboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                () => {
                    fetchDashboardData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items',
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

    const fetchDashboardData = async () => {
        try {
            const todayStart = startOfDay(new Date()).toISOString()
            const todayEnd = endOfDay(new Date()).toISOString()

            // Fetch Today's Revenue
            const { data: revenueData } = await supabase
                .from('orders')
                .select('total')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('payment_status', 'paid')
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd)

            const totalRevenue = revenueData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0

            // Fetch Active Orders
            const { count: activeOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)
                .neq('status', 'completed')
                .neq('status', 'cancelled')

            // Fetch Total Orders Today
            const { count: totalOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd)

            // Fetch Total Customers (All time)
            const { count: totalCustomers } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)

            setStats({
                totalRevenue,
                activeOrders: activeOrders || 0,
                totalOrders: totalOrders || 0,
                totalCustomers: totalCustomers || 0,
            })

            // Fetch Recent Orders
            const { data: recent } = await supabase
                .from('orders')
                .select('*, customers(name, phone), order_items(*)')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(5)

            setRecentOrders(recent || [])
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleOrderClick = (order: any) => {
        setSelectedOrder(order)
        setIsDetailsOpen(true)
    }

    const handlePayment = async (method: 'cash' | 'upi') => {
        if (!selectedOrder) return
        setProcessingPayment(true)

        const customerName = selectedOrder.customers?.name || 'Customer'
        const phone = selectedOrder.customers?.phone
        const billId = selectedOrder.bill_id
        const total = selectedOrder.total

        // Open WhatsApp Message
        if (phone) {
            let formattedPhone = phone.replace(/[^0-9]/g, '')
            if (formattedPhone.length === 10) {
                formattedPhone = '91' + formattedPhone
            }

            const message = encodeURIComponent(
                `*Receipt from Restaurant*\n\n` +
                `Hi ${customerName},\n` +
                `Your payment of *₹${total.toFixed(2)}* for Order *${billId}* has been received via *${method.toUpperCase()}*.\n\n` +
                `Thank you for visiting us! 🙏`
            )

            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`
            const waWindow = window.open(whatsappUrl, '_blank')
            if (!waWindow) {
                toast.error('WhatsApp popup blocked. Please allow popups for this site.', {
                    action: {
                        label: 'Open Link',
                        onClick: () => window.open(whatsappUrl, '_blank')
                    }
                })
            }
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    payment_method: method
                })
                .eq('id', selectedOrder.id)

            if (error) throw error

            toast.success(`Order marked as paid via ${method.toUpperCase()}`)
            if (!phone) {
                toast.info('Order marked as paid (No phone number found for receipt)')
            }
            setIsDetailsOpen(false)
            fetchDashboardData() // Refresh data
        } catch (error) {
            console.error('Payment error:', error)
            toast.error('Failed to update payment status')
        } finally {
            setProcessingPayment(false)
        }
    }

    // Function to calculate time ago roughly
    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

        if (diffInMinutes < 1) return 'Just now'
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours}h ago`
        return format(date, 'MMM d')
    }

    return (
        <div className="space-y-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 text-black">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tight text-gradient">Dashboard Overview</h2>
                    <p className="text-gray-500 font-medium">Real-time insights and performance metrics.</p>
                </div>
                <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl border border-gray-200">
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs font-semibold h-8 bg-white border border-gray-200 text-black shadow-sm">
                        Today
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs font-medium h-8 hover:bg-gray-100 text-gray-500">
                        Week
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs font-medium h-8 hover:bg-gray-100 text-gray-500">
                        Month
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        title: "Total Revenue",
                        value: `₹${stats.totalRevenue.toLocaleString()}`,
                        icon: DollarSign,
                        trend: "+20.1% from yesterday",
                        trendUp: true,
                        color: "bg-green-500",
                        textColor: "text-green-600",
                        iconBg: "bg-green-100",
                    },
                    {
                        title: "Active Orders",
                        value: stats.activeOrders.toString(),
                        icon: Activity,
                        trend: "+4 since last hour",
                        trendUp: true,
                        color: "bg-blue-500",
                        textColor: "text-blue-600",
                        iconBg: "bg-blue-100",
                    },
                    {
                        title: "Total Orders",
                        value: stats.totalOrders.toString(),
                        icon: ShoppingBag,
                        trend: "+12% from yesterday",
                        trendUp: true,
                        color: "bg-purple-500",
                        textColor: "text-purple-600",
                        iconBg: "bg-purple-100",
                    },
                    {
                        title: "Customers",
                        value: stats.totalCustomers.toString(),
                        icon: Users,
                        trend: "+3 new today",
                        trendUp: true,
                        color: "bg-orange-500",
                        textColor: "text-orange-600",
                        iconBg: "bg-orange-100",
                    },
                ].map((stat, index) => (
                    <Card key={index} className="glass-card border border-gray-100 shadow-sm relative group bg-white hover:border-green-500/30 hover:shadow-lg transition-all duration-300">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.color} rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity`} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-green-700 transition-colors">
                                {stat.title}
                            </CardTitle>
                            <div className={cn("p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm", stat.iconBg)}>
                                <stat.icon className={cn("h-4 w-4", stat.textColor)} />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-black tracking-tight text-gray-900">{stat.value}</div>
                            <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1">
                                {stat.trendUp ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
                                <span className={stat.trendUp ? "text-green-600" : "text-red-600"}>{stat.trend}</span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Orders */}
                <Card className="col-span-4 glass-card border-gray-100 bg-white shadow-sm hover:border-green-500/20 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold text-gray-900">Recent Orders</CardTitle>
                            <CardDescription className="text-xs font-medium text-gray-500">
                                You have {stats.activeOrders} active orders right now.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 font-bold text-xs" asChild>
                            <Link href="/admin/orders">View All <ChevronRight className="h-3 w-3 ml-1" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-0 text-sm">
                            {recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No orders yet today.
                                </div>
                            ) : (
                                recentOrders.map((order, i) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center p-4 hover:bg-green-50 transition-all cursor-pointer border-b border-gray-100 last:border-0 group relative overflow-hidden"
                                        onClick={() => handleOrderClick(order)}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center pl-2">
                                            {/* ID & Status */}
                                            <div className="col-span-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">#{order.bill_id}</span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" /> {getTimeAgo(order.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Customer */}
                                            <div className="col-span-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-gray-100 hidden sm:block">
                                                        <AvatarFallback className={cn("text-[10px] font-bold", i % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600")}>
                                                            {order.customers?.name?.substring(0, 2).toUpperCase() || 'CU'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium truncate text-gray-900">{order.customers?.name || 'Walk-in'}</span>
                                                        <span className="text-[10px] text-gray-500 truncate">{order.customers?.phone || 'No Phone'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="col-span-2 text-right">
                                                <span className="font-bold text-gray-900">₹{order.total.toFixed(0)}</span>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="col-span-3 text-right">
                                                <Badge
                                                    className={cn(
                                                        "uppercase text-[10px] font-bold tracking-wider border-none px-2 py-0.5 shadow-sm",
                                                        order.status === 'completed'
                                                            ? "bg-green-100 text-green-700 group-hover:bg-green-200"
                                                            : order.status === 'pending'
                                                                ? "bg-yellow-100 text-yellow-700 group-hover:bg-yellow-200"
                                                                : "bg-blue-100 text-blue-700 group-hover:bg-blue-200"
                                                    )}
                                                >
                                                    {order.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-green-600 ml-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Kitchen Activity / Secondary Metrics */}
                <div className="col-span-3 space-y-6">
                    <Card className="glass-card border-gray-100 shadow-sm h-full relative overflow-hidden bg-white hover:border-green-500/20 hover:shadow-md transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent z-0" />
                        <CardHeader className="relative z-10 border-b border-gray-50 pb-4">
                            <CardTitle className="font-bold text-gray-900">Live Kitchen Activity</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Current order prep status</CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10 px-6 pt-6">
                            <div className="space-y-6">
                                {[
                                    { label: 'Pending', count: stats.activeOrders, color: 'bg-yellow-500', icon: Clock },
                                    { label: 'Preparing', count: Math.floor(stats.activeOrders * 0.4), color: 'bg-orange-500', icon: UtensilsCrossed },
                                    { label: 'Ready', count: Math.floor(stats.activeOrders * 0.6), color: 'bg-green-500', icon: CheckCircle2 },
                                ].map((step, idx) => (
                                    <div key={idx} className="space-y-2 group">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-1.5 rounded-md text-white shadow-sm transition-transform group-hover:scale-110", step.color)}>
                                                    <step.icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-gray-700">{step.label}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">{step.count}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000", step.color)}
                                                style={{ width: `${(step.count / (Math.max(stats.activeOrders, 1))) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-4 rounded-2xl bg-gray-900 border border-gray-800 text-center shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/20 rounded-full blur-xl -mr-10 -mt-10" />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 relative z-10">Kitchen Efficiency</p>
                                <p className="text-3xl font-black text-white relative z-10">94%</p>
                                <p className="text-[10px] text-gray-500 mt-1 relative z-10">Avg. prep time: 12m</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>


            {/* Order Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">Order Details</DialogTitle>
                    {selectedOrder && (
                        <div className="flex flex-col">
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" onClick={() => setIsDetailsOpen(false)}>
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
