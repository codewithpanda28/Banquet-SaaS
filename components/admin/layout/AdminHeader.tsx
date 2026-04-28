'use client'

import { Bell, Search, User, LogOut, Settings as SettingsIcon, ShoppingBag, UtensilsCrossed, Users as UsersIcon, X, Clock, MapPin, Star, DollarSign, Smartphone, Zap, CreditCard, Check, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SearchResult {
    id: string
    type: 'order' | 'menu' | 'customer'
    title: string
    subtitle: string
    href: string
}

export function AdminHeader() {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)

    // Modal states for full details
    const [selectedDetail, setSelectedDetail] = useState<{
        type: 'order' | 'menu' | 'customer'
        data: any
    } | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [notifications, setNotifications] = useState<any[]>([
        {
            id: '1',
            title: 'Welcome',
            message: 'Restaurant Dashboard is ready',
            time: 'Just now',
            isRead: false,
            type: 'info'
        }
    ])
    
    const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false)
    const [splitCash, setSplitCash] = useState<string>('')
    const [splitUpi, setSplitUpi] = useState<string>('')
    const [mounted, setMounted] = useState(false)

    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([])
            setShowResults(false)
            return
        }

        setSearching(true)
        setShowResults(true)
        try {
            const results: SearchResult[] = []

            // 1. Search Orders
            const { data: orders } = await supabase
                .from('orders')
                .select('id, bill_id, created_at')
                .eq('restaurant_id', String(RESTAURANT_ID))
                .ilike('bill_id', `%${query}%`)
                .limit(3)

            orders?.forEach(o => results.push({
                id: o.id,
                type: 'order',
                title: o.bill_id,
                subtitle: `Order placed on ${mounted ? new Date(o.created_at).toLocaleDateString() : ''}`,
                href: `/admin/orders?id=${o.id}`
            }))

            // 2. Search Menu Items
            const { data: menuItems } = await supabase
                .from('menu_items')
                .select('id, name')
                .eq('restaurant_id', String(RESTAURANT_ID))
                .ilike('name', `%${query}%`)
                .limit(3)

            menuItems?.forEach(m => results.push({
                id: m.id,
                type: 'menu',
                title: m.name,
                subtitle: `Menu Item`,
                href: `/admin/menu`
            }))

            // 3. Search Customers
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name, phone')
                .eq('restaurant_id', String(RESTAURANT_ID))
                .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(3)

            customers?.forEach(c => results.push({
                id: c.id,
                type: 'customer',
                title: c.name,
                subtitle: `Customer • ${c.phone}`,
                href: `/admin/customers`
            }))

            setSearchResults(results)
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setSearching(false)
        }
    }, [])


    useEffect(() => {
        const checkLowStock = async () => {
            const { data: lowStockItems } = await supabase
                .from('menu_items')
                .select('id, name, stock')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('is_infinite_stock', false)
                .lte('stock', 10)
                .order('stock', { ascending: true })

            if (lowStockItems && lowStockItems.length > 0) {
                const newNotifications = lowStockItems.map(item => ({
                    id: `low-stock-init-${item.id}`,
                    title: 'Low Stock Alert',
                    message: `${item.name} has low stock (${item.stock})`,
                    time: 'Just now',
                    isRead: false,
                    type: 'alert'
                }))

                setNotifications(prev => {
                    // Avoid duplicates
                    const existingIds = new Set(prev.map(n => n.message))
                    const filteredNew = newNotifications.filter(n => !existingIds.has(n.message))
                    return [...filteredNew, ...prev]
                })
            }
        }

        checkLowStock()

        // Subscribe to new orders and menu updates
        const channel = supabase
            .channel('admin-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                (payload) => {
                    const newOrder = payload.new as any
                    if (newOrder.restaurant_id !== RESTAURANT_ID) return

                    toast.success(`New Order Received! #${newOrder.bill_id}`, {
                        description: `Items: ${newOrder.order_items?.length || 'Multiple'} selection`,
                        duration: 5000,
                    })

                    // Add to notifications list
                    setNotifications(prev => [
                        {
                            id: newOrder.id,
                            title: 'New Order',
                            message: `Order #${newOrder.bill_id} received`,
                            time: 'Just now',
                            isRead: false,
                            type: 'order'
                        },
                        ...prev
                    ])
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'menu_items',
                },
                (payload) => {
                    const newItem = payload.new as any
                    if (newItem.restaurant_id !== RESTAURANT_ID) return

                    // Check if stock is low (changed from simple transition check to absolute check)
                    if (!newItem.is_infinite_stock && newItem.stock <= 10) {
                        // Removed the strict transition check to ensure updates are caught
                        // But we should debounce strictly if we didn't use a store. 
                        // For now, let's just add it and rely on the UI to show most recent.

                        setNotifications(prev => {
                            // Check if we already have a recent notification for this item to avoid spam
                            // (Simple check: is the top notification the same?)
                            if (prev.length > 0 && prev[0].message.includes(newItem.name) && prev[0].message.includes(newItem.stock.toString())) {
                                return prev
                            }

                            toast.warning(`Low Stock Alert: ${newItem.name}`, {
                                description: `Only ${newItem.stock} remaining!`,
                                duration: 5000,
                            })

                            return [
                                {
                                    id: `low-stock-${newItem.id}-${Date.now()}`,
                                    title: 'Low Stock Alert',
                                    message: `${newItem.name} has only ${newItem.stock} left`,
                                    time: 'Just now',
                                    isRead: false,
                                    type: 'alert'
                                },
                                ...prev
                            ]
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                performSearch(searchQuery)
            } else {
                setSearchResults([])
                setShowResults(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, performSearch])

    const fetchFullDetails = async (result: SearchResult) => {
        setLoadingDetail(true)
        setShowResults(false)
        try {
            if (result.type === 'order') {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, customers(*), order_items(*)')
                    .eq('id', result.id)
                    .single()
                if (data) setSelectedDetail({ type: 'order', data })
            } else if (result.type === 'menu') {
                const { data, error } = await supabase
                    .from('menu_items')
                    .select('*, menu_categories(name)')
                    .eq('id', result.id)
                    .single()
                if (data) setSelectedDetail({ type: 'menu', data })
            } else if (result.type === 'customer') {
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', result.id)
                    .single()
                if (data) setSelectedDetail({ type: 'customer', data })
            }
        } catch (error) {
            console.error('Error fetching details:', error)
            toast.error('Failed to load full details')
        } finally {
            setLoadingDetail(false)
        }
    }

    const handleOrderFinish = async (method: 'cash' | 'upi' | 'mixed' | 'banquet', overrideAmounts?: { cash: number, upi: number }) => {
        if (!selectedDetail || selectedDetail.type !== 'order') return
        setSearching(true)

        const total = Number(selectedDetail.data.total)
        const cashValue = method === 'mixed' ? (overrideAmounts?.cash || 0) : (method === 'cash' ? total : 0)
        const upiValue = method === 'mixed' ? (overrideAmounts?.upi || 0) : (method === 'upi' ? total : 0)

        const customerName = selectedDetail.data.customers?.name || 'Customer'
        const phone = selectedDetail.data.customers?.phone
        const billId = selectedDetail.data.bill_id

        try {
            // Logic removed for non-financial banquet workflow

            // 1. Update Payment Status
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    payment_method: method,
                    notes: `Order completed via ${method.toUpperCase()}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedDetail.data.id)

            if (error) throw error

            toast.success(`Order finished successfully!`)

            // 3. Mark Table as Available if it's a Dine In order
            if (selectedDetail.data.table_id) {
                await supabase
                    .from('restaurant_tables')
                    .update({ status: 'available' })
                    .eq('id', selectedDetail.data.table_id)
            }

            // Update local state so UI reacts immediately
            if (selectedDetail && selectedDetail.type === 'order') {
                setSelectedDetail({
                    ...selectedDetail,
                    data: {
                        ...selectedDetail.data,
                        status: 'completed',
                        payment_status: 'paid',
                        payment_method: method
                    }
                })
            }


            // Close after delay so user sees the "ORDER COMPLETED" state
            setTimeout(() => {
                setSelectedDetail(null)
                setIsSplitDialogOpen(false)
            }, 1500)
        } catch (error) {
            console.error('Payment error:', error)
            toast.error('Failed to update order status')
        } finally {
            setSearching(false)
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-full max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                        <Input
                            placeholder="Search orders, menu, customers..."
                            className="pl-10 h-10 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all focus:ring-green-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setShowResults(true)}
                        />

                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-2 space-y-1">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.id}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors group text-left"
                                            onClick={() => fetchFullDetails(result)}
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                                                {result.type === 'order' && <ShoppingBag className="h-5 w-5 text-blue-500" />}
                                                {result.type === 'menu' && <UtensilsCrossed className="h-5 w-5 text-orange-500" />}
                                                {result.type === 'customer' && <User className="h-5 w-5 text-purple-500" />}
                                            </div>
                                            <div className="flex-1 truncate">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-sm truncate text-gray-900">{result.title}</p>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{result.subtitle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="p-2 text-center border-t border-gray-100 bg-gray-50">
                                        <p className="text-[10px] text-gray-400">
                                            Tip: Press <kbd className="font-sans px-1 rounded bg-gray-200 text-gray-600">Esc</kbd> to close
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">

                    {/* Notifications */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild id="notification-trigger">
                            <Button variant="ghost" size="icon" className="relative hover:bg-green-50 rounded-full text-gray-500 hover:text-green-600 transition-all duration-300">
                                <Bell className="h-5 w-5" />
                                <Badge
                                    className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] font-bold flex items-center justify-center bg-red-500 text-white border border-white shadow-sm"
                                >
                                    {notifications.filter(n => !n.isRead).length}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 p-0 bg-white border border-gray-100 shadow-xl rounded-xl" align="end">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={cn(
                                                "p-4 border-b border-gray-50 hover:bg-green-50 cursor-pointer transition-colors",
                                                !notif.isRead && "bg-green-50/50"
                                            )}
                                            onClick={() => {
                                                setNotifications(prev =>
                                                    prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                                                )
                                            }}
                                        >
                                            <div className="flex gap-3">
                                                <div className="h-2 w-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium leading-none text-gray-900">{notif.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                                    <p className="text-[10px] text-gray-400 mt-2 opacity-70">{notif.time}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 text-center border-t border-gray-100">
                                <Button variant="ghost" size="sm" className="w-full text-xs font-medium hover:bg-gray-50 h-8 text-gray-600">
                                    View all notifications
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild id="profile-trigger">
                            <Button variant="ghost" className="flex items-center gap-2 hover:bg-green-50 h-10 px-2 transition-all duration-300 rounded-xl">
                                <Avatar className="h-8 w-8 ring-2 ring-gray-100 transition-all hover:ring-green-400">
                                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-700 text-white font-bold text-xs">
                                        AD
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden text-sm font-medium md:inline-block text-gray-700">
                                    Admin
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <SettingsIcon className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => router.push('/admin/login')}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Details Dialog */}
            <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-3xl border-none shadow-2xl">
                    {selectedDetail?.type === 'order' && (
                        <div className="flex flex-col">
                            {/* Premium Header */}
                            <div className="bg-gradient-to-br from-green-600 to-emerald-800 p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge className="bg-white/20 text-white border-none text-[10px] font-bold tracking-widest px-2 py-0.5">
                                                {selectedDetail.data.order_type?.toUpperCase().replace('_', ' ')}
                                            </Badge>
                                            <p className="text-green-100/80 text-xs font-bold uppercase tracking-widest">{mounted ? new Date(selectedDetail.data.created_at).toLocaleDateString() : ''}</p>
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tighter">#{selectedDetail.data.bill_id}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-100/60 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
                                        <Badge className="bg-white text-green-700 border-none font-black px-3 py-1">
                                            {selectedDetail.data.status?.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="px-6 pb-6 space-y-4">
                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <div className="col-span-10 pl-2">Item</div>
                                        <div className="col-span-2 text-center">Qty</div>
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto custom-scrollbar">
                                        {selectedDetail.data.order_items?.map((item: any) => (
                                            <div key={item.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50/50 transition-colors">
                                                <div className="col-span-10 pl-2">
                                                    <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                                        {item.quantity}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Summary */}
                                    <div className="bg-gray-50 p-4 border-t border-gray-200 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banquet Inclusive</p>
                                        <p className="text-[10px] text-gray-500 italic mt-1">Premium guest experience optimized.</p>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-2">
                                    {selectedDetail.data.status !== 'completed' && selectedDetail.data.payment_status !== 'paid' ? (
                                        <div className="grid grid-cols-3 gap-3">
                                        <div className="flex justify-center w-full">
                                            <Button
                                                className={cn(
                                                    "h-14 w-full rounded-2xl font-black text-xl shadow-lg transition-all duration-500",
                                                    selectedDetail.data.status === 'completed' 
                                                        ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-100 shadow-none" 
                                                        : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                                                )}
                                                onClick={() => selectedDetail.data.status !== 'completed' && handleOrderFinish('banquet')}
                                                disabled={searching || selectedDetail.data.status === 'completed'}
                                            >
                                                {searching ? (
                                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                                ) : selectedDetail.data.status === 'completed' ? (
                                                    <><CheckCircle2 className="mr-2 h-6 w-6 text-emerald-500" /> ORDER FINISHED</>
                                                ) : (
                                                    <><CheckCircle2 className="mr-2 h-6 w-6" /> FINISH ORDER</>
                                                )}
                                            </Button>
                                        </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-11 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            Order Finished
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedDetail?.type === 'menu' && (
                        <div className="flex flex-col">
                            {/* ... (Menu modal styling adjusted to light theme in similar pattern) ... */}
                            <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <div className="absolute top-4 right-4 z-10">
                                    <Badge className={cn(
                                        "backdrop-blur-md px-3 py-1 font-black text-[10px] tracking-widest border border-white/20",
                                        selectedDetail.data.is_veg ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"
                                    )}>
                                        {selectedDetail.data.is_veg ? 'VEGETARIAN' : 'NON-VEGETARIAN'}
                                    </Badge>
                                </div>
                                <UtensilsCrossed className="h-12 w-12 mb-4 opacity-70 relative z-10" />
                                <h2 className="text-3xl font-black tracking-tight relative z-10">{selectedDetail.data.name}</h2>
                                <p className="text-orange-100/90 font-medium flex items-center gap-2 mt-1 relative z-10">
                                    <Badge className="bg-white/20 text-white border-none text-[10px] font-bold capitalize">
                                        {selectedDetail.data.menu_categories?.name}
                                    </Badge>
                                </p>
                            </div>
                            <div className="p-8 space-y-8 bg-white">
                                {/* ... (Body content) ... */}
                                <div className="pt-4 flex gap-4">
                                    <Button variant="outline" className="w-full px-6 h-12 rounded-2xl border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 text-gray-600" onClick={() => setSelectedDetail(null)}>Close</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedDetail?.type === 'customer' && (
                        <div className="flex flex-col">
                            {/* ... (Customer modal styling adjusted) ... */}
                            <div className="bg-gradient-to-br from-purple-600 to-fuchsia-700 p-10 text-white relative flex items-center gap-8 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <Avatar className="h-32 w-32 border-8 border-white/20 shadow-2xl relative z-10 scale-105">
                                    <AvatarFallback className="bg-white text-purple-600 text-4xl font-black">
                                        {selectedDetail.data.name?.substring(0, 2).toUpperCase() || 'CU'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="relative z-10 flex-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-4xl font-black tracking-tighter">{selectedDetail.data.name || 'Walk-in'}</h2>
                                    </div>
                                    <p className="text-purple-100/90 font-bold text-lg mt-1 tracking-tight">{selectedDetail.data.phone}</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8 bg-white">
                                {/* ... (Body content) ... */}
                                <div className="pt-4 flex gap-4">
                                    <Button variant="outline" className="w-full px-6 h-12 rounded-2xl border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 text-gray-600" onClick={() => setSelectedDetail(null)}>Close</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </header>
    )
}
