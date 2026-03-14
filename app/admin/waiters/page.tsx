'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { Users, Clock, ShoppingBag, TrendingUp, History, UserCheck, Search, Eye, Phone, MapPin, ReceiptText } from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

interface StaffStats {
    id: string
    name: string
    last_login_at: string | null
    order_count: number
    total_revenue: number
    status: boolean
}

export default function WaitersAdminPage() {
    const [loading, setLoading] = useState(true)
    const [staffStats, setStaffStats] = useState<StaffStats[]>([])
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedWaiter, setSelectedWaiter] = useState<string | 'all'>('all')
    const [inspectOrder, setInspectOrder] = useState<any>(null)

    // Helper to robustly parse dates from UTC to Local
    const parseDate = (dateString: string) => {
        if (!dateString) return new Date()
        if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
            return new Date(dateString + 'Z')
        }
        return new Date(dateString)
    }

    useEffect(() => {
        fetchWaiterData()
        
        // Subscribe to changes
        const channel = supabase.channel('waiter-admin-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchWaiterData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchWaiterData)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function fetchWaiterData() {
        try {
            setLoading(true)
            
            // 1. Fetch Staff members
            const { data: staffData } = await supabase
                .from('staff')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('name')

            // 2. Fetch Orders with Waiter IDs, Customers, and Items
            const { data: ordersData } = await supabase
                .from('orders')
                .select('*, restaurant_tables(table_number), customers(*), order_items(*)')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })

            if (staffData && ordersData) {
                // Ensure only unique staff IDs are processed
                const uniqueStaff = Array.from(new Map(staffData.map(s => [s.id, s])).values())

                const stats = uniqueStaff.map(member => {
                    // Find all items handled by this waiter across all orders
                    let memberTotalRevenue = 0
                    let memberHandledOrders = new Set()

                    ordersData.forEach(order => {
                        const itemsByThisWaiter = order.order_items?.filter((item: any) => item.waiter_id === member.id) || []
                        if (itemsByThisWaiter.length > 0) {
                            memberHandledOrders.add(order.id)
                            memberTotalRevenue += itemsByThisWaiter.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
                        }
                    })

                    return {
                        id: member.id,
                        name: member.name,
                        last_login_at: member.last_login_at,
                        order_count: memberHandledOrders.size,
                        total_revenue: memberTotalRevenue,
                        status: member.status
                    }
                })
                setStaffStats(stats)
            }

            setRecentOrders(ordersData || [])
        } catch (error) {
            console.error('Error fetching waiter stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredStaff = staffStats.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const displayOrders = recentOrders.filter(o => {
        if (selectedWaiter === 'all') return true
        return o.order_items?.some((item: any) => item.waiter_id === selectedWaiter)
    }).slice(0, 50)

    // Calculate contribution for a specific order by selected waiter
    const getContribution = (order: any) => {
        if (selectedWaiter === 'all') return order.total || 0
        return order.order_items
            ?.filter((i: any) => i.waiter_id === selectedWaiter)
            .reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0
    }

    const totalOrdersToday = recentOrders.filter(o => {
        const today = new Date().toISOString().split('T')[0]
        return o.created_at.startsWith(today)
    }).length

    const onlineCount = staffStats.filter(s => {
        if (!s.last_login_at) return false
        const lastLogin = new Date(s.last_login_at).getTime()
        const now = new Date().getTime()
        return (now - lastLogin) < (1000 * 60 * 60 * 4) // Logged in within last 4 hours
    }).length

    if (loading && staffStats.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            <PageHeader 
                title="Waiter Management" 
                description="Track staff attendance, performance, and live order activities"
            />

            {/* Metrics Row */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Total Staff</CardDescription>
                        <CardTitle className="text-3xl font-black flex items-center justify-between">
                            {staffStats.length}
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <Users className="h-5 w-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Active Today</CardDescription>
                        <CardTitle className="text-3xl font-black flex items-center justify-between">
                            {onlineCount}
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <UserCheck className="h-5 w-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Waiter Orders</CardDescription>
                        <CardTitle className="text-3xl font-black flex items-center justify-between">
                            {totalOrdersToday}
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Efficiency</CardDescription>
                        <CardTitle className="text-3xl font-black flex items-center justify-between">
                            {staffStats.length > 0 ? (totalOrdersToday / (onlineCount || 1)).toFixed(1) : 0}
                            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Staff List */}
                <Card className="lg:col-span-1 glass-panel border-0 shadow-xl overflow-hidden min-h-[600px]">
                    <CardHeader className="border-b border-gray-100 bg-white/50 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-black">Staff Performance</CardTitle>
                        </div>
                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search waiter..." 
                                className="pl-9 h-10 bg-secondary/50 border-0 rounded-xl text-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100 h-[500px] overflow-y-auto no-scrollbar">
                            <button 
                                onClick={() => setSelectedWaiter('all')}
                                className={cn(
                                    "w-full p-4 flex items-center gap-4 transition-all text-left",
                                    selectedWaiter === 'all' ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-gray-50 border-l-4 border-transparent"
                                )}
                            >
                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">All Waiters</p>
                                    <p className="text-xs text-muted-foreground">Showing global logs</p>
                                </div>
                            </button>
                            {filteredStaff.map(waiter => (
                                <button
                                    key={waiter.id}
                                    onClick={() => setSelectedWaiter(waiter.id)}
                                    className={cn(
                                        "w-full p-4 flex items-center gap-4 transition-all text-left",
                                        selectedWaiter === waiter.id ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-gray-50 border-l-4 border-transparent"
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {waiter.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                                <p className="font-bold text-sm text-gray-900">{waiter.name}</p>
                                            <Badge variant="outline" className="text-[10px] h-5 rounded-full px-2 bg-white">
                                                {waiter.order_count} Orders
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                                {waiter.last_login_at ? format(parseDate(waiter.last_login_at), 'hh:mm a, dd MMM') : 'Never Logged In'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Orders Log */}
                <Card className="lg:col-span-2 glass-panel border-0 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-gray-100 bg-white/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <History className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black">Orders Activity Log</CardTitle>
                                    <CardDescription>Recent orders handled by staff</CardDescription>
                                </div>
                            </div>
                            <Badge className="bg-orange-500 text-white border-0 font-bold uppercase tracking-wider text-[10px] px-3 py-1">
                                {selectedWaiter === 'all' ? 'All Activity' : 'Staff Filtered'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Bill ID</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Customer</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Waiters</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">
                                            {selectedWaiter === 'all' ? 'Total Bill' : 'Contribution'}
                                        </th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayOrders.length > 0 ? displayOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="p-4">
                                                <p className="font-bold text-sm text-gray-900">{order.bill_id}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{format(parseDate(order.created_at), 'hh:mm a')}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-sm text-gray-900 truncate max-w-[120px]">
                                                    {order.customers?.name || 'Walk-in'}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.from(new Set(order.order_items?.map((i: any) => i.waiter_name).filter(Boolean))).length > 0 ? (
                                                        Array.from(new Set(order.order_items?.map((i: any) => i.waiter_name).filter(Boolean))).map((name: any, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-[9px] border-primary/20 text-primary font-black bg-primary/5 px-1.5 h-5">
                                                                {name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-400 font-bold bg-gray-50 px-1.5 h-5">
                                                            Guest/QR
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="secondary" className="font-black text-[11px] rounded-lg bg-gray-100 mb-1">
                                                    T-{order.restaurant_tables?.table_number || 'N/A'}
                                                </Badge>
                                                <p className="font-black text-gray-900">₹{getContribution(order)?.toFixed(2)}</p>
                                                {selectedWaiter !== 'all' && (
                                                    <p className="text-[10px] text-gray-400 font-medium">Out of ₹{order.total?.toFixed(2)}</p>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all"
                                                    onClick={() => setInspectOrder(order)}
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <History className="h-10 w-10 text-gray-200" />
                                                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No orders found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Order Details Dialog */}
            <Dialog open={!!inspectOrder} onOpenChange={() => setInspectOrder(null)}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-2xl overflow-hidden p-0">
                    {inspectOrder && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-primary p-6 text-white relative">
                                <div className="flex items-center justify-between mb-2 pr-8">
                                    <Badge className="bg-white/20 text-white border-0 font-bold text-[10px] uppercase">
                                        {inspectOrder.bill_id}
                                    </Badge>
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                                        {format(parseDate(inspectOrder.created_at), 'dd MMM yyyy')}
                                    </p>
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight">Order Insight</DialogTitle>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Customer Info */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</p>
                                    <div className="bg-gray-50 rounded-2xl p-4 flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-primary shadow-sm">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900">{inspectOrder.customers?.name || 'Walk-in Customer'}</p>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1 text-xs text-gray-500 font-bold">
                                                    <Phone className="h-3 w-3" />
                                                    {inspectOrder.customers?.phone || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 font-bold">
                                                    <ReceiptText className="h-3 w-3" />
                                                    Table {inspectOrder.restaurant_tables?.table_number || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Grouped Order Items */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Breakdown</p>
                                        <Badge variant="outline" className="text-[10px] rounded-full px-2 font-bold border-gray-200">
                                            {inspectOrder.order_items?.length || 0} Total Items
                                        </Badge>
                                    </div>
                                    
                                    <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-4">
                                        {Object.entries(
                                            inspectOrder.order_items?.reduce((acc: any, item: any) => {
                                                const wName = item.waiter_name || 'Guest/System'
                                                if (!acc[wName]) acc[wName] = []
                                                acc[wName].push(item)
                                                return acc
                                            }, {}) || {}
                                        ).map(([waiter, items]: [string, any]) => (
                                            <div key={waiter} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                <div className="flex items-center justify-between mb-3 border-b border-gray-200/50 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                                            {waiter[0]}
                                                        </div>
                                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{waiter}</p>
                                                    </div>
                                                    <p className="text-xs font-black text-primary">
                                                        ₹{items.reduce((sum: number, i: any) => sum + (i.total || 0), 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    {items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-5 w-5 rounded bg-white border border-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
                                                                    {item.quantity}
                                                                </div>
                                                                <p className="text-[13px] font-medium text-gray-600">{item.item_name}</p>
                                                            </div>
                                                            <p className="text-[13px] font-bold text-gray-800">₹{item.total?.toFixed(2)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
                                        <p className="text-3xl font-black text-gray-900 tracking-tighter">₹{inspectOrder.total?.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                        <Badge className={cn(
                                            "font-black text-[10px] uppercase px-3 py-1 rounded-full",
                                            inspectOrder.status === 'completed' ? "bg-green-500 text-white" : "bg-primary text-white"
                                        )}>
                                            {inspectOrder.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
