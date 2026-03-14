'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, MapPin, Phone, Info, Ticket, Percent, Copy, ChevronRight } from 'lucide-react'
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
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
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
    const joinParam = searchParams.get('join')
    const tableParam = searchParams.get('table')
    const typeParam = searchParams.get('type')

    const { restaurant, loading: loadingRestaurant } = useRestaurant()
    const { categories, items, loading: loadingMenu } = useMenu(restaurant?.id || null)
    const { setTableInfo, setOrderType, orderType, customerPhone, clearCart, setJoinExisting } = useCartStore()

    // Sync URL params with store
    useEffect(() => {
        if (joinParam) {
            setJoinExisting(joinParam === 'true')
        }
    }, [joinParam])

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


    // Handle initialization and order type selection logic
    useEffect(() => {
        const checkTableStatusAndRedirect = async (tNum: number) => {
            const { data: tableData } = await supabase
                .from('restaurant_tables')
                .select('status')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('table_number', tNum)
                .single()

            if (tableData?.status === 'occupied') {
                // If occupied and we don't have a confirmed session link, redirect to scan
                const isConfirmed = sessionStorage.getItem('orderTypeConfirmed')
                if (!isConfirmed) {
                    router.replace(`/customer/scan?table=${tNum}`)
                    return
                }
            }
        }

        // If type provided in URL, respect it
        if (typeParam && ['dine_in', 'take_away', 'home_delivery'].includes(typeParam)) {
            setOrderType(typeParam as any)
            if (tableParam) {
                const tNum = parseInt(tableParam)
                if (!isNaN(tNum)) {
                    const tId = searchParams.get('tableId') || 'qr-scan'
                    setTableInfo(tNum, tId)
                    checkTableStatusAndRedirect(tNum)
                    console.log(`📍 [MENU] Table set to: ${tNum}`)
                }
            }
            sessionStorage.setItem('orderTypeConfirmed', 'true')
            return
        }

        // If table provided, check its status
        if (tableParam) {
            const tNum = parseInt(tableParam)
            if (!isNaN(tNum)) {
                const tId = searchParams.get('tableId') || 'qr-scan'
                setTableInfo(tNum, tId)
                checkTableStatusAndRedirect(tNum)
                console.log(`📍 [MENU] Table set to: ${tNum}`)
            }
        }

        // Show modal if not confirmed in session
        const isConfirmed = sessionStorage.getItem('orderTypeConfirmed')
        if (!isConfirmed) {
            setOrderType(null)
            setShowOrderTypeModal(true)
        } else {
            setShowOrderTypeModal(false)
        }

        // Delay slightly to allow state to settle
        const timer = setTimeout(() => {
            if (!isConfirmed) setShowOrderTypeModal(true)
        }, 800)

        return () => clearTimeout(timer)
    }, [tableParam, typeParam, setTableInfo, setOrderType, router])

    // Set initial active category
    // Effect removed to allow 'All Items' selection

    const handleOrderTypeSelection = (type: 'dine_in' | 'take_away' | 'home_delivery') => {
        setOrderType(type)
        if (tableParam) setTableInfo(parseInt(tableParam), tableParam)
        sessionStorage.setItem('orderTypeConfirmed', 'true')
        setShowOrderTypeModal(false)
        // ❌ router.push NAHI karo — isse useEffect dobara run hota tha
        // aur webhook/side-effects trigger hote the
        toast.success(`${type === 'dine_in' ? '🍽️ Dine In' : type === 'take_away' ? '🛍️ Take Away' : '🏠 Home Delivery'} selected!`)
    }

    const filteredItems = useMemo(() => {
        if (!items) return []
        let result = items

        // Apply Global Restaurant Dietary Setting
        if (restaurant?.dietary_type === 'veg_only') {
            result = result.filter(item => item.is_veg)
        } else if (restaurant?.dietary_type === 'non_veg_only') {
            result = result.filter(item => !item.is_veg)
        }

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

                    {showDietaryToggle && restaurant?.dietary_type === 'both' && (
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

            {/* Order Type Selection Modal - Narrower and more compact */}
            <Dialog open={showOrderTypeModal} onOpenChange={setShowOrderTypeModal}>
                <DialogContent className="max-w-[340px] w-[90%] p-0 overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white/95 backdrop-blur-xl rounded-[2.5rem] fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 outline-none group [&>button]:hidden">
                    <DialogTitle className="sr-only">Select Order Mode</DialogTitle>
                    <div className="p-6 pb-8 flex flex-col items-center gap-6">
                        {/* Header Section */}
                        <div className="relative group/icon">
                            <div className="h-20 w-20 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full flex items-center justify-center relative z-10 border border-orange-100/50 shadow-inner">
                                <Utensils className="h-8 w-8 text-orange-500" />
                            </div>
                            <div className="absolute inset-0 bg-orange-400/10 rounded-full blur-2xl transition-all duration-500" />
                        </div>

                        <div className="space-y-1 text-center">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome! 👋</h2>
                            <p className="text-gray-500 font-medium text-sm px-2">
                                Choose your order mode
                            </p>
                        </div>

                        {/* Options Grid - Narrower */}
                        <div className="grid grid-cols-1 gap-3 w-full px-2">
                            {/* Dine In Card */}
                            <button
                                className="group relative w-full p-3 rounded-2xl bg-white border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 shadow-sm transition-all duration-300 flex items-center gap-4 active:scale-[0.97]"
                                onClick={() => handleOrderTypeSelection('dine_in')}
                            >
                                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 transition-all duration-300">
                                    <Utensils className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-black text-gray-900 text-base">Dine In</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            </button>

                            {/* Take Away Card */}
                            <button
                                className="group relative w-full p-3 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 shadow-sm transition-all duration-300 flex items-center gap-4 active:scale-[0.97]"
                                onClick={() => handleOrderTypeSelection('take_away')}
                            >
                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 transition-all duration-300">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-black text-gray-900 text-base">Take Away</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            </button>

                            {/* Home Delivery Card */}
                            <button
                                className="group relative w-full p-3 rounded-2xl bg-white border border-gray-100 hover:border-green-200 hover:bg-green-50/30 shadow-sm transition-all duration-300 flex items-center gap-4 active:scale-[0.97]"
                                onClick={() => handleOrderTypeSelection('home_delivery')}
                            >
                                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 transition-all duration-300">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-black text-gray-900 text-base">Home Delivery</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            </button>
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
