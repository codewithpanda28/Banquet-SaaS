'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, MapPin, Phone, Info, Ticket, Percent, Copy } from 'lucide-react'
import { useMenu } from '@/hooks/useMenu'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { CategoryTabs } from '@/components/menu/CategoryTabs'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { FeaturedCarousel } from '@/components/menu/FeaturedCarousel'
import { MenuItemModal } from '@/components/menu/MenuItemModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MenuItem, Coupon } from '@/types'
import { toast } from 'sonner'
import { Utensils, ShoppingBag, Truck, Bike } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAvailableCoupons } from '@/actions/coupon'
import { format } from 'date-fns'
import { triggerAutomationWebhook } from '@/lib/webhook'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

function MenuContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tableParam = searchParams.get('table')
    const typeParam = searchParams.get('type')

    const { restaurant, loading: loadingRestaurant } = useRestaurant()
    const { categories, items, loading: loadingMenu } = useMenu(restaurant?.id || null)
    const { setTableInfo, setOrderType, orderType, customerPhone, clearCart } = useCartStore()

    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showOrderTypeModal, setShowOrderTypeModal] = useState(false)
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])

    // Check available dietary types
    const hasVeg = useMemo(() => items?.some(i => i.is_veg), [items])
    const hasNonVeg = useMemo(() => items?.some(i => !i.is_veg), [items])
    const showDietaryToggle = hasVeg && hasNonVeg

    // Check for "Paid" session to reset
    const checkSessionStatus = async () => {
        if (!customerPhone) return

        const { data } = await supabase
            .from('orders')
            .select('status, payment_status, customers!inner(phone)')
            .eq('customers.phone', customerPhone)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        // ONLY reset if payment is completed (paid status)
        // Don't reset just because order is served/completed - customer might order again
        if (data && data.payment_status === 'paid') {
            // Previous session is paid. Start fresh.
            console.log("Previous session paid. Resetting cart.")
            clearCart()
            setOrderType(null)
            sessionStorage.removeItem('orderTypeConfirmed')
            return true
        }
        return false
    }

    useEffect(() => {
        checkSessionStatus()

        // Realtime listener for session reset
        // if (!customerPhone) return - We want to listen even if phone changes? No, phone is key.

        const channel = supabase.channel('menu-updates')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events to catch status changes
                    schema: 'public',
                    table: 'orders'
                },
                async (payload) => {
                    // Re-checking session status is safe and robust.
                    await checkSessionStatus()
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [customerPhone, clearCart, setOrderType])

    // Order Type Selection
    const handleOrderTypeSelect = (type: 'dine_in' | 'take_away' | 'home_delivery') => {
        setOrderType(type)
        if (type === 'dine_in' && tableParam) {
            if (tableParam) setTableInfo(parseInt(tableParam), 'qr-scan')
        }
    }

    // Handle initialization and order type selection logic
    useEffect(() => {
        // If type provided in URL, respect it
        if (typeParam && ['dine_in', 'take_away', 'home_delivery'].includes(typeParam)) {
            setOrderType(typeParam as any)
            if (tableParam) setTableInfo(parseInt(tableParam), 'unknown-guid-placeholder')
            sessionStorage.setItem('orderTypeConfirmed', 'true')
            return
        }

        // If table provided, set table but ASK for mode (removed auto-set)
        if (tableParam) {
            setTableInfo(parseInt(tableParam), 'qr-scan')

            // Trigger QR Scan Webhook (once per scan)
            const hasScanned = sessionStorage.getItem(`qr_scanned_${tableParam}`)
            if (!hasScanned) {
                triggerAutomationWebhook('qr-scan', {
                    table_id: tableParam,
                    timestamp: new Date().toISOString(),
                    restaurant_id: restaurant?.id
                })
                sessionStorage.setItem(`qr_scanned_${tableParam}`, 'true')
            }
        }

        // Show modal if not confirmed in session
        const isConfirmed = sessionStorage.getItem('orderTypeConfirmed')
        if (!isConfirmed) {
            setOrderType(null) // Reset order type to force modal if not confirmed
            setShowOrderTypeModal(true)
        } else {
            setShowOrderTypeModal(false)
        }

        // Delay slightly to allow state to settle
        const timer = setTimeout(() => {
            if (!isConfirmed) setShowOrderTypeModal(true)
        }, 800)

        return () => clearTimeout(timer)
    }, [tableParam, typeParam, setTableInfo, setOrderType])

    // Set initial active category
    // Effect removed to allow 'All Items' selection

    const handleOrderTypeSelection = (type: 'dine_in' | 'take_away' | 'home_delivery') => {
        setOrderType(type)
        sessionStorage.setItem('orderTypeConfirmed', 'true')
        setShowOrderTypeModal(false)

        const params = new URLSearchParams(searchParams.toString())
        params.set('type', type)
        router.push(`?${params.toString()}`)

        toast.success(`Order mode set to ${type.replace('_', ' ').toUpperCase()}`)
    }

    const filteredItems = useMemo(() => {
        if (!items) return []
        let result = items

        if (activeCategory !== 'all') {
            result = result.filter(item => item.category_id === activeCategory)
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            )
        }

        if (dietaryFilter === 'veg') {
            result = result.filter(item => item.is_veg)
        } else if (dietaryFilter === 'non-veg') {
            result = result.filter(item => !item.is_veg)
        }

        return result
    }, [items, activeCategory, searchQuery, dietaryFilter])

    const handleItemClick = (item: MenuItem) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    if (loadingRestaurant || loadingMenu) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-background">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-xl shadow-primary/20" />
                <p className="text-muted-foreground animate-pulse font-medium tracking-wide">Prepping your menu...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white pb-32">
            {/* Categories - Sticky Top */}
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
                <CategoryTabs
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />
            </div>

            {/* Scrollable Content */}
            <div className="space-y-2">

                {/* Featured Carousel (Only show if no search query & active category is 'all' or first one if 'all' isn't used) */}
                {/* Actually, let's show it always at top unless searching */}
                {!searchQuery && (
                    <FeaturedCarousel items={items} onAdd={handleItemClick} />
                )}

                {/* Search Bar - Floating Style */}
                {/* Search Bar - Standard Scrollable */}
                <div className="px-4 pt-4 pb-2 space-y-3">
                    <div className="max-w-xl mx-auto relative bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden group focus-within:ring-2 ring-orange-500/20 transition-all duration-300">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                        <Input
                            placeholder="Search dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-transparent border-0 focus-visible:ring-0 text-sm font-bold text-slate-900 placeholder:text-gray-400 placeholder:font-medium"
                        />
                    </div>

                    {showDietaryToggle && (
                        <div className="flex justify-center">
                            <div className="bg-white p-0.5 rounded-full border shadow-sm flex gap-0.5 scale-90 origin-top">
                                <button
                                    onClick={() => setDietaryFilter('all')}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${dietaryFilter === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setDietaryFilter('veg')}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${dietaryFilter === 'veg' ? 'bg-green-100 text-green-700 shadow-inner' : 'text-gray-500 hover:bg-green-50'}`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full border border-green-600 bg-green-600" />
                                    Veg
                                </button>
                                <button
                                    onClick={() => setDietaryFilter('non-veg')}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${dietaryFilter === 'non-veg' ? 'bg-red-100 text-red-700 shadow-inner' : 'text-gray-500 hover:bg-red-50'}`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full border border-red-600 bg-red-600" />
                                    Non-Veg
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items Grid */}
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-4 mt-2">
                        <h2 className="text-xl font-black tracking-tight text-foreground">
                            {categories.find(c => c.id === activeCategory)?.name || 'Menu'}
                        </h2>
                        <span className="text-xs font-bold text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                            {filteredItems.length} items
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    onAdd={() => handleItemClick(item)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
                                <Search className="h-12 w-12 opacity-10" />
                                <p className="font-medium">No items found matching your taste.</p>
                                <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Item Details Modal */}
            <MenuItemModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            {/* Order Type Selection Modal */}
            <Dialog open={showOrderTypeModal} onOpenChange={setShowOrderTypeModal}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-md [&>button]:hidden text-center rounded-3xl z-[100]">
                    <div className="p-8 flex flex-col items-center gap-6">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center animate-bounce duration-1000">
                            <Utensils className="h-10 w-10 text-primary" />
                        </div>

                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-black text-gray-900">Welcome! 👋</DialogTitle>
                            <DialogDescription className="text-gray-500 font-medium text-base">
                                How would you like to order today?
                            </DialogDescription>
                        </div>

                        <div className="grid grid-cols-1 gap-4 w-full">
                            <Button
                                className="h-16 text-lg font-bold rounded-2xl bg-white border-2 border-orange-100 hover:border-primary hover:bg-orange-50 text-gray-700 hover:text-primary shadow-sm flex items-center justify-between px-6 group transition-all"
                                onClick={() => handleOrderTypeSelection('dine_in')}
                            >
                                <span className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-primary/20 transition-colors">
                                        <Utensils className="h-5 w-5 text-orange-600 group-hover:text-primary" />
                                    </div>
                                    Dine In
                                </span>
                                <div className="h-4 w-4 rounded-full border-2 border-gray-200 group-hover:border-primary group-hover:bg-primary transition-all" />
                            </Button>

                            <Button
                                className="h-16 text-lg font-bold rounded-2xl bg-white border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-600 shadow-sm flex items-center justify-between px-6 group transition-all"
                                onClick={() => handleOrderTypeSelection('take_away')}
                            >
                                <span className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                                    </div>
                                    Take Away
                                </span>
                                <div className="h-4 w-4 rounded-full border-2 border-gray-200 group-hover:border-blue-500 group-hover:bg-blue-500 transition-all" />
                            </Button>

                            <Button
                                className="h-16 text-lg font-bold rounded-2xl bg-white border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-gray-700 hover:text-green-600 shadow-sm flex items-center justify-between px-6 group transition-all"
                                onClick={() => handleOrderTypeSelection('home_delivery')}
                            >
                                <span className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                        <Truck className="h-5 w-5 text-green-600" />
                                    </div>
                                    Home Delivery
                                </span>
                                <div className="h-4 w-4 rounded-full border-2 border-gray-200 group-hover:border-green-500 group-hover:bg-green-500 transition-all" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function MenuPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-neutral-50">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MenuContent />
        </Suspense>
    )
}
