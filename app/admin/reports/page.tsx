'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'

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
                <div className="text-muted-foreground">Loading reports...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports & Analytics"
                description="Monitor your restaurant's performance"
            >
                <div className="flex items-center gap-3">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Today</SelectItem>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={downloadCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </PageHeader>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                                <p className={`text-xs flex items-center gap-1 ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {Math.abs(stats.revenueChange).toFixed(1)}% vs prev period
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                                <p className={`text-xs flex items-center gap-1 ${stats.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.ordersChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {Math.abs(stats.ordersChange).toFixed(1)}% vs prev period
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <ShoppingCart className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                                <p className="text-2xl font-bold">₹{stats.avgOrderValue.toFixed(0)}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-2 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Top Selling Items */}
                <Card className="bg-card border-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>Top Selling Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topItems.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available for this period
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {topItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium text-sm">{item.name}</span>
                                                <span className="text-sm text-muted-foreground">{item.quantity} sold</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${(item.quantity / topItems[0].quantity) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="ml-4 text-right min-w-[80px]">
                                            <p className="font-bold">₹{item.revenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Revenue by Order Type */}
                <Card className="bg-card border-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>Revenue by Order Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {revenueByType.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available for this period
                            </div>
                        ) : (
                            <div className="space-y-6 pt-4">
                                {revenueByType.map((type, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className={`h-4 w-4 rounded-full ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-blue-500' : 'bg-orange-500'
                                            }`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium capitalize text-sm">{type.type.replace('_', ' ')}</span>
                                                <span className="font-bold">₹{type.revenue.toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{type.count} orders</p>
                                        </div>
                                    </div>
                                ))}
                                {/* Total indicators */}
                                <div className="pt-6 border-t mt-auto">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Grand Total</span>
                                        <span className="text-xl font-bold text-primary">₹{stats.totalRevenue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
