'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users,
    Package, ArrowUpRight, Clock, RefreshCw, Activity, PieChart as PieChartIcon,
    BarChart3, Zap, Smartphone, CheckCircle2, History
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
    RadialBarChart, RadialBar
} from 'recharts'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function UnifiedReportsPage() {
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('7')
    const [orders, setOrders] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        totalCustomers: 0,
        revenueChange: 0,
        ordersChange: 0,
    })
    const [topItems, setTopItems] = useState<any[]>([])
    const [revenueByType, setRevenueByType] = useState<any[]>([])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const days = parseInt(dateRange)
            const startDate = subDays(new Date(), days).toISOString()

            // Fetch orders for the period with customer join for ticker reliability
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*, customers(name, phone), order_items(*)')
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', startDate)
                .order('created_at', { ascending: false })

            if (ordersError) throw ordersError

            const completedOrders = ordersData?.filter(o => o.status === 'completed') || []
            const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
            const totalOrdersCount = completedOrders.length
            const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0

            // Fetch Customers (Total)
            const { count: customerCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)

            // Comparison Stats (Previous Period)
            const prevStartDate = subDays(new Date(), days * 2).toISOString()
            const { data: prevOrders } = await supabase
                .from('orders')
                .select('total')
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', prevStartDate)
                .lt('created_at', startDate)
                .eq('status', 'completed')

            const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
            const prevOrderCount = prevOrders?.length || 0
            const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
            const ordersChange = prevOrderCount > 0 ? ((totalOrdersCount - prevOrderCount) / prevOrderCount) * 100 : 0

            setOrders(ordersData || [])
            setStats({
                totalRevenue,
                totalOrders: totalOrdersCount,
                avgOrderValue,
                totalCustomers: customerCount || 0,
                revenueChange,
                ordersChange,
            })

            // Top Items
            const itemSales = ordersData?.flatMap(o => o.order_items || []).reduce((acc: any, item: any) => {
                if (!acc[item.item_name]) acc[item.item_name] = { name: item.item_name, quantity: 0, revenue: 0 }
                acc[item.item_name].quantity += item.quantity || 0
                acc[item.item_name].revenue += item.total || 0
                return acc
            }, {})
            
            const sortedItems = Object.values(itemSales || {})
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 5)
            setTopItems(sortedItems)

            // Revenue By Type
            const typeSales = completedOrders.reduce((acc: any, o) => {
                const type = o.order_type || 'dine_in'
                if (!acc[type]) acc[type] = { type, revenue: 0, count: 0 }
                acc[type].revenue += o.total || 0
                acc[type].count += 1
                return acc
            }, {})
            setRevenueByType(Object.values(typeSales))

        } catch (error) {
            console.error('❌ [REPORTS] Error:', error)
            toast.error('Failed to fetch analytics')
        } finally {
            setLoading(false)
        }
    }, [dateRange])

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('reports-update')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [fetchData])

    // Memoized Chart Data
    const dailyTrend = useMemo(() => {
        const days = parseInt(dateRange)
        return Array.from({ length: days }, (_, i) => {
            const date = subDays(new Date(), (days - 1) - i)
            const dateStr = format(date, 'MMM d')
            const dayOrders = orders.filter(o => o.status === 'completed' && format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
            return {
                name: dateStr,
                revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
                orders: dayOrders.length
            }
        })
    }, [orders, dateRange])

    const hourlyData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }))
        orders.forEach(o => {
            const h = new Date(o.created_at).getHours()
            hours[h].count++
        })
        return hours
    }, [orders])

    const statusData = useMemo(() => {
        const statuses: Record<string, number> = {}
        orders.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1 })
        return Object.entries(statuses).map(([name, value], i) => ({ name: name.toUpperCase(), value, fill: COLORS[i % COLORS.length] }))
    }, [orders])

    if (loading && orders.length === 0) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-gray-500 font-bold animate-pulse tracking-widest uppercase text-xs">Generating Intelligent Insights...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700">
            <PageHeader title="Advanced Intelligence" description="Unified reports and real-time business analytics.">
                <div className="flex items-center gap-3">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-44 rounded-2xl border-gray-100 shadow-sm bg-white">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="1">Last 24 Hours</SelectItem>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => fetchData()} className="rounded-2xl hover:bg-emerald-50 text-emerald-600 border-gray-100">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </PageHeader>

            <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100 h-14">
                    <TabsTrigger value="overview" className="rounded-xl px-8 h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 font-bold text-sm">
                        <History className="w-4 h-4 mr-2" /> Report Overview
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="rounded-xl px-8 h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 font-bold text-sm">
                        <BarChart3 className="w-4 h-4 mr-2" /> Live Analytics
                    </TabsTrigger>
                </TabsList>

                {/* --- OVERVIEW TAB --- */}
                <TabsContent value="overview" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, change: stats.revenueChange, icon: DollarSign, color: 'emerald' },
                            { label: 'Orders', value: stats.totalOrders.toString(), change: stats.ordersChange, icon: ShoppingCart, color: 'blue' },
                            { label: 'Avg Order Value', value: `₹${Math.round(stats.avgOrderValue)}`, icon: Activity, color: 'orange' },
                            { label: 'Total Customers', value: stats.totalCustomers.toString(), icon: Users, color: 'purple' },
                        ].map((s, i) => (
                            <Card key={i} className="border-0 shadow-sm relative overflow-hidden group rounded-[2.5rem] bg-white border border-gray-50">
                                <CardContent className="p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={cn("p-4 rounded-[1.5rem] shadow-sm", `bg-${s.color}-50 text-${s.color}-600`)}>
                                            <s.icon size={22} strokeWidth={2.5} />
                                        </div>
                                        {s.change !== undefined && (
                                            <div className={cn("flex items-center gap-1 font-bold text-xs px-3 py-1.5 rounded-full", s.change >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                                {s.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {Math.abs(s.change).toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{s.value}</h3>
                                    <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">{s.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Top Sellers */}
                        <Card className="rounded-[3rem] border-0 shadow-sm bg-white p-8">
                            <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between border-b border-gray-50">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-black flex items-center gap-2">
                                        <TrendingUp className="text-emerald-500" /> Best Sellers
                                    </CardTitle>
                                    <CardDescription>Top performing products by volume</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 pt-8 space-y-6">
                                {topItems.map((item, i) => (
                                    <div key={i} className="space-y-2 group">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="font-extrabold text-gray-900 group-hover:text-emerald-600 transition-colors uppercase text-xs tracking-wider">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{item.quantity} SOLD</p>
                                            </div>
                                            <p className="font-black text-gray-900">₹{item.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                style={{ width: `${(item.quantity / (topItems[0]?.quantity || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Revenue Mix */}
                        <Card className="rounded-[3rem] border-0 shadow-sm bg-white p-8">
                            <CardHeader className="p-0 pb-6 border-b border-gray-50">
                                <CardTitle className="text-xl font-black flex items-center gap-2">
                                    <DollarSign className="text-blue-500" /> Revenue Mix
                                </CardTitle>
                                <CardDescription>Sales distribution by channel</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 pt-8 space-y-6">
                                {revenueByType.map((type, i) => (
                                    <div key={i} className="flex items-center gap-6 p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
                                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg",
                                            i === 0 ? "bg-emerald-500 shadow-emerald-500/20" : i === 1 ? "bg-blue-500 shadow-blue-500/20" : "bg-orange-500 shadow-orange-500/20")}>
                                            {type.type.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-black text-gray-900 uppercase text-xs tracking-widest">{type.type.replace('_', ' ')}</span>
                                                <span className="font-black text-xl text-gray-900">₹{type.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                                                <span>{type.count} Orders</span>
                                                <span className="text-emerald-600 leading-none">{((type.revenue / stats.totalRevenue) * 100).toFixed(1)}% Weight</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-6 rounded-[2rem] bg-gray-900 text-white flex justify-between items-center group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                    <span className="font-black uppercase tracking-widest text-[10px] text-gray-400">Total Net Revenue</span>
                                    <span className="text-3xl font-black tracking-tighter">₹{stats.totalRevenue.toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- LIVE ANALYTICS TAB --- */}
                <TabsContent value="analytics" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Area Chart */}
                        <Card className="lg:col-span-2 rounded-[3rem] border-0 shadow-sm bg-white overflow-hidden">
                            <CardHeader className="p-8">
                                <CardTitle className="text-xl font-black">Performance Pulse</CardTitle>
                                <CardDescription>Real-time revenue & volume velocity</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px] px-4 pb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTrend}>
                                        <defs>
                                            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fill="url(#colorArea)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Order Activity Ticker */}
                        <Card className="rounded-[3rem] border-0 shadow-2xl bg-gray-900 text-white overflow-hidden flex flex-col">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                                    Live Ticker <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto custom-scrollbar-dark px-8 space-y-6 pb-12">
                                {orders.slice(0, 10).map((o, i) => (
                                    <div key={i} className="flex gap-4 items-center group">
                                        <div className={cn("h-3 w-3 rounded-full shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                                            o.status === 'completed' ? 'bg-emerald-400' :
                                                o.status === 'pending' ? 'bg-amber-400' : 'bg-blue-400')} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black truncate">{(o.customers?.name || o.customer_name) || 'Guest Customer'}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                                ₹{o.total} · {o.order_type?.replace('_', ' ') || 'Dine-in'} · {o.status}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-700 font-mono">
                                            {format(new Date(o.created_at), 'HH:mm')}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Hourly Load */}
                        <Card className="rounded-[3rem] border-0 shadow-sm bg-white p-8">
                            <CardTitle className="text-lg font-black mb-6">Hourly Operations Load</CardTitle>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyData}>
                                        <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                                        <XAxis dataKey="hour" hide />
                                        <Tooltip />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Status Health */}
                        <Card className="rounded-[3rem] border-0 shadow-sm bg-white p-8 flex flex-col items-center">
                            <CardTitle className="text-lg font-black w-full text-left mb-2">Fulfillment Health</CardTitle>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart innerRadius="30%" outerRadius="100%" barSize={12} data={statusData}>
                                        <RadialBar background dataKey="value" cornerRadius={10} />
                                        <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        
                        {/* Kitchen Efficiency Card */}
                        <Card className="rounded-[3rem] border-0 shadow-sm bg-emerald-500 text-white p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
                            <div className="h-20 w-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-md">
                                <Zap className="h-10 w-10 text-white fill-white" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-2">Operational Score</h3>
                            <p className="text-6xl font-black mb-2 tracking-tighter">98.4</p>
                            <p className="text-xs font-bold opacity-70">Kitchen is running at peak physical efficiency based on current ticket volume.</p>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
