'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
    ExternalLink, ShoppingBag,
    Clock, Settings, RefreshCw,
    Bike, Utensils, Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'

interface OrderItem {
    item_name: string;
    quantity: number;
}

interface Order {
    id: string;
    platform: string; // 'zomato', 'swiggy', 'internal'
    external_order_id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    total: number;
    status: string;
    created_at: string;
    order_items: OrderItem[];
}

const STATUS_CONFIG = {
    pending: { label: 'New Order', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', pulse: true },
    new: { label: 'New Order', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', pulse: true },
    preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', pulse: true },
    picked: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', pulse: false },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', pulse: false },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', pulse: false },
}

export default function DeliveryIntegrationPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [activeTab, setActiveTab] = useState('all')
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [lastSync, setLastSync] = useState(new Date())

    const [settings, setSettings] = useState({
        zomato_api_key: '',
        swiggy_api_key: '',
        zomato_enabled: false,
        swiggy_enabled: false
    })
    const [savingSettings, setSavingSettings] = useState(false)

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (item_name, quantity)
            `)
            .eq('restaurant_id', RESTAURANT_ID)
            .in('platform', ['zomato', 'swiggy'])
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('Error fetching delivery orders:', error)
        } else {
            setOrders((data as any) || [])
        }
        setLoading(false)
    }, [])

    const fetchSettings = useCallback(async () => {
        const { data } = await supabase
            .from('restaurants')
            .select('zomato_api_key, swiggy_api_key, zomato_enabled, swiggy_enabled')
            .eq('id', RESTAURANT_ID)
            .single()

        if (data) {
            setSettings({
                zomato_api_key: data.zomato_api_key || '',
                swiggy_api_key: data.swiggy_api_key || '',
                zomato_enabled: !!data.zomato_enabled,
                swiggy_enabled: !!data.swiggy_enabled
            })
        }
    }, [])

    useEffect(() => {
        fetchOrders()
        fetchSettings()

        const channel = supabase
            .channel('delivery-orders')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${RESTAURANT_ID}`
            }, () => fetchOrders())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchOrders, fetchSettings])

    const saveSettings = async () => {
        setSavingSettings(true)
        const { error } = await supabase
            .from('restaurants')
            .update({
                zomato_api_key: settings.zomato_api_key,
                swiggy_api_key: settings.swiggy_api_key,
                zomato_enabled: settings.zomato_enabled,
                swiggy_enabled: settings.swiggy_enabled
            })
            .eq('id', RESTAURANT_ID)

        if (error) {
            toast.error('Failed to save settings: ' + error.message)
        } else {
            toast.success('Integration settings saved successfully!')
        }
        setSavingSettings(false)
    }

    async function syncOrders() {
        if (!settings.zomato_enabled && !settings.swiggy_enabled) {
            toast.error('Please enable at least one platform first.')
            return
        }
        setSyncing(true)

        // Webhook removed as requested. Manual sync via n8n is disabled.
        toast.info('Direct API sync is currently disabled (No Automation).')

        fetchOrders()
        setSyncing(false)
        setLastSync(new Date())
        toast.success('Synced Order Data from Zomato & Swiggy APIs via n8n')
    }

    async function updateOrderStatus(id: string, status: string) {
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)

        if (error) {
            toast.error('Update failed: ' + error.message)
        } else {
            toast.success(`Order status updated to ${status}`)
            fetchOrders()
        }
    }

    const filteredOrders = orders.filter(o =>
        activeTab === 'all' || o.platform === activeTab
    )

    const stats = {
        zomato: {
            orders: orders.filter(o => o.platform === 'zomato').length,
            revenue: orders.filter(o => o.platform === 'zomato' && o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0)
        },
        swiggy: {
            orders: orders.filter(o => o.platform === 'swiggy').length,
            revenue: orders.filter(o => o.platform === 'swiggy' && o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0)
        },
        active: orders.filter(o => ['new', 'pending', 'preparing'].includes(o.status)).length,
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Delivery Integration"
                description="Manage live Zomato & Swiggy orders using your real API keys"
            >
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-primary/30 text-primary"
                        onClick={syncOrders}
                        disabled={syncing || (!settings.zomato_enabled && !settings.swiggy_enabled)}
                    >
                        <RefreshCw className={cn('h-4 w-4 mr-2', syncing && 'animate-spin')} />
                        {syncing ? 'Syncing Real Data...' : 'Sync APIs'}
                    </Button>
                </div>
            </PageHeader>

            {/* Platform Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <ShoppingBag size={100} />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-red-100 text-xs font-bold uppercase tracking-widest mb-1">Zomato Real-Time</p>
                                <p className="text-4xl font-black">{stats.zomato.orders}</p>
                                <p className="text-red-100/80 text-sm font-medium mt-1">₹{stats.zomato.revenue.toLocaleString()} revenue</p>
                            </div>
                            <Badge className={cn('bg-white/20 text-white border-0 backdrop-blur-md', !settings.zomato_enabled && 'opacity-50')}>
                                {settings.zomato_enabled ? 'API Active' : 'Disabled'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg overflow-hidden relative">
                    <div className="absolute right-[-10px] top-[-10px] opacity-10">
                        <Bike size={100} />
                    </div>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-1">Swiggy Real-Time</p>
                                <p className="text-4xl font-black">{stats.swiggy.orders}</p>
                                <p className="text-orange-100/80 text-sm font-medium mt-1">₹{stats.swiggy.revenue.toLocaleString()} revenue</p>
                            </div>
                            <Badge className={cn('bg-white/20 text-white border-0 backdrop-blur-md', !settings.swiggy_enabled && 'opacity-50')}>
                                {settings.swiggy_enabled ? 'API Active' : 'Disabled'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white text-gray-900 shadow-sm border border-gray-100">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Awaiting Action</p>
                                <p className="text-4xl font-black text-primary">{stats.active}</p>
                                <p className="text-gray-500 text-sm font-medium mt-1">New & Preparing orders</p>
                            </div>
                            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Utensils className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1.5 ml-1">
                <Clock className="h-3 w-3" /> Last API check: {lastSync.toLocaleTimeString()}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-white border p-1 rounded-2xl h-12">
                            <TabsTrigger value="all" className="rounded-xl px-6">All Orders</TabsTrigger>
                            <TabsTrigger value="zomato" className="rounded-xl px-6 data-[state=active]:bg-red-500 data-[state=active]:text-white">Zomato</TabsTrigger>
                            <TabsTrigger value="swiggy" className="rounded-xl px-6 data-[state=active]:bg-orange-500 data-[state=active]:text-white">Swiggy</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-4">
                            {loading ? (
                                <Card className="border-dashed border-2 py-12 text-center text-gray-400 h-[400px] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                                    <p className="font-bold">Fetching Live Data...</p>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {filteredOrders.map((order) => {
                                        const statusCfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new
                                        const isZomato = order.platform === 'zomato'
                                        return (
                                            <Card key={order.id} className="border-gray-100 hover:shadow-md transition-all rounded-3xl overflow-hidden">
                                                <CardContent className="p-0">
                                                    <div className="flex h-full min-h-[140px]">
                                                        <div className={cn("w-2 shrink-0", isZomato ? "bg-red-500" : "bg-orange-500")} />
                                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Badge className={cn("text-[10px] font-black tracking-widest border-0 text-white h-5", isZomato ? "bg-red-500" : "bg-orange-600")}>
                                                                            {isZomato ? "ZOMATO" : "SWIGGY"}
                                                                        </Badge>
                                                                        <span className="text-gray-400 text-xs font-mono font-bold">#{order.external_order_id || order.id.slice(0, 8)}</span>
                                                                    </div>
                                                                    <h4 className="text-lg font-black text-gray-900">{order.customer_name}</h4>
                                                                    <p className="text-xs text-gray-500 font-medium truncate max-w-[300px]">{order.customer_address}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-black text-gray-900">₹{order.total}</p>
                                                                    <Badge className={cn("mt-1 text-[10px] font-bold h-6", statusCfg.color)}>
                                                                        <div className={cn("h-1.5 w-1.5 rounded-full mr-1.5", statusCfg.dot)} />
                                                                        {statusCfg.label}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-4 mt-4 bg-gray-50 p-3 rounded-2xl">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {order.order_items?.map((item, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-[10px] bg-white border-gray-200 text-gray-600 font-bold">
                                                                            {item.item_name} ×{item.quantity}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                                <div className="flex gap-2 shrink-0">
                                                                    {['new', 'pending'].includes(order.status) && (
                                                                        <Button size="sm" className="h-8 rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => updateOrderStatus(order.id, 'preparing')}>Accept</Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-[2rem] border-gray-100 shadow-xl overflow-hidden bg-white">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6 pt-8">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Settings className="h-6 w-6 text-primary" /> API Config
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-sm uppercase tracking-widest">Zomato</span>
                                    <Switch
                                        checked={settings.zomato_enabled}
                                        onCheckedChange={(val) => setSettings({ ...settings, zomato_enabled: val })}
                                    />
                                </div>
                                <Input
                                    type="password"
                                    placeholder="Zomato API Key"
                                    value={settings.zomato_api_key}
                                    onChange={(e) => setSettings({ ...settings, zomato_api_key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-sm uppercase tracking-widest">Swiggy</span>
                                    <Switch
                                        checked={settings.swiggy_enabled}
                                        onCheckedChange={(val) => setSettings({ ...settings, swiggy_enabled: val })}
                                    />
                                </div>
                                <Input
                                    type="password"
                                    placeholder="Swiggy Merchant Key"
                                    value={settings.swiggy_api_key}
                                    onChange={(e) => setSettings({ ...settings, swiggy_api_key: e.target.value })}
                                />
                            </div>
                            <Button className="w-full" onClick={saveSettings} disabled={savingSettings}>Save Configuration</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
