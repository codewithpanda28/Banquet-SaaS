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
    BarChart3, Zap, Smartphone, CheckCircle2, History, Crown, Target, Send
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
import { Badge } from '@/components/ui/badge'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function UnifiedReportsPage() {
    const [loading, setLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [dateRange, setDateRange] = useState('7')
    const [orders, setOrders] = useState<any[]>([])
    const [restaurant, setRestaurant] = useState<any>(null)
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

            // Fetch Restaurant Info (for WhatsApp number)
            const { data: restro } = await supabase.from('restaurants').select('*').eq('id', RESTAURANT_ID).single()
            setRestaurant(restro)

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

            const { count: customerCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)

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

            const typeSales = completedOrders.reduce((acc: any, o) => {
                const type = o.order_type || 'dine_in'
                if (!acc[type]) acc[type] = { type, revenue: 0, count: 0 }
                acc[type].revenue += o.total || 0
                acc[type].count += 1
                return acc
            }, {})
            setRevenueByType(Object.values(typeSales))

        } catch (error) {
            toast.error('Failed to fetch analytics')
        } finally {
            setLoading(false)
        }
    }, [dateRange])

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('reports-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [fetchData])

    const handleSendReport = async () => {
        if (!restaurant?.report_whatsapp_number) {
            toast.error("Please add a 'Report WhatsApp Number' in Super Admin first!");
            return;
        }

        try {
            setIsSending(true);
            const response = await fetch('/api/webhook/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_report',
                    restaurant_id: RESTAURANT_ID,
                    restaurant_name: restaurant.name,
                    phone: restaurant.report_whatsapp_number,
                    report_data: {
                        date_range: `${dateRange} Days`,
                        revenue: stats.totalRevenue,
                        orders: stats.totalOrders,
                        avg_ticket: Math.round(stats.avgOrderValue),
                        customers: stats.totalCustomers,
                        top_items: topItems.map(i => `${i.name} (${i.quantity} units)`).join(', ')
                    },
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                toast.success(`Strategic report dispatched to ${restaurant.report_whatsapp_number}`);
            } else {
                throw new Error('Signal failed');
            }
        } catch (error) {
            toast.error('Failed to dispatch report trigger');
        } finally {
            setIsSending(false);
        }
    };

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
        return Object.entries(statuses).map(([name, value]) => ({ 
            name: name.toUpperCase(), 
            value, 
            fill: name === 'completed' ? '#10b981' : name === 'cancelled' ? '#ef4444' : '#6366f1' 
        }))
    }, [orders])

    if (loading && orders.length === 0) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader title="Advanced Intelligence" description="Unified reports and real-time business analytics.">
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={handleSendReport} 
                        disabled={isSending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        Send Report (WA)
                    </Button>
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-40 rounded-xl border-gray-100 bg-white">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="1">Last 24 Hours</SelectItem>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => fetchData()} className="rounded-xl border-gray-100 hover:text-emerald-600">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </PageHeader>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-gray-100/50 p-1 rounded-2xl border border-gray-200 h-12 inline-flex">
                    <TabsTrigger value="overview" className="rounded-xl px-6 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 font-bold text-sm flex items-center gap-2 transition-all">
                        <History size={16} /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="rounded-xl px-6 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 font-bold text-sm flex items-center gap-2 transition-all">
                        <BarChart3 size={16} /> Live Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, change: stats.revenueChange, icon: DollarSign, color: 'emerald' },
                            { label: 'Orders', value: stats.totalOrders.toString(), change: stats.ordersChange, icon: ShoppingCart, color: 'blue' },
                            { label: 'Avg Order Value', value: `₹${Math.round(stats.avgOrderValue)}`, icon: Activity, color: 'orange' },
                            { label: 'Total Customers', value: stats.totalCustomers.toString(), icon: Users, color: 'purple' },
                        ].map((s, i) => (
                            <Card key={i} className="border-0 shadow-sm rounded-3xl bg-white border border-gray-50 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("p-3 rounded-2xl shadow-sm", `bg-${s.color}-50 text-${s.color}-600`)}>
                                            <s.icon size={20} />
                                        </div>
                                        {s.change !== undefined && (
                                            <Badge variant="secondary" className={cn("font-bold text-[10px]", s.change >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
                                                {s.change >= 0 ? '+' : ''}{s.change.toFixed(1)}%
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">{s.value}</h3>
                                    <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">{s.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="rounded-3xl border-0 shadow-sm bg-white p-6">
                             <div className="flex justify-between items-center mb-6">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Crown className="text-amber-500 h-5 w-5" /> Best Sellers
                                </CardTitle>
                                <Badge className="bg-gray-100 text-gray-600 border-0 font-bold uppercase text-[9px]">Top performing</Badge>
                            </div>
                            <div className="space-y-6">
                                {topItems.map((item, i) => (
                                    <div key={i} className="space-y-2 group">
                                        <div className="flex justify-between items-end">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors uppercase text-[11px] tracking-tight">{item.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold">{item.quantity} SOLD</p>
                                            </div>
                                            <p className="font-bold text-gray-900">₹{item.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${(item.quantity / (topItems[0]?.quantity || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="rounded-3xl border-0 shadow-sm bg-white p-6">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 mb-6">
                                <DollarSign className="text-blue-500 h-5 w-5" /> Revenue Mix
                            </CardTitle>
                            <div className="space-y-4">
                                {revenueByType.map((type, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm",
                                            i === 0 ? "bg-emerald-500" : i === 1 ? "bg-blue-500" : "bg-orange-500")}>
                                            {type.type.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-gray-900 uppercase text-[10px] tracking-widest">{type.type.replace('_', ' ')}</span>
                                                <span className="font-bold text-lg text-gray-900">₹{type.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-gray-400">
                                                <span>{type.count} Orders</span>
                                                <span className="text-emerald-600 leading-none">{((type.revenue / stats.totalRevenue) * 100).toFixed(1)}% Weight</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 rounded-2xl bg-gray-900 text-white flex justify-between items-center">
                                    <span className="font-bold uppercase tracking-widest text-[9px] text-gray-400">Net Revenue</span>
                                    <span className="text-2xl font-bold tracking-tight">₹{stats.totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        
                        <Card className="lg:col-span-2 rounded-3xl border-0 shadow-sm bg-white overflow-hidden p-6 group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <CardTitle className="text-xl font-bold text-gray-900">Performance Pulse</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Revenue & Volume Trends</CardDescription>
                                </div>
                                <Activity className="text-emerald-500 h-5 w-5 opacity-40" />
                            </div>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTrend}>
                                        <defs>
                                            <linearGradient id="areaGradSubtle" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#areaGradSubtle)" animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="rounded-3xl border-0 shadow-sm bg-gray-900 text-white p-6 flex flex-col h-full">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 flex items-center justify-between mb-6">
                                Live Ticker <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            </CardTitle>
                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar-dark min-h-[250px] max-h-[300px]">
                                {orders.slice(0, 8).map((o, i) => (
                                    <div key={i} className="flex gap-3 items-center group">
                                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-bold",
                                            o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500')}>
                                            {format(new Date(o.created_at), 'HH:mm')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{(o.customers?.name || o.customer_name) || 'Guest User'}</p>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">₹{o.total} · {o.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="rounded-3xl border-0 shadow-sm bg-white p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <CardTitle className="text-lg font-bold">Hourly Operations Load</CardTitle>
                                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Order Cycle Heat-Map</CardDescription>
                                </div>
                                <Clock className="text-indigo-500 h-5 w-5 opacity-40" />
                            </div>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} hide />
                                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="rounded-3xl border-0 shadow-sm bg-white p-6 flex flex-col items-center">
                            <CardTitle className="text-lg font-bold w-full text-left mb-6">Fulfillment Health</CardTitle>
                            <div className="h-[200px] w-full relative">
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-2xl font-bold text-gray-900 leading-none">{orders.length}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">Total</p>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={8}
                                            dataKey="value"
                                            cornerRadius={10}
                                            stroke="none"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        
                        <Card className="rounded-3xl border-0 shadow-sm bg-emerald-500 text-white p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                            <Zap className="h-10 w-10 text-white/50 mb-4" />
                            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">Operational Score</h3>
                            <p className="text-5xl font-bold mb-2 tracking-tight">98.4</p>
                            <p className="text-[10px] font-bold opacity-70">Kitchen is running at peak physical efficiency.</p>
                            <Badge className="bg-white/20 text-white border-0 mt-6 font-bold uppercase text-[9px]">Peak.Live</Badge>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
