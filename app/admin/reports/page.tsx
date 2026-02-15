'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, ArrowUpRight } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('7')
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

    useEffect(() => {
        fetchReports()
    }, [dateRange])

    async function fetchReports() {
        try {
            setLoading(true)
            const days = parseInt(dateRange)
            const startDate = subDays(new Date(), days).toISOString()

            // Fetch orders for the period
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', startDate)
                .eq('status', 'completed')

            const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0
            const totalOrders = orders?.length || 0
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

            // Fetch customers
            const { count: customerCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)

            // Fetch previous period for comparison
            const prevStartDate = subDays(new Date(), days * 2).toISOString()
            const prevEndDate = startDate

            const { data: prevOrders } = await supabase
                .from('orders')
                .select('total')
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', prevStartDate)
                .lt('created_at', prevEndDate)
                .eq('status', 'completed')

            const prevRevenue = prevOrders?.reduce((sum, o) => sum + o.total, 0) || 0
            const prevOrderCount = prevOrders?.length || 0

            const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
            const ordersChange = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : 0

            setStats({
                totalRevenue,
                totalOrders,
                avgOrderValue,
                totalCustomers: customerCount || 0,
                revenueChange,
                ordersChange,
            })

            // Fetch top-selling items
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('item_name, quantity, total, order_id')
                .in('order_id', orders?.map(o => o.id) || [])

            const itemSales = orderItems?.reduce((acc: any, item) => {
                if (!acc[item.item_name]) {
                    acc[item.item_name] = { name: item.item_name, quantity: 0, revenue: 0 }
                }
                acc[item.item_name].quantity += item.quantity
                acc[item.item_name].revenue += item.total
                return acc
            }, {})

            const topSellingItems = Object.values(itemSales || {})
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 5)

            setTopItems(topSellingItems)

            // Revenue by order type
            const typeSales = orders?.reduce((acc: any, order) => {
                const type = order.order_type || 'dine_in'
                if (!acc[type]) {
                    acc[type] = { type, revenue: 0, count: 0 }
                }
                acc[type].revenue += order.total
                acc[type].count += 1
                return acc
            }, {})

            setRevenueByType(Object.values(typeSales || {}))

        } catch (error) {
            console.error('Error fetching reports:', error)
            toast.error('Failed to load reports')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        // Simple CSV generation
        const headers = ['Metric', 'Value']
        const data = [
            ['Total Revenue', stats.totalRevenue],
            ['Total Orders', stats.totalOrders],
            ['Avg Order Value', stats.avgOrderValue],
            ['Total Customers', stats.totalCustomers],
        ]

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + data.map(e => e.join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `report_${dateRange}days_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Business Analytics"
                description="Deep dive into your restaurant's performance"
            >
                <div className="flex items-center gap-3">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px] glass-panel border-primary/20">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Today</SelectItem>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={downloadCSV} className="glass-panel border-primary/20 hover:bg-primary/10">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </PageHeader>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                    <div className="absolute -right-4 -top-4 bg-primary/10 rounded-full h-24 w-24 blur-2xl" />
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1", stats.revenueChange >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                {stats.revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(stats.revenueChange).toFixed(1)}%
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                            <p className="text-3xl font-black tracking-tight">₹{stats.totalRevenue.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                    <div className="absolute -right-4 -top-4 bg-blue-500/10 rounded-full h-24 w-24 blur-2xl" />
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <ShoppingCart className="h-5 w-5" />
                            </div>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1", stats.ordersChange >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                {stats.ordersChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(stats.ordersChange).toFixed(1)}%
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                            <p className="text-3xl font-black tracking-tight">{stats.totalOrders}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors" />
                    <div className="absolute -right-4 -top-4 bg-orange-500/10 rounded-full h-24 w-24 blur-2xl" />
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                                <Package className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                            <p className="text-3xl font-black tracking-tight">₹{stats.avgOrderValue.toFixed(0)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-panel border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
                    <div className="absolute -right-4 -top-4 bg-purple-500/10 rounded-full h-24 w-24 blur-2xl" />
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                            <p className="text-3xl font-black tracking-tight">{stats.totalCustomers}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Top Selling Items */}
                <Card className="glass-panel border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-green-500" /> Top Selling Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topItems.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available for this period
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {topItems.map((item, index) => (
                                    <div key={index} className="group">
                                        <div className="flex justify-between mb-2">
                                            <div>
                                                <span className="font-bold text-sm block group-hover:text-primary transition-colors">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.quantity} orders</span>
                                            </div>
                                            <span className="font-bold text-primary">₹{item.revenue.toLocaleString()}</span>
                                        </div>
                                        {/* Creative Progress Bar */}
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(item.quantity / topItems[0].quantity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Revenue by Order Type */}
                <Card className="glass-panel border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-500" /> Revenue Source
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {revenueByType.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available for this period
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {revenueByType.map((type, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold",
                                            index === 0 ? "bg-gradient-to-br from-primary to-purple-600" :
                                                index === 1 ? "bg-gradient-to-br from-blue-500 to-cyan-500" :
                                                    "bg-gradient-to-br from-orange-500 to-red-500"
                                        )}>
                                            {type.type.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold capitalize">{type.type.replace('_', ' ')}</span>
                                                <span className="font-black text-lg">₹{type.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>{type.count} Orders</span>
                                                <span>{((type.revenue / stats.totalRevenue) * 100).toFixed(1)}% of total</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Total indicators */}
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex justify-between items-center mt-4">
                                    <span className="font-bold text-primary">Total Generated Revenue</span>
                                    <span className="text-2xl font-black text-primary">₹{stats.totalRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
