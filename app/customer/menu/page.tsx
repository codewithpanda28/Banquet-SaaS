'use client'

import React, { useEffect, useState, useMemo, Suspense, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, MapPin, Phone, Info, Ticket, Percent, Copy, ChevronRight, Star, Users, Trophy, Zap, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMenu } from '@/hooks/useMenu'
import { useRestaurant } from '@/hooks/useRestaurant'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { CategoryTabs } from '@/components/menu/CategoryTabs'
import { MenuItemCard } from '@/components/menu/MenuItemCard'
import { FeaturedCarousel } from '@/components/menu/FeaturedCarousel'
import { MenuItemModal } from '@/components/menu/MenuItemModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MenuItem, Coupon } from '@/types'
import { toast } from 'sonner'
import { Utensils, ShoppingBag, Truck, Bike, Gift } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

function MenuContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const joinParam = searchParams.get('join')
    const tableParam = searchParams.get('table')
    const typeParam = searchParams.get('type')

    const { restaurant, loading: loadingRestaurant } = useRestaurant()
    const { categories, items, loading: loadingMenu } = useMenu(restaurant?.id || null)
    const { 
        setTableInfo, 
        setOrderType, 
        orderType, 
        customerPhone, 
        clearCart, 
        setJoinExisting,
        addItem,
        applyCoupon
    } = useCartStore()

    // Sync URL params with store
    useEffect(() => {
        if (joinParam) {
            setJoinExisting(joinParam === 'true')
        }
        
        // 🏆 Referral Capture: Grab referrer code and store for Checkout phase
        const refParam = searchParams.get('ref')
        if (refParam) {
            console.log('🔗 [Loyalty] Referral Captured:', refParam);
            sessionStorage.setItem('referral_source', refParam);
        }
    }, [joinParam, searchParams])

    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showOrderTypeModal, setShowOrderTypeModal] = useState(false)
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
    const [loyaltyPoints, setLoyaltyPoints] = useState(0)
    const [isLoyaltyInfoOpen, setIsLoyaltyInfoOpen] = useState(false)
    const [availableRewards, setAvailableRewards] = useState<any[]>([])
    const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null)
    const [claimedTicket, setClaimedTicket] = useState<{ id: string, name: string, code: string } | null>(null)
    const [referralStats, setReferralStats] = useState({ invited: 0, earned: 0 })
    const [referralCode, setReferralCode] = useState<string>('')
    const [isReferExpanded, setIsReferExpanded] = useState(false)
    const [isPointsExpanded, setIsPointsExpanded] = useState(false)
    const [isReferDialogOpen, setIsReferDialogOpen] = useState(false)
    const floatingRef = useRef<HTMLDivElement>(null)

    // Check available dietary types
    const hasVeg = useMemo(() => items?.some(i => i.is_veg), [items])
    const hasNonVeg = useMemo(() => items?.some(i => !i.is_veg), [items])
    const showDietaryToggle = hasVeg && hasNonVeg

    // Check for "Paid" session to reset
    const [referralSettings, setReferralSettings] = useState<any>(null)

    const checkSessionStatus = useCallback(async () => {
        const rid = String(RESTAURANT_ID)
        
        // Fetch Referral Settings (Dynamic) - Independent of login status
        const { data: refSettings } = await supabase
            .from('referral_settings')
            .select('*')
            .eq('restaurant_id', rid)
            .maybeSingle()
        if (refSettings) setReferralSettings(refSettings)

        if (!customerPhone) return
        const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Safe customer lookup
        const { data: customerData } = await supabase
            .from('customers')
            .select('id, loyalty_points, referral_code')
            .eq('restaurant_id', rid)
            .or(`phone.eq.${customerPhone},phone.eq.${cleanPhone}`)
            .maybeSingle()
        
        if (customerData) {
            setLoyaltyPoints(customerData.loyalty_points || 0)
            
            // 🏆 Persist Referral Code if it's missing in DB to ensure attribution works
            const finalCode = customerData.referral_code || `RE-${cleanPhone.slice(-4)}`;
            setReferralCode(finalCode)
            
            if (!customerData.referral_code) {
                console.log('💾 [Loyalty] Syncing new referral code to DB:', finalCode);
                await supabase
                    .from('customers')
                    .update({ referral_code: finalCode })
                    .eq('id', customerData.id);
            }
    
            // 🏆 Fetch Referral Stats (Viral Analytics)
            const { data: refLogs } = await supabase
                .from('referral_logs')
                .select('id, status')
                .eq('referrer_id', customerData.id)
            
            if (refLogs) {
                const joinedCount = refLogs.filter(r => r.status === 'joined').length
                
                // Calculate earned points dynamically based on settings
                const rewardPerReferral = refSettings?.referrer_reward_type === 'points' 
                    ? refSettings.referrer_reward_value 
                    : 500; // fallback

                setReferralStats({ invited: joinedCount, earned: joinedCount * rewardPerReferral })
            }
        }

        // Fetch Tier Rewards
        const { data: rewardsData } = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('restaurant_id', rid)
            .order('threshold', { ascending: true })
        if (rewardsData) setAvailableRewards(rewardsData)

        if (!customerData) return

        const { data: lastOrder } = await supabase
            .from('orders')
            .select('id, status, payment_status')
            .eq('customer_id', customerData.id)
            .gt('created_at', today.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        console.log("🧐 [Menu] Session Check:", { phone: customerPhone, lastOrder: lastOrder?.id, payment: lastOrder?.payment_status })

        // ONLY reset if payment is completed (paid status)
        // Don't reset just because order is served/completed - customer might order again
        if (lastOrder && lastOrder.payment_status === 'paid') {
            // Previous session is paid. Start fresh.
            console.log("Previous session paid. Resetting cart.")
            clearCart()
            setOrderType(null)
            sessionStorage.removeItem('orderTypeConfirmed')
            return true
        }
        return false
    }, [customerPhone, clearCart, setOrderType, RESTAURANT_ID])

    const handleClaimReward = async (reward: any) => {
        if (!customerPhone) {
            toast.error('Please order something first to link your phone!')
            return
        }
        try {
            setClaimingRewardId(reward.id)
            const rid = String(RESTAURANT_ID)
            const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10)

            // 1. Double check points on server (security)
            const { data: customerData } = await supabase
                .from('customers')
                .select('id, loyalty_points')
                .eq('restaurant_id', rid)
                .or(`phone.eq.${customerPhone},phone.eq.${cleanPhone}`)
                .single()

            if (!customerData || (customerData.loyalty_points || 0) < reward.threshold) {
                toast.error('Insufficient points to claim this reward!')
                return
            }

            // 2. Deduct Points
            const newPoints = customerData.loyalty_points - reward.threshold
            const { error: updateError } = await supabase
                .from('customers')
                .update({ loyalty_points: newPoints })
                .eq('id', customerData.id)

            if (updateError) throw updateError

            // 3. Generate Redemption Ticket
            const ticketCode = `RWD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            
            // 4. Auto-Fulfillment Logic (Universal Reward Integration)
            console.log('🎁 Redempting Reward:', reward.reward_name, 'Type:', reward.reward_type);

            if (reward.reward_type === 'item' || reward.reward_type === 'free' || reward.reward_type === 'free-product') {
                console.log('🔍 Looking for MenuItem ID:', reward.reward_item_id, 'or Name:', reward.reward_name);
                
                // 🔥 Hybrid Lookup: ID First, Name Fallback (for older rewards)
                let menuItem = items.find(i => i.id === reward.reward_item_id);
                if (!menuItem && reward.reward_name) {
                    menuItem = items.find(i => i.name.toLowerCase() === reward.reward_name.toLowerCase());
                }
                
                if (menuItem) {
                    console.log('✅ Found MenuItem! Injecting into Cart...');
                    addItem({ ...menuItem, discounted_price: 0 }, 1, '🎁 LOYALTY REWARD');
                    toast.success(`🎉 ${menuItem.name} added to your Cart! ✨`);
                } else {
                    console.warn('❌ MenuItem NOT FOUND in current menu items list!');
                    toast.error(`Could not locate ${reward.reward_name} in the menu!`);
                }
            } else if (reward.reward_type === 'percentage' || reward.reward_type === 'fixed') {
                console.log('🎟️ Applying Discount Coupon...');
                applyCoupon({
                    id: reward.id,
                    restaurant_id: rid,
                    code: ticketCode,
                    description: `Loyalty Reward: ${reward.reward_name}`,
                    discount_type: reward.reward_type as any,
                    discount_value: Number(reward.discount_value),
                    min_order_amount: 0,
                    max_discount_amount: 9999,
                    valid_from: new Date().toISOString(),
                    valid_until: new Date(Date.now() + 86400000).toISOString(), // 24h
                    is_active: true,
                    created_at: new Date().toISOString()
                });
                toast.success(`🎟️ ${reward.reward_name} reward applied to your cart subtotal!`);
            }

            setLoyaltyPoints(newPoints);

            // 5. Direct-to-Cart: Close modal and OPEN CART immediately
            setIsLoyaltyInfoOpen(false);
            setClaimedTicket(null); 
            
            // Auto-open the cart sidebar to show the reward
            const { openCart } = useUIStore.getState();
            openCart();

        } catch (error) {
            console.error('Claim error:', error)
            toast.error('Failed to claim reward. Please try again.')
        } finally {
            setClaimingRewardId(null)
        }
    }

    useEffect(() => {
        checkSessionStatus()

        const channel = supabase.channel('menu-updates')
            .on(
                'postgres_changes',
                {
                    event: '*', 
                    schema: 'public',
                    table: 'orders'
                },
                async (payload) => {
                    await checkSessionStatus()
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [customerPhone, clearCart, setOrderType, checkSessionStatus])

    // 🏆 Refresh points when Rewards Modal opens
    useEffect(() => {
        if (isLoyaltyInfoOpen) {
            checkSessionStatus()
        }
    }, [isLoyaltyInfoOpen, checkSessionStatus])

    // 🏆 Auto-collapse mobile floating buttons on scroll or click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) {
                setIsReferExpanded(false);
                setIsPointsExpanded(false);
            }
        };

        const handleScroll = () => {
            setIsReferExpanded(false);
            setIsPointsExpanded(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);


    // Handle initialization and order type selection logic
    useEffect(() => {
        const refCode = searchParams.get('ref')
        if (refCode) {
            sessionStorage.setItem('referred_by_code', refCode)
            console.log('📢 [MENU] Referred by:', refCode)
        }

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

    const renderReferReward = () => {
        if (!referralSettings) return "₹500 Reward";
        const type = referralSettings.referrer_reward_type;
        const value = referralSettings.referrer_reward_value;
        const itemId = referralSettings.referrer_reward_item_id;

        if (type === 'points') return `${value} Points`;
        if (type === 'fixed') return `₹${value} Off`;
        if (type === 'percentage') return `${value}% Off`;
        if (type === 'free_item') {
            const item = items.find((i: any) => i.id === itemId);
            return item ? `FREE ${item.name}` : "FREE Item";
        }
        return "Reward";
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
            {/* 🏷️ Restaurant Branding Header */}
            <div className="relative group overflow-hidden bg-slate-900 h-56 md:h-72">
                {restaurant?.banner_url ? (
                    <img
                        src={restaurant.banner_url}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60"
                        alt="Banner"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-gradient opacity-60" />
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
                
                {/* 🏆 Referral & Loyalty Floating Badges */}
                <div ref={floatingRef} className={cn(
                    "z-[100] flex flex-col items-end gap-3 transition-all duration-500",
                    "fixed right-0 top-1/2 -translate-y-1/2 floating-nav-container", // Mobile
                    "md:absolute md:top-6 md:right-6 md:translate-y-0 md:z-20 md:gap-2" // Desktop
                )}>
                    {/* Points Button */}
                    <Button 
                        onClick={() => {
                            if (window.innerWidth < 768 && !isPointsExpanded) {
                                setIsPointsExpanded(true);
                                return;
                            }
                            setIsLoyaltyInfoOpen(true);
                        }}
                        className={cn(
                            "group flex items-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden",
                            // Mobile Styles
                            "h-14 w-48 rounded-l-full p-0 flex-row bg-slate-900/95 backdrop-blur-3xl border-l border-y border-white/20 translate-x-[142px]",
                            isPointsExpanded ? "translate-x-0 bg-slate-900 shadow-2xl" : "",
                            // Desktop Styles (md:) - Reverting to original
                            "md:h-10 md:w-auto md:translate-x-0 md:rounded-2xl md:px-4 md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:shadow-xl md:font-black md:text-[10px] md:uppercase md:tracking-widest md:gap-2 md:hover:bg-white/20"
                        )}
                    >
                        {/* Icon Container - Only circle on mobile */}
                        <div className="w-14 h-14 flex items-center justify-center shrink-0 md:w-auto md:h-auto md:border-none">
                            <div className={cn(
                                "flex items-center justify-center transition-all duration-500",
                                "h-9 w-9 rounded-full bg-yellow-500/10 md:h-auto md:w-auto md:bg-transparent" // Revert on desktop
                            )}>
                                <Star className="h-5 w-5 md:h-4 md:w-4 text-yellow-500 fill-yellow-500" />
                            </div>
                        </div>

                        {/* Text Container */}
                        <div className={cn(
                            "flex-1 px-4 text-center transition-all duration-500 md:flex-none md:px-0 md:opacity-100 md:translate-x-0",
                            isPointsExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                        )}>
                            <p className="font-black text-[11px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-widest whitespace-nowrap">
                                {loyaltyPoints || 0} Points
                            </p>
                        </div>
                    </Button>

                    <Dialog open={isReferDialogOpen} onOpenChange={setIsReferDialogOpen}>
                        <Button 
                            onClick={() => {
                                if (window.innerWidth < 768 && !isReferExpanded) {
                                    setIsReferExpanded(true);
                                    return;
                                }
                                setIsReferDialogOpen(true);
                            }}
                            className={cn(
                                "group flex items-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden border-none text-white",
                                // Mobile Styles
                                "h-14 w-48 rounded-l-full p-0 flex-row bg-gradient-to-br from-indigo-600 to-purple-800 shadow-[0_10px_40px_rgba(79,70,229,0.3)] translate-x-[142px]",
                                isReferExpanded ? "translate-x-0" : "",
                                // Desktop Styles (md:) - Reverting to original
                                "md:h-10 md:w-auto md:translate-x-0 md:rounded-2xl md:px-4 md:bg-gradient-to-r md:from-indigo-500 md:to-purple-500 md:shadow-indigo-500/20 md:font-black md:text-[10px] md:uppercase md:tracking-widest md:gap-2 md:hover:scale-105 md:active:scale-95 shadow-xl"
                            )}
                        >
                            {/* Icon Container */}
                            <div className="w-14 h-14 flex items-center justify-center shrink-0 md:w-auto md:h-auto">
                                <div className={cn(
                                    "flex items-center justify-center transition-all duration-500",
                                    "h-9 w-9 rounded-full bg-white/20 md:h-auto md:w-auto md:bg-transparent"
                                )}>
                                    <Ticket className="h-5 w-5 md:h-4 md:w-4 text-white" />
                                </div>
                            </div>

                            {/* Text Container */}
                            <div className={cn(
                                "flex-1 px-4 text-center transition-all duration-500 md:flex-none md:px-0 md:opacity-100 md:translate-x-0",
                                isReferExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                            )}>
                                <p className="font-black text-[11px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-widest whitespace-nowrap">
                                    Refer & Earn
                                </p>
                            </div>
                        </Button>
                        <DialogContent className="p-0 border-none bg-slate-950 max-w-[320px] w-[90%] rounded-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
                            
                            {/* 📱 Header Section */}
                            <div className="relative pt-6 pb-3 text-center border-b border-white/5 bg-white/[0.02] shrink-0">
                                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl mb-2 shadow-2xl shadow-indigo-500/20">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <DialogTitle className="text-white text-xl font-black tracking-tight mb-0.5">Invite Friends</DialogTitle>
                                <DialogDescription className="text-slate-400 text-[10px] max-w-[220px] mx-auto font-medium">
                                    Invite a friend & get <span className="text-white font-black bg-indigo-500/30 px-1.5 py-0.5 rounded-md border border-indigo-500/20">{renderReferReward()}</span> when they order!
                                </DialogDescription>
                            </div>

                            <div className="p-4 space-y-4 relative overflow-y-auto flex-1 custom-scrollbar">
                                {/* 🎁 Referral Card */}
                                <div className="bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 p-4 rounded-[1.5rem] text-center shadow-inner relative overflow-hidden group">
                                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Unique Code</p>
                                    <div className="text-2xl font-black text-white tracking-[0.2em] mb-4 select-all bg-black/40 py-2.5 rounded-lg border border-white/5 shadow-inner">
                                        {referralCode || (customerPhone ? `RE-${customerPhone.replace(/\D/g, '').slice(-4)}` : 'GUEST')}
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        <Button 
                                            variant="default"
                                            onClick={() => {
                                                const code = referralCode || `RE-${customerPhone?.replace(/\D/g, '').slice(-4)}`;
                                                const url = `${window.location.protocol}//${window.location.host}/customer/menu?id=${RESTAURANT_ID}&ref=${code}`;
                                                
                                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                                    navigator.clipboard.writeText(url).then(() => {
                                                        toast.success('Link Copied! 🚀');
                                                    }).catch(() => {
                                                        // Fallback for some browsers
                                                        const el = document.createElement('textarea');
                                                        el.value = url;
                                                        document.body.appendChild(el);
                                                        el.select();
                                                        document.execCommand('copy');
                                                        document.body.removeChild(el);
                                                        toast.success('Link Copied! 🚀');
                                                    });
                                                } else {
                                                    toast.error('Browser blocked copy.');
                                                }
                                            }}
                                            className="rounded-[0.8rem] bg-white text-black hover:bg-slate-100 h-10 font-black text-[10px] uppercase tracking-widest gap-2.5 shadow-xl shadow-white/5 active:scale-95 transition-all w-full"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Copy Invite Link
                                        </Button>
                                        
                                        <Button 
                                            variant="default"
                                            onClick={() => {
                                                const code = referralCode || `RE-${customerPhone?.replace(/\D/g, '').slice(-4)}`;
                                                const url = `${window.location.protocol}//${window.location.host}/customer/menu?id=${RESTAURANT_ID}&ref=${code}`;
                                                const text = `Join me at this restaurant! 🔥 Use my code & we both get rewards! 🍔\n\n${url}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                            }}
                                            className="rounded-[0.8rem] bg-[#25D366] text-white hover:bg-[#128C7E] h-10 font-black text-[10px] uppercase tracking-widest gap-2.5 shadow-xl shadow-green-500/20 active:scale-95 transition-all w-full"
                                        >
                                            <Bike className="h-4 w-4" />
                                            Share via WhatsApp
                                        </Button>
                                    </div>
                                </div>

                                {/* 📊 Mini Stats */}
                                <div className="grid grid-cols-2 gap-3 pb-2">
                                    <div className="bg-white/5 p-3 rounded-[1.2rem] border border-white/10 text-center backdrop-blur-sm">
                                        <p className="text-lg font-black text-white mb-0.5">{referralStats.invited}</p>
                                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Dost Joined</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-[1.2rem] border border-white/10 text-center backdrop-blur-sm">
                                        <p className="text-lg font-black text-purple-400 mb-0.5">{referralStats.earned}</p>
                                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Points Won</p>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 bg-gradient-to-t from-black via-black/20 to-transparent">
                    <div className="flex items-center gap-4 md:gap-8 transform group-hover:translate-x-2 transition-transform duration-500">
                        {restaurant?.logo_url ? (
                            <div className="h-20 w-20 md:h-28 md:w-28 rounded-3xl bg-white p-2 shadow-2xl border-4 border-white/20 overflow-hidden shrink-0">
                                <img src={restaurant.logo_url} className="w-full h-full object-contain" alt="Logo" />
                            </div>
                        ) : (
                            <div className="h-20 w-20 md:h-28 md:w-28 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shrink-0">
                                <Utensils className="w-10 h-10 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-lg">
                                {restaurant?.name || 'Loading...'}
                            </h1>
                            {restaurant?.tagline && (
                                <p className="text-sm md:text-lg text-white/80 font-medium italic mt-1 drop-shadow-md">
                                    {restaurant.tagline}
                                </p>
                            )}
                            <div className="flex gap-4 mt-4 text-[10px] md:text-xs">
                                <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1 backdrop-blur-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> OPEN NOW
                                </div>
                                <div className="px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 flex items-center gap-1 backdrop-blur-md">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> 4.8 Ratings
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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

            {/* 🏆 Loyalty Milestone Details - Customer Modal */}
            <Dialog open={isLoyaltyInfoOpen} onOpenChange={setIsLoyaltyInfoOpen}>
                <DialogContent className="max-w-[340px] w-[90%] p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 outline-none">
                    <DialogHeader className="p-0">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
                            <Star className="h-8 w-8 mx-auto mb-2 text-yellow-400 fill-yellow-400 animate-pulse" />
                            <DialogTitle className="text-xl font-black tracking-tight italic">Rewards Program</DialogTitle>
                            <DialogDescription className="text-indigo-100 text-[9px] font-bold uppercase tracking-widest mt-1">Unlock Exclusive Perks</DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="p-6 pt-2 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Integrated Progress & Points Card */}
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Balance</p>
                                    <p className="text-3xl font-black text-gray-900 tracking-tight">{loyaltyPoints} <span className="text-xs text-indigo-500 font-bold uppercase ml-1">Pts</span></p>
                                </div>
                                <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                                    <Trophy className="h-7 w-7 text-yellow-500 fill-yellow-500" />
                                </div>
                            </div>
                        </div>

                        {/* Rewards Progress List - "The Lalach Engine" */}
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                                Available Perks 🎁
                                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{availableRewards.length} Tiers</span>
                            </h3>
                            
                            <div className="space-y-4">
                                {availableRewards.length === 0 ? (
                                    <div className="py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest italic">
                                        No rewards active yet.
                                    </div>
                                ) : (
                                    availableRewards.map((reward, i) => {
                                        const isUnlocked = loyaltyPoints >= reward.threshold;
                                        const progress = Math.min((loyaltyPoints / reward.threshold) * 100, 100);

                                        return (
                                            <div key={reward.id} className={cn(
                                                "relative p-4 rounded-[2rem] border transition-all duration-500",
                                                isUnlocked 
                                                    ? "bg-indigo-50 border-indigo-100 shadow-lg shadow-indigo-100/50" 
                                                    : "bg-white border-slate-100"
                                            )}>
                                                <div className="flex items-center gap-4">
                                                    <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-50 overflow-hidden shrink-0 relative">
                                                        {reward.reward_image ? (
                                                            <img src={reward.reward_image} className="w-full h-full object-cover" alt={reward.reward_name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                                <Star className="h-6 w-6 text-slate-200" />
                                                            </div>
                                                        )}
                                                        {isUnlocked && (
                                                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center backdrop-blur-[2px]">
                                                                <div className="bg-white rounded-full p-1 shadow-lg">
                                                                    <Zap className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest",
                                                                isUnlocked ? "text-indigo-600" : "text-slate-400"
                                                            )}>
                                                                {reward.threshold} Points Required
                                                            </span>
                                                        </div>
                                                        <p className={cn(
                                                            "font-black text-base tracking-tight truncate",
                                                            isUnlocked ? "text-indigo-900" : "text-slate-900"
                                                        )}>
                                                            {reward.reward_name}
                                                        </p>
                                                        
                                                        {/* Individual Tier Progress */}
                                                        {!isUnlocked ? (
                                                            <div className="mt-3 space-y-1.5">
                                                                <div className="flex justify-between text-[8px] font-bold text-slate-400 tracking-widest uppercase">
                                                                    <span>Progress</span>
                                                                    <span>{reward.threshold - loyaltyPoints} to go</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                                                    <div 
                                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3">
                                                                {claimedTicket && claimedTicket.id === reward.id ? (
                                                                    <div className="bg-green-600 text-white p-3 rounded-2xl text-center shadow-lg animate-in zoom-in-95 duration-300 relative group/ticket cursor-pointer active:scale-95 transition-all"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(claimedTicket.code);
                                                                            toast.success('Redemption code copied! 📋');
                                                                        }}
                                                                    >
                                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">REDEMPTION CODE</p>
                                                                        <div className="flex items-center justify-center gap-2 mt-1">
                                                                            <p className="text-xl font-black font-mono tracking-tighter">{claimedTicket.code}</p>
                                                                            <Copy className="h-4 w-4 opacity-50" />
                                                                        </div>
                                                                        <p className="text-[8px] font-bold opacity-80 mt-1 uppercase tracking-tight">Tap to Copy & show the waiter</p>
                                                                    </div>
                                                                ) : (
                                                                    <Button 
                                                                        variant="default" 
                                                                        size="sm" 
                                                                        className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                                                                        onClick={() => handleClaimReward(reward)}
                                                                        disabled={!!claimingRewardId}
                                                                    >
                                                                        {claimingRewardId === reward.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "CLAIM REWARD NOW"}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <Button 
                            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                            onClick={() => setIsLoyaltyInfoOpen(false)}
                        >
                            Earn More Points <ChevronRight className="h-4 w-4" />
                        </Button>
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
