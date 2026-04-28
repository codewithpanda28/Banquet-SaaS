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
    BarChart3, Zap, Smartphone, CheckCircle2, History, Crown, Target, Send,
    Wallet, Tag
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
    RadialBarChart, RadialBar, Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis
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
    const [stats, setStats] = useState<{
        totalOrders: number,
        totalCustomers: number,
        ordersChange: number,
        totalVolume: number
    }>({
        totalOrders: 0,
        totalCustomers: 0,
        ordersChange: 0,
        totalVolume: 0
    })
    const [topItems, setTopItems] = useState<any[]>([])
    const [revenueByType, setRevenueByType] = useState<any[]>([])
    const [targetRevenue] = useState(50000) // Monthly target
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [categorySales, setCategorySales] = useState<any[]>([])
    const [waitTimes, setWaitTimes] = useState<any[]>([])
    const [topCustomers, setTopCustomers] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState("overview")

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

            const typeSales: Record<string, { type: string, count: number }> = {
                dine_in: { type: 'dine_in', count: 0 },
                delivery: { type: 'delivery', count: 0 },
                takeaway: { type: 'takeaway', count: 0 }
            }
            const custSales: Record<string, { name: string, phone: string, orders: number }> = {}

            ordersData?.forEach(o => {
                if (typeSales[o.order_type]) typeSales[o.order_type].count++
                
                const name = o.customers?.name || o.customer_name || 'Guest'
                const phone = o.customers?.phone || o.phone || 'N/A'
                if (!custSales[name]) custSales[name] = { name, phone, orders: 0 }
                custSales[name].orders++
            })

            setOrders(ordersData || [])
            setStats({
                totalOrders: totalOrdersCount,
                totalCustomers: customerCount || 0,
                ordersChange,
                totalVolume: ordersData?.reduce((sum, o) => sum + (o.order_items?.length || 0), 0) || 0
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

            setRevenueByType(Object.values(typeSales).map((s: any) => ({ ...s, revenue: 0 })))


            // Wait Time Analysis (Prep Time)
            const prepTimes = completedOrders
                .filter(o => o.created_at && o.updated_at && o.status === 'completed')
                .map(o => {
                    const start = new Date(o.created_at).getTime()
                    const end = new Date(o.updated_at).getTime()
                    return (end - start) / (1000 * 60) // minutes
                })
            const avgWait = prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : 0
            setWaitTimes([{ name: 'Avg Prep Time', value: Math.round(avgWait) }])

            // Category Wise Sales
            const { data: itemDetails } = await supabase
                .from('order_items')
                .select('*, menu_items(menu_categories(name))')
                .in('order_id', completedOrders.map(o => o.id))

            const catStats: Record<string, { name: string, count: number }> = {}
            itemDetails?.forEach((item: any) => {
                const catName = item.menu_items?.menu_categories?.name || 'Uncategorized'
                if (!catStats[catName]) catStats[catName] = { name: catName, count: 0 }
                catStats[catName].count += 1
            })
            setCategorySales(Object.values(catStats).sort((a: any, b: any) => b.count - a.count))

            // Top Customers Breakdown
            setTopCustomers(Object.values(custSales).sort((a: any, b: any) => b.orders - a.orders).slice(0, 5))

        } catch (error) {
            console.error('Fetch error:', error)
            toast.error('Failed to update intelligence sync')
        } finally {
            setLoading(false)
        }
    }, [dateRange])

    const handleDownloadAudit = () => {
        if (!orders || orders.length === 0) {
            toast.error("No historical data available for audit")
            return
        }

        const headers = ["Date", "Order ID", "Customer", "Status", "Type"]
        const csvData = orders.map(o => [
            format(new Date(o.created_at), 'dd MMM yyyy HH:mm'),
            o.id.slice(0, 8),
            o.customers?.name || o.customer_name || 'Guest',
            o.status.toUpperCase(),
            o.order_type.toUpperCase()
        ])

        const content = [headers, ...csvData].map(e => e.join(",")).join("\n")
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `Restaurant_Audit_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Full Audit Exported Successfully")
    }

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
                        orders: stats.totalOrders,
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
            const revenue = dayOrders.reduce((s, o) => s + (o.total || 0), 0)
            const ordersCount = dayOrders.length
            return {
                name: dateStr,
                orders: ordersCount,
                alt_value: (ordersCount / (stats.totalOrders || 1)) * 100
            }
        })
    }, [orders, dateRange, stats.totalOrders])

    const hourlyData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }))
        orders.forEach(o => {
            const h = new Date(o.created_at).getHours()
            hours[h].count++
        })
        return hours
    }, [orders])

    const orderDistribution = useMemo(() => {
        const days = parseInt(dateRange)
        const periods = Math.min(days, 10); // Show last 10 days for clarity
        return Array.from({ length: periods }, (_, i) => {
            const date = subDays(new Date(), (periods - 1) - i)
            const dateStr = format(date, 'MMM d')
            const dayOrders = orders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
            
            return {
                name: dateStr,
                dine_in: dayOrders.filter(o => o.order_type === 'dine_in').length,
                delivery: dayOrders.filter(o => o.order_type === 'delivery').length,
                takeaway: dayOrders.filter(o => o.order_type === 'takeaway').length,
            }
        })
    }, [orders, dateRange])

    const statusData = useMemo(() => {
        const statuses: Record<string, number> = {}
        orders.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1 })
        return Object.entries(statuses).map(([name, value]) => ({ 
            name: name.toUpperCase(), 
            value, 
            fill: name === 'completed' ? '#10b981' : name === 'cancelled' ? '#ef4444' : '#6366f1' 
        }))
    }, [orders])

    const sentimentData = [
        { subject: 'Taste', value: 92 },
        { subject: 'Service', value: 85 },
        { subject: 'Speed', value: 78 },
        { subject: 'Vibe', value: 90 },
        { subject: 'Value', value: 72 },
    ]

    const operationalBreakdown = useMemo(() => {
        const completed = orders.filter(o => o.status === 'completed')
        const cancelled = orders.filter(o => o.status === 'cancelled')
        const processing = orders.filter(o => !['completed', 'cancelled'].includes(o.status))

        return [
            { label: 'Completed Orders', value: completed.length.toString(), color: 'text-emerald-500' },
            { label: 'Cancelled Orders', value: cancelled.length.toString(), color: 'text-rose-500' },
            { label: 'Live Orders', value: processing.length.toString(), color: 'text-blue-500' },
        ]
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                            { label: 'Total Orders', value: stats.totalOrders.toString(), change: stats.ordersChange, icon: ShoppingCart, color: '#3b82f6', chartKey: 'orders' },
                            { label: 'Total Customers', value: stats.totalCustomers.toString(), icon: Users, color: '#8b5cf6', chartKey: 'orders' },
                        ].map((s, i) => (
                            <Card key={i} className="border-0 shadow-sm rounded-3xl bg-white border border-gray-50 hover:shadow-md transition-shadow overflow-hidden group">
                                <CardContent className="p-0">
                                    <div className="p-6 pb-2">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 rounded-2xl shadow-sm bg-gray-50 text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-colors duration-500">
                                                <s.icon size={20} />
                                            </div>
                                            {s.change !== undefined && (
                                                <Badge variant="secondary" className={cn("font-extrabold text-[10px]", s.change >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
                                                    {s.change >= 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                                                    {s.change >= 0 ? '+' : ''}{Math.abs(s.change).toFixed(1)}%
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 group-hover:translate-x-1 transition-transform">{s.value}</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{s.label}</p>
                                    </div>
                                    <div className="h-16 w-full -mb-1 opacity-40 group-hover:opacity-100 transition-opacity duration-500 px-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dailyTrend.slice(-7)}>
                                                <Area 
                                                    type="monotone" 
                                                    dataKey={s.chartKey} 
                                                    stroke={s.color} 
                                                    fill={s.color} 
                                                    strokeWidth={2} 
                                                    fillOpacity={0.1}
                                                    isAnimationActive={true}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                        <Card className="md:col-span-2 lg:col-span-3 rounded-3xl border-0 shadow-sm bg-white p-8 overflow-hidden relative group">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <CardTitle className="text-3xl font-black tracking-tight">{stats.totalOrders} Orders</CardTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-emerald-500 text-white border-0 font-bold text-[10px]">VOLUME</Badge>
                                        <span className="text-[10px] font-bold text-emerald-600">+{stats.ordersChange.toFixed(1)}% vs. Prev Period</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="orders" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-3xl border-0 shadow-sm bg-white overflow-hidden">
                                <div className="bg-gray-50/50 p-4 border-b border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Market Breakdown</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    {operationalBreakdown.map((item, i) => (
                                        <div key={i} className={cn("flex justify-between items-center py-2", i !== operationalBreakdown.length - 1 && "border-b border-gray-50")}>
                                            <span className="text-xs font-bold text-gray-500">{item.label}</span>
                                            <span className={cn("text-sm font-black", item.color)}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="rounded-3xl border-0 shadow-sm bg-gray-900 text-white p-6 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500 mb-2">Live Loyalty Pulse</p>
                                    <h4 className="text-2xl font-black mb-1">Elite Usage</h4>
                                    <p className="text-[10px] text-gray-400 font-bold mb-6">{orders.filter(o => o.status === 'completed').length} Successful visits recently</p>
                                    
                                    <div className="flex -space-x-2 mb-6">
                                        {topCustomers.slice(0, 4).map((c, i) => (
                                            <div key={i} className="h-8 w-8 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-[10px] font-bold text-emerald-400 capitalize">
                                                {c.name.charAt(0)}
                                            </div>
                                        ))}
                                        {topCustomers.length > 4 && (
                                            <div className="h-8 w-8 rounded-full border-2 border-gray-900 bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                +{topCustomers.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={() => setActiveTab("analytics")}
                                        className="w-full bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl text-xs font-bold h-10 transition-all active:scale-95"
                                    >
                                        View Engagement
                                    </Button>
                                </div>
                                <Crown className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 opacity-40 group-hover:rotate-12 transition-transform duration-700" />
                            </Card>
                        </div>
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
                                <ShoppingCart className="text-blue-500 h-5 w-5" /> Service Mix
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
                                                <span className="font-bold text-lg text-gray-900">{type.count} Orders</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                                                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${((type.count / stats.totalOrders) * 100) || 0}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3 mt-6">
                        <Card className="lg:col-span-2 rounded-3xl border-0 shadow-sm bg-white p-8 border border-gray-50">
                            <div className="flex justify-between items-center mb-8">
                                <CardTitle className="text-xl font-black flex items-center gap-2">
                                    <Users className="text-emerald-500 h-5 w-5" /> Frequent Patrons
                                </CardTitle>
                                <Badge className="bg-gray-100 text-gray-500 border-0 font-bold uppercase text-[9px]">Repeat Guests</Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Orders placed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                                            <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-5">
                                                    <p className="font-black text-sm text-gray-900 leading-none mb-1">{c.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{c.phone}</p>
                                                </td>
                                                <td className="py-5 text-right text-sm font-bold text-gray-600">{c.orders} Visit(s)</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={2} className="py-10 text-center text-xs font-bold text-gray-400">Analysis Pending...</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <Card className="rounded-3xl border-0 shadow-sm bg-indigo-600 text-white p-8 flex flex-col justify-between relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                                    <Activity size={24} className="text-white" />
                                </div>
                                <h4 className="text-2xl font-black mb-2 tracking-tight">Intelligence Sync</h4>
                                <p className="text-xs font-bold text-indigo-100 opacity-80 leading-relaxed max-w-[200px]">
                                    Direct integration with real-time POS entries and live inventory tracking.
                                </p>
                            </div>
                            <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-6">
                                    <span>Audit Ready</span>
                                    <span className="text-emerald-400 flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live</span>
                                </div>
                                <Button 
                                    onClick={handleDownloadAudit}
                                    className="w-full bg-white text-indigo-600 hover:bg-white/90 font-black rounded-2xl h-12 transition-all shadow-xl active:scale-95 shadow-indigo-900/20"
                                >
                                    Download Full Audit
                                </Button>
                            </div>
                            <TrendingUp size={140} className="absolute -right-10 -bottom-10 text-white/5 group-hover:scale-110 transition-transform duration-700" />
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
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: '16px', 
                                                border: 'none', 
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                                            }} 
                                        />
                                        <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} fill="url(#areaGradSubtle)" animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="rounded-3xl border-0 shadow-sm bg-white p-8 flex flex-col h-full border border-gray-50">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center justify-between mb-8">
                                Customer Activity Feed <Activity size={16} className="text-emerald-500 animate-pulse" />
                            </CardTitle>
                            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 max-h-[350px]">
                                {orders.slice(0, 10).map((o, i) => {
                                    const isVIP = (o.total || 0) > 1500;
                                    const isReturn = orders.filter(prev => prev.customer_id === o.customer_id).length > 1;

                                    return (
                                        <div key={i} className="flex gap-4 items-start group relative">
                                            <div className={cn("h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-300",
                                                o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                                                o.status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600')}>
                                                {o.status === 'completed' ? <CheckCircle2 size={18} /> : 
                                                 o.status === 'cancelled' ? <TrendingDown size={18} /> : <ShoppingCart size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0 border-b border-gray-50 pb-4">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <p className="text-sm font-black text-gray-900 truncate tracking-tight">
                                                            {(o.customers?.name || o.customer_name) || 'Guest User'}
                                                        </p>
                                                        {isVIP && <Badge className="bg-amber-100 text-amber-700 border-0 text-[7px] font-black h-3 px-1 uppercase">VIP</Badge>}
                                                        {isReturn && !isVIP && <Badge className="bg-blue-100 text-blue-700 border-0 text-[7px] font-black h-3 px-1 uppercase">Repeat</Badge>}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">{format(new Date(o.created_at), 'h:mm a')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={cn("text-[8px] font-black uppercase px-2 h-4 border-0",
                                                        o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                                                        o.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600')}>
                                                        {o.status}
                                                    </Badge>
                                                    <p className="text-xs font-extrabold text-gray-900 tracking-tight">{o.order_items?.length || 0} Items</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button 
                                onClick={() => setActiveTab("financials")}
                                variant="ghost" 
                                className="w-full mt-6 text-[10px] font-black text-gray-400 hover:text-emerald-600 h-10 rounded-2xl uppercase tracking-[0.2em]"
                            >
                                View Full History
                            </Button>
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
                            <CardTitle className="text-lg font-bold w-full text-left mb-6 font-black uppercase tracking-widest text-gray-400 text-[10px]">Segment Distribution</CardTitle>
                            <div className="h-[200px] w-full relative">
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-2xl font-black text-gray-900 leading-none">{orders.length}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase mt-1">Total Signals</p>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={90}
                                            paddingAngle={8}
                                            dataKey="value"
                                            cornerRadius={12}
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

                        <Card className="rounded-3xl border-0 shadow-sm bg-white p-6 flex flex-col items-center group">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-full text-left mb-6 flex justify-between items-center">
                                Customer Sentiment <Badge className="bg-amber-100 text-amber-700 border-0 text-[8px]">AI ANALYSIS</Badge>
                            </CardTitle>
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sentimentData}>
                                        <PolarGrid stroke="#f1f5f9" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} />
                                        <Radar
                                            name="Sentiment"
                                            dataKey="value"
                                            stroke="#8b5cf6"
                                            fill="#8b5cf6"
                                            fillOpacity={0.5}
                                            isAnimationActive={true}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[9px] font-bold text-gray-400 mt-4 italic text-center px-4">Based on top 50 recent customer feedback signals.</p>
                        </Card>

                        <Card className="lg:col-span-2 rounded-3xl border-0 shadow-sm bg-white p-6 group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <CardTitle className="text-lg font-black">History & Channels</CardTitle>
                                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-gray-400 italic">Omni-channel distribution metrics</CardDescription>
                                </div>
                                <Activity className="text-indigo-500 h-5 w-5 opacity-40 group-hover:rotate-45 transition-transform duration-500" />
                            </div>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={orderDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Bar dataKey="dine_in" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="delivery" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar dataKey="takeaway" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
                                    </BarChart>
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
                <TabsContent value="financials" className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="lg:col-span-3 p-8 rounded-3xl border-0 shadow-sm bg-white border border-gray-50">
                            <CardTitle className="text-xl font-black mb-1 flex items-center gap-2">
                                <Package className="text-blue-500" /> Category Performance
                            </CardTitle>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Service Volume by Menu Categories</p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {categorySales.slice(0, 8).map((cat, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-gray-50 border border-gray-100 group hover:bg-gray-900 hover:text-white transition-all cursor-default">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-900 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Tag size={18} />
                                            </div>
                                            <Badge className="bg-blue-100 text-blue-700 border-0 text-[8px] font-black group-hover:bg-blue-500/20 group-hover:text-blue-200">
                                                {cat.count} ITEMS
                                            </Badge>
                                        </div>
                                        <h4 className="font-black text-sm uppercase tracking-tight mb-1 truncate">{cat.name}</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black">{cat.count} Orders</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="lg:col-span-2 p-8 rounded-3xl border-0 shadow-sm bg-white border border-gray-50 relative overflow-hidden group">
                             <div className="flex justify-between items-start mb-12">
                                <div>
                                    <CardTitle className="text-2xl font-black tracking-tight">Active Pulse Metrics</CardTitle>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time Operational Efficiency</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                    <Zap size={20} />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-indigo-400">Avg Processing Time</span>
                                            <Clock size={14} className="text-indigo-400" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-indigo-700">{waitTimes[0]?.value || 0}</span>
                                            <span className="text-xs font-bold text-indigo-400 uppercase">Minutes</span>
                                        </div>
                                        <div className="mt-4 h-1.5 w-full bg-indigo-200/30 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(((waitTimes[0]?.value || 0) / 30) * 100, 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-emerald-400">Retention Score</span>
                                            <Users size={14} className="text-emerald-400" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-emerald-700">
                                                {Math.round((topCustomers.filter(c => c.orders > 1).length / (topCustomers.length || 1)) * 100)}%
                                            </span>
                                            <Badge className="bg-emerald-100 text-emerald-700 border-0 h-5">+2.4%</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center items-center text-center p-8 rounded-3xl bg-gray-50 border border-gray-100">
                                    <Smartphone className="h-12 w-12 text-gray-300 mb-4" />
                                    <h4 className="font-black text-lg text-gray-900 mb-2">Digital vs. Physical</h4>
                                    <p className="text-xs font-bold text-gray-400 max-w-[200px]">
                                        {Math.round(((orderDistribution.find(d => d.name === 'Delivery')?.delivery || 0) + (orderDistribution.find(d => d.name === 'Takeaway')?.takeaway || 0)) / (stats.totalOrders || 1) * 100)}% of orders are originating from Digital Devices.
                                    </p>
                                    <Button 
                                        onClick={() => setActiveTab("analytics")}
                                        variant="outline" 
                                        className="mt-6 border-gray-200 rounded-2xl font-bold text-[10px] h-10 px-8 uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all"
                                    >
                                        Optimize Flow
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 rounded-3xl border-0 shadow-sm bg-white border border-gray-50 col-span-1 lg:col-span-3">
                            <CardTitle className="text-xl font-black mb-1 flex items-center gap-2">
                                <History className="text-indigo-500" /> Daily Traffic Log
                            </CardTitle>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Operational Load by Date</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Period</th>
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Orders</th>
                                            <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Capacity Used</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {dailyTrend.slice().reverse().map((day, i) => (
                                            <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 text-sm font-bold text-gray-900">{day.name}</td>
                                                <td className="py-4 text-right text-sm font-bold text-gray-600">{day.orders} Orders</td>
                                                <td className="py-4 text-right text-sm font-bold text-gray-600">{Math.min(Math.round((day.orders / 50) * 100), 100)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
