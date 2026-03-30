'use client'

import { Bell, Search, User, LogOut, Settings as SettingsIcon, ShoppingBag, UtensilsCrossed, Users as UsersIcon, X, Clock, MapPin, Star, DollarSign, Smartphone, Zap, CreditCard, Check, Loader2 } from 'lucide-react'
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
import { triggerPaymentWebhook } from '@/lib/webhook'

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
    const [totalCoins, setTotalCoins] = useState(0)
    const [restaurantBalance, setRestaurantBalance] = useState(0)
    
    // Split States
    const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false)
    const [splitCash, setSplitCash] = useState<string>('')
    const [splitUpi, setSplitUpi] = useState<string>('')

    const router = useRouter()

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
                subtitle: `Order placed on ${new Date(o.created_at).toLocaleDateString()}`,
                href: `/admin/orders?id=${o.id}`
            }))

            // 2. Search Menu Items
            const { data: menuItems } = await supabase
                .from('menu_items')
                .select('id, name, price')
                .eq('restaurant_id', String(RESTAURANT_ID))
                .ilike('name', `%${query}%`)
                .limit(3)

            menuItems?.forEach(m => results.push({
                id: m.id,
                type: 'menu',
                title: m.name,
                subtitle: `Menu Item • ₹${m.price}`,
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

    const fetchWalletTotals = useCallback(async () => {
        // 1. Customer Loyalty Pool (Accumulated Points)
        const { data: customerData } = await supabase
            .from('customers')
            .select('loyalty_points')
            .eq('restaurant_id', RESTAURANT_ID)

        // Sum loyalty_points instead of wallet_balance to match Reward Engine
        const total = customerData?.reduce((acc, curr) => acc + (Number(curr.loyalty_points) || 0), 0) || 0
        setTotalCoins(Math.max(0, total)) // Safety guard to never show negative

        // 2. Restaurant Operational Balance (From Super Admin)
        const { data: restData } = await supabase
            .from('restaurants')
            .select('coin_balance')
            .eq('id', String(RESTAURANT_ID))
            .single()
        
        setRestaurantBalance(Number(restData?.coin_balance) || 0)
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
        fetchWalletTotals()

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
                        description: `Total: ₹${newOrder.total.toFixed(2)}`,
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

        // Custom Event listener for cross-component balance refresh
        const handleRefreshEvent = () => fetchWalletTotals()
        window.addEventListener('refresh-admin-balance', handleRefreshEvent)

        return () => {
            supabase.removeChannel(channel)
            window.removeEventListener('refresh-admin-balance', handleRefreshEvent)
        }
    }, [fetchWalletTotals])

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

    const handlePaymentClose = async (method: 'cash' | 'upi' | 'mixed', overrideAmounts?: { cash: number, upi: number }) => {
        if (!selectedDetail || selectedDetail.type !== 'order') return
        setSearching(true)

        const total = Number(selectedDetail.data.total)
        const cashValue = method === 'mixed' ? (overrideAmounts?.cash || 0) : (method === 'cash' ? total : 0)
        const upiValue = method === 'mixed' ? (overrideAmounts?.upi || 0) : (method === 'upi' ? total : 0)

        const customerName = selectedDetail.data.customers?.name || 'Customer'
        const phone = selectedDetail.data.customers?.phone
        const billId = selectedDetail.data.bill_id

        try {
            // --- LOYALTY & ADMIN COINS LOGIC ---
            if ((method === 'cash' || method === 'upi' || method === 'mixed') && Number(total) > 200) {
                const restId = String(RESTAURANT_ID);
                
                // 1. Deduct from Restaurant Admin Coins (Restaurant Cost)
                const { data: restData } = await supabase
                    .from('restaurants')
                    .select('coin_balance, name, coin_deduction_per_order')
                    .eq('id', restId)
                    .single()
                
                if (restData) {
                    const currentRestCoins = Number(restData.coin_balance) || 0
                    const deductAmount = restData.coin_deduction_per_order !== undefined ? Number(restData.coin_deduction_per_order) : 5
                    
                    const { data: updatedRest, error: restUpdateError } = await supabase
                        .from('restaurants')
                        .update({ coin_balance: Math.max(0, currentRestCoins - deductAmount) })
                        .eq('id', restId)
                        .select()

                    if (restUpdateError) {
                        toast.error(`Admin Coin Deduction Failed: ${restUpdateError.message}`)
                    } else if (updatedRest && updatedRest.length > 0) {
                        setRestaurantBalance(updatedRest[0].coin_balance)
                        toast.success(`Deducted ${deductAmount} coins from ${restData.name} for this order`)
                    }
                }

                // 2. Handle Customer Side Settlement
                if (selectedDetail.data.customer_id) {
                    const { data: customerData } = await supabase
                        .from('customers')
                        .select('wallet_balance')
                        .eq('id', selectedDetail.data.customer_id)
                        .maybeSingle();

                    if (customerData) {
                        const currentBalance = Number(customerData.wallet_balance) || 0;
                        const deduction = 5;
                        
                        // A. Deduct balance
                        await supabase
                            .from('customers')
                            .update({ 
                                wallet_balance: currentBalance - deduction,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', selectedDetail.data.customer_id);

                        // B. Record Transaction for Ledger
                        await supabase
                            .from('wallet_transactions')
                            .insert([{
                                customer_id: selectedDetail.data.customer_id,
                                restaurant_id: RESTAURANT_ID,
                                amount: deduction,
                                type: 'debit',
                                reason: `Loyalty Settlement (Order > ₹200)`,
                                order_id: selectedDetail.data.id
                            }]);
                    }
                }
            }
            // -----------------------------------

            // 1. Update Payment Status
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    payment_method: method,
                    notes: method === 'mixed' 
                        ? `Split Payment: Cash ₹${cashValue} + UPI ₹${upiValue}`
                        : `Paid via ${method.toUpperCase()}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedDetail.data.id)

            if (error) throw error

            // 2. Trigger Webhook
            await triggerPaymentWebhook({
                action: 'submit_rating',
                ...selectedDetail.data,
                phone: selectedDetail.data.customers?.phone || '',
                amount: total,
                customerName: customerName,
                itemsOrdered: selectedDetail.data.order_items?.map((i: any) => i.item_name).join(', ') || 'Your Order',
                payment_method: method === 'mixed' 
                    ? `MIXED (Cash: ₹${cashValue} + UPI: ₹${upiValue})`
                    : method.toUpperCase(),
                status: 'completed',
                split_details: method === 'mixed' ? { cash: cashValue, upi: upiValue } : null,
                updated_at: new Date().toISOString()
            });

            toast.success(`Payment marked as ${method.toUpperCase()} ✅`)
            setSelectedDetail(null)
            setIsSplitDialogOpen(false)
            setSearchQuery('')
            setShowResults(false)
            fetchWalletTotals()
        } catch (error) {
            console.error('Payment error:', error)
            toast.error('Failed to update payment')
        } finally {
            setSearching(false)
        }
    }

    const handleLogout = () => {
        // Clear login session
        localStorage.removeItem('admin_logged_in')
        localStorage.removeItem('admin_restaurant_id')

        toast.success('✅ Logged out successfully')
        router.push('/login')
    }

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <header className="h-16 border-b border-gray-100 bg-white/95" />

    return (
        <header className="glass-header h-16 flex items-center justify-between px-6 transition-all border-b border-gray-100 bg-white/95 text-black">
            {/* Search */}
            <div className="flex flex-1 items-center gap-4 relative">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors duration-300" />
                    <Input
                        type="search"
                        placeholder="Search orders, items, customers..."
                        className="pl-10 h-10 w-full bg-gray-50 border-gray-200 ring-0 focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:bg-white transition-all rounded-xl placeholder:text-gray-400 shadow-sm text-black"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('')
                                setSearchResults([])
                                setShowResults(false)
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X className="h-3 w-3 text-gray-400" />
                        </button>
                    )}

                    {/* Search Results Dropdown */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center px-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Search Results
                                </span>
                                {searching && (
                                    <div className="h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {searchResults.length === 0 && !searching ? (
                                    <div className="p-8 text-center">
                                        <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    searchResults.map((result) => (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            className="w-full flex items-center gap-4 p-3 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                                            onClick={() => fetchFullDetails(result)}
                                        >
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105",
                                                result.type === 'order' ? "bg-blue-50 text-blue-600" :
                                                    result.type === 'menu' ? "bg-orange-50 text-orange-600" :
                                                        "bg-purple-50 text-purple-600"
                                            )}>
                                                {result.type === 'order' ? <ShoppingBag className="h-5 w-5" /> :
                                                    result.type === 'menu' ? <UtensilsCrossed className="h-5 w-5" /> :
                                                        <UsersIcon className="h-5 w-5" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm truncate text-gray-900">{result.title}</p>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{result.subtitle}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
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
                {/* 🏦 Restaurant Operational Wallet (Super Admin Controlled) */}
                <div className="hidden md:flex items-center gap-2 h-10 px-3 bg-indigo-50 border border-indigo-200/50 rounded-xl transition-all shadow-sm group">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition-transform group-hover:scale-110">
                        <Zap className="h-3 w-3" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest opacity-60">Admin Coins</span>
                        <span className="text-xs font-black text-indigo-900 tabular-nums tracking-tighter">₹{restaurantBalance.toLocaleString()}</span>
                    </div>
                </div>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
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
                    <DropdownMenuTrigger asChild>
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
                    <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-100 shadow-xl rounded-xl">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1 p-1">
                                <p className="text-sm font-medium leading-none text-gray-900">Dashboard Control</p>
                                <p className="text-xs leading-none text-gray-500 uppercase tracking-widest font-black opacity-30 mt-1">Admin Session</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-100" />
                        <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="cursor-pointer hover:bg-green-50 focus:bg-green-50 rounded-lg my-1 text-gray-700">
                            <User className="mr-2 h-4 w-4 text-gray-500" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="cursor-pointer hover:bg-green-50 focus:bg-green-50 rounded-lg my-1 text-gray-700">
                            <SettingsIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-100" />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-red-600 focus:text-red-700 cursor-pointer hover:bg-red-50 focus:bg-red-50 rounded-lg my-1"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Logout</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
                <DialogContent className="max-w-xl bg-background p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">
                        {selectedDetail?.type} Details
                    </DialogTitle>
                    {selectedDetail?.type === 'order' && (
                        <div className="flex flex-col bg-white">
                            {/* Premium Header */}
                            <div className="flex flex-col gap-1 p-6 pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            Order #{selectedDetail.data.bill_id}
                                            <Badge className={cn(
                                                "ml-2 text-[10px] px-2 py-0.5 uppercase tracking-wide border-0",
                                                selectedDetail.data.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                    selectedDetail.data.status === 'pending' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                                                        "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            )}>
                                                {selectedDetail.data.status}
                                            </Badge>
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            {new Date(selectedDetail.data.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-2">
                                <div className="h-px bg-gray-100 w-full" />
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-6 p-6 pt-2">
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UsersIcon className="h-3.5 w-3.5" /> Customer
                                    </p>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-base">{selectedDetail.data.customers?.name || 'Walk-in Customer'}</p>
                                        <p className="text-sm text-gray-500 font-medium">{selectedDetail.data.customers?.phone || 'No Phone'}</p>
                                    </div>
                                    {(selectedDetail.data.delivery_address || selectedDetail.data.customers?.address) && (
                                        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                                            {selectedDetail.data.delivery_address || selectedDetail.data.customers?.address}
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
                                            <span className="font-semibold text-gray-900 capitalize">{selectedDetail.data.order_type?.replace('_', ' ') || 'Dine In'}</span>
                                        </div>
                                        {selectedDetail.data.restaurant_tables && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 font-medium">Table No:</span>
                                                <span className="font-semibold text-gray-900">#{selectedDetail.data.restaurant_tables.table_number}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Payment:</span>
                                            <span className={cn("font-semibold capitalize", selectedDetail.data.payment_status === 'paid' ? "text-green-600" : "text-orange-600")}>
                                                {selectedDetail.data.payment_status || 'Pending'}
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
                                        {selectedDetail.data.order_items?.map((item: any) => (
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
                                            <span className="font-semibold text-gray-900">₹{selectedDetail.data.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                                            <span className="text-base font-bold text-gray-900">Grand Total</span>
                                            <span className="text-2xl font-black text-gray-900">₹{selectedDetail.data.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-2">
                                    {selectedDetail.data.status !== 'completed' && selectedDetail.data.payment_status !== 'paid' ? (
                                        <div className="grid grid-cols-3 gap-3">
                                            <Button
                                                className="h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm"
                                                onClick={() => handlePaymentClose('cash')}
                                                disabled={searching}
                                            >
                                                Cash
                                            </Button>
                                            <Button
                                                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                                                onClick={() => handlePaymentClose('upi')}
                                                disabled={searching}
                                            >
                                                UPI
                                            </Button>
                                            <Button
                                                className="h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm"
                                                onClick={() => {
                                                    setSplitCash('')
                                                    setSplitUpi('')
                                                    setIsSplitDialogOpen(true)
                                                }}
                                                disabled={searching}
                                            >
                                                Mixed
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="w-full h-11 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm gap-2">
                                            <Star className="h-5 w-5 text-green-600" />
                                            Payment Completed via {selectedDetail.data.payment_method?.toUpperCase()}
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
            {/* --- SPLIT PAYMENT DIALOG (SEARCH FLOW) --- */}
            <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
                <DialogContent className="sm:max-w-[440px] bg-white rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
                    <div className="bg-purple-600 p-7 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-90 relative z-10" />
                        <DialogTitle className="text-2xl font-black relative z-10">Split Search Result</DialogTitle>
                        <DialogDescription className="text-purple-100 font-bold opacity-80 relative z-10">
                            Bill #{selectedDetail?.data?.bill_id} • Total ₹{selectedDetail?.data?.total || 0}
                        </DialogDescription>
                    </div>

                    <div className="p-8 space-y-7">
                        <div className="space-y-4">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cash Contribution</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-10 h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:border-orange-500 transition-all font-black text-xl text-gray-900 shadow-inner"
                                        value={splitCash}
                                        onChange={(e) => {
                                            setSplitCash(e.target.value)
                                            const remaining = Number(selectedDetail?.data?.total || 0) - Number(e.target.value)
                                            setSplitUpi(remaining > 0 ? remaining.toString() : '0')
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">UPI / Online Contribution</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-10 h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:border-blue-500 transition-all font-black text-xl text-gray-900 shadow-inner"
                                        value={splitUpi}
                                        onChange={(e) => setSplitUpi(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button 
                                className={cn(
                                    "w-full h-16 rounded-2xl font-black text-lg shadow-xl",
                                    (Number(splitCash) + Number(splitUpi)) === Number(selectedDetail?.data?.total || 0)
                                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}
                                disabled={searching || (Number(splitCash) + Number(splitUpi)) !== Number(selectedDetail?.data?.total || 0)}
                                onClick={() => handlePaymentClose('mixed', {
                                    cash: Number(splitCash),
                                    upi: Number(splitUpi)
                                })}
                            >
                                {searching ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-6 w-6 mr-3" />}
                                Confirm Split Settlement
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full mt-4 text-gray-400 font-bold hover:text-gray-900 hover:bg-gray-50 rounded-xl"
                                onClick={() => setIsSplitDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    )
}
