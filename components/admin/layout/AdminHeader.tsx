'use client'

import { Bell, Search, User, LogOut, Settings as SettingsIcon, ShoppingBag, UtensilsCrossed, Users as UsersIcon, X, Clock, MapPin, Star, DollarSign, Smartphone } from 'lucide-react'
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
                .eq('restaurant_id', RESTAURANT_ID)
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
                .eq('restaurant_id', RESTAURANT_ID)
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
                .eq('restaurant_id', RESTAURANT_ID)
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
        // Subscribe to new orders
        const channel = supabase
            .channel('admin-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${RESTAURANT_ID}`
                },
                (payload) => {
                    const newOrder = payload.new as any
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

    const handlePaymentClose = async (method: 'cash' | 'upi') => {
        if (!selectedDetail || selectedDetail.type !== 'order') return

        const customerName = selectedDetail.data.customers?.name || 'Customer'
        const phone = selectedDetail.data.customers?.phone
        const billId = selectedDetail.data.bill_id
        const total = selectedDetail.data.total

        // Open WhatsApp Message
        if (phone) {
            let formattedPhone = phone.replace(/[^0-9]/g, '')
            if (formattedPhone.length === 10) {
                formattedPhone = '91' + formattedPhone
            }

            const message = encodeURIComponent(
                `*Receipt from Restaurant*\n\n` +
                `Hi ${customerName},\n` +
                `Your payment of *₹${total.toFixed(2)}* for Order *${billId}* has been received via ${method.toUpperCase()}.\n\n` +
                `Thank you for visiting us! 🙏`
            )

            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`
            const waWindow = window.open(whatsappUrl, '_blank')
            if (!waWindow) {
                toast.error('WhatsApp popup blocked. Please allow popups for this site.', {
                    duration: 5000,
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
                .eq('id', selectedDetail.data.id)

            if (error) throw error

            toast.success(`Order marked as paid via ${method.toUpperCase()}`)
            if (!phone) {
                toast.info('Order marked as paid (No phone number found for receipt)')
            }
            setSelectedDetail(null)
        } catch (error) {
            console.error('Payment error:', error)
            toast.error('Failed to close payment')
        }
    }

    const handleLogout = () => {
        // Clear login session
        localStorage.removeItem('admin_logged_in')
        localStorage.removeItem('admin_email')

        toast.success('✅ Logged out successfully')
        router.push('/login')
    }

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
                                <p className="text-sm font-medium leading-none text-gray-900">Restaurant Admin</p>
                                <p className="text-xs leading-none text-gray-500">admin@restaurant.com</p>
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
                <DialogContent className="max-w-xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">
                        {selectedDetail?.type} Details
                    </DialogTitle>
                    {selectedDetail?.type === 'order' && (
                        <div className="flex flex-col">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 border border-white/20 z-10">
                                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{selectedDetail.data.status}</span>
                                </div>
                                <ShoppingBag className="h-12 w-12 mb-4 opacity-70 relative z-10" />
                                <h2 className="text-3xl font-black tracking-tight relative z-10">{selectedDetail.data.bill_id}</h2>
                                <p className="text-blue-100/90 font-medium flex items-center gap-2 mt-1 relative z-10">
                                    <Clock className="h-3 w-3" />
                                    {new Date(selectedDetail.data.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>

                            <div className="p-8 space-y-8 bg-white">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer Name</p>
                                        <p className="text-lg font-bold text-gray-900">{selectedDetail.data.customers?.name || 'Walk-in'}</p>
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <div className="p-1.5 bg-gray-100 rounded-full">
                                                <UsersIcon className="h-3 w-3" />
                                            </div>
                                            <span className="text-xs font-semibold">{selectedDetail.data.customers?.phone || 'No phone'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Value</p>
                                        <p className="text-3xl font-black text-green-600">₹{selectedDetail.data.total.toFixed(2)}</p>
                                        <p className="text-[10px] font-bold text-gray-400">Incl. all taxes & charges</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Items Summary</p>
                                        <Badge variant="outline" className="text-[10px] font-bold border-gray-200 bg-gray-50 text-gray-600">
                                            {selectedDetail.data.order_items?.length || 0} ITEMS
                                        </Badge>
                                    </div>
                                    <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                                        {selectedDetail.data.order_items?.map((item: any) => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center h-6 w-6 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="font-bold text-gray-900 text-sm">{item.item_name}</span>
                                                </div>
                                                <span className="font-extrabold text-gray-900 text-sm">₹{item.total.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button
                                        className="flex-1 h-12 rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20 text-white font-bold transition-all active:scale-95 flex items-center gap-2"
                                        onClick={() => handlePaymentClose('cash')}
                                    >
                                        <DollarSign className="h-4 w-4" />
                                        Cash Paid
                                    </Button>
                                    <Button
                                        className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 text-white font-bold transition-all active:scale-95 flex items-center gap-2"
                                        onClick={() => handlePaymentClose('upi')}
                                    >
                                        <Smartphone className="h-4 w-4" />
                                        Online Paid
                                    </Button>
                                    <Button variant="outline" className="px-6 h-12 rounded-2xl border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 text-gray-600" onClick={() => setSelectedDetail(null)}>Close</Button>
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
