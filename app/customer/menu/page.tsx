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
    const [referralStats, setReferralStats] = useState({ invited: 0, earned: 0, unclaimedInvites: 0, unclaimedEarned: 0 })
    const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null)
    const [isClaimingReferral, setIsClaimingReferral] = useState(false)
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
            setCurrentCustomerId(customerData.id)
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
                const claimedCount = refLogs.filter(r => r.status === 'claimed').length
                
                // Calculate earned points dynamically based on settings
                const rewardPerReferral = refSettings?.referrer_reward_type === 'points' 
                    ? refSettings.referrer_reward_value 
                    : 500; // fallback

                setReferralStats({ 
                    invited: joinedCount + claimedCount, 
                    earned: (joinedCount + claimedCount) * rewardPerReferral,
                    unclaimedInvites: joinedCount,
                    unclaimedEarned: joinedCount * rewardPerReferral
                })
            }
        }

        // Fetch Tier Rewards
        const { data: rewardsData } = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('restaurant_id', rid)
            .order('threshold', { ascending: true })
        if (rewardsData) setAvailableRewards(rewardsData)
        
        // 🎫 Fetch Private & Public Coupons for this specific session
        const { data: couponData } = await supabase
            .from('coupons')
            .select('*')
            .eq('restaurant_id', rid)
            .eq('is_active', true)
            .gt('valid_until', new Date().toISOString())
            .or(`customer_id.is.null,customer_id.eq.${customerData?.id}`)

        if (couponData) {
            setAvailableCoupons(couponData)
        }

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

        // ONLY reset if payment is completed (paid status) AND we haven't already reset for this specific order
        if (lastOrder && lastOrder.payment_status === 'paid') {
            const lastCleared = localStorage.getItem('last_cleared_order_id')
            if (lastCleared !== lastOrder.id) {
                console.log("Previous session paid. Resetting cart ONCE for this order.")
                clearCart()
                setOrderType(null)
                sessionStorage.removeItem('orderTypeConfirmed')
                localStorage.setItem('last_cleared_order_id', lastOrder.id)
                return true
            }
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

    const handleClaimReferralPoints = async () => {
        if (!currentCustomerId || referralStats.unclaimedInvites === 0) {
            toast.error('No pending points to claim!');
            return;
        }
        
        setIsClaimingReferral(true);
        try {
            // 1. Calculate new points
            const newTotalPoints = loyaltyPoints + referralStats.unclaimedEarned;
            
            // 2. Add to customer balance
            const { error: customerError } = await supabase
                .from('customers')
                .update({ loyalty_points: newTotalPoints })
                .eq('id', currentCustomerId);
                
            if (customerError) throw customerError;
            
            // 3. Mark logs as claimed
            const { error: logError } = await supabase
                .from('referral_logs')
                .update({ status: 'claimed' })
                .eq('referrer_id', currentCustomerId)
                .eq('status', 'joined');
                
            if (logError) throw logError;
            
            // 4. Update UI
            setLoyaltyPoints(newTotalPoints);
            setReferralStats(prev => ({
                ...prev,
                unclaimedInvites: 0,
                unclaimedEarned: 0
            }));
            
            toast.success(`🎉 ${referralStats.unclaimedEarned} points successfully claimed and added to your wallet!`);
        } catch (error) {
            console.error('Failed to claim points:', error);
            toast.error('Failed to claim points. Please try again later.');
        } finally {
            setIsClaimingReferral(false);
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
        <div className="min-h-screen bg-white pb-32 selection:bg-orange-100 selection:text-orange-900">
            {/* ✨ Premium Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-100/30 rounded-full blur-[120px] -translate-y-1/2" />
                <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-indigo-50/40 rounded-full blur-[100px] translate-x-1/2" />
                <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-rose-50/30 rounded-full blur-[80px] -translate-x-1/2" />
            </div>

            {/* 🏆 Referral & Loyalty Floating Badges (Pinned to viewport) */}
            <div ref={floatingRef} className={cn(
                "z-[100] flex flex-col items-end gap-2.5 transition-all duration-500",
                "fixed right-0 top-1/2 -translate-y-1/2 floating-nav-container"
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
                        "group flex items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden",
                        "h-12 sm:h-14 w-44 sm:w-48 rounded-l-full p-0 flex-row bg-slate-950/90 backdrop-blur-2xl border-l border-y border-white/10 shadow-2xl",
                        "translate-x-[126px] sm:translate-x-[142px] hover:translate-x-0 focus-within:translate-x-0",
                        isPointsExpanded ? "translate-x-0 bg-slate-950" : ""
                    )}
                >
                    <div className="w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center shrink-0">
                        <div className="flex items-center justify-center transition-all duration-500 h-8 sm:h-9 w-8 sm:w-9 rounded-full bg-yellow-500/20 group-hover:scale-110">
                            <Star className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 fill-yellow-500" />
                        </div>
                    </div>
                    <div className={cn(
                        "flex-1 px-4 text-center transition-all duration-500",
                        "opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0",
                        isPointsExpanded ? "opacity-100 translate-x-0" : ""
                    )}>
                        <p className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap text-white">
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
                            "group flex items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden border-none text-white",
                            "h-12 sm:h-14 w-44 sm:w-48 rounded-l-full p-0 flex-row bg-gradient-to-br from-indigo-600 to-purple-800 shadow-2xl",
                            "translate-x-[126px] sm:translate-x-[142px] hover:translate-x-0 focus-within:translate-x-0",
                            isReferExpanded ? "translate-x-0" : ""
                        )}
                    >
                        <div className="w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center shrink-0">
                            <div className="flex items-center justify-center transition-all duration-500 h-8 sm:h-9 w-8 sm:w-9 rounded-full bg-white/20 group-hover:rotate-12 group-hover:scale-110">
                                <Ticket className="h-4 sm:h-5 w-4 sm:w-5 text-white" />
                            </div>
                        </div>
                        <div className={cn(
                            "flex-1 px-4 text-center transition-all duration-500",
                            "opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0",
                            isReferExpanded ? "opacity-100 translate-x-0" : ""
                        )}>
                            <p className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap">
                                Refer & Earn
                            </p>
                        </div>
                    </Button>
                    <DialogContent className="p-0 border-none bg-slate-950 max-w-[320px] w-[90%] rounded-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
                        
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

                            <div className="grid grid-cols-2 gap-3 pb-2">
                                <div className="bg-white/5 p-3 rounded-[1.2rem] border border-white/10 text-center backdrop-blur-sm">
                                    <p className="text-lg font-black text-white mb-0.5">{referralStats.invited}</p>
                                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Dost Joined</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-[1.2rem] border border-white/10 text-center backdrop-blur-sm flex flex-col justify-center items-center">
                                    {referralStats.unclaimedInvites > 0 ? (
                                        <div className="w-full flex flex-col items-center">
                                            <p className="text-sm font-black text-purple-400 mb-1">{referralStats.unclaimedEarned} Pending!</p>
                                            <Button 
                                                onClick={handleClaimReferralPoints}
                                                disabled={isClaimingReferral}
                                                className="w-full h-6 text-[9px] uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-md p-0 m-0"
                                            >
                                                {isClaimingReferral ? 'Claiming...' : 'Claim Now'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-lg font-black text-purple-400 mb-0.5">{referralStats.earned}</p>
                                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Points Won</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Scrollable Content Area */}
            <div className="relative z-10 px-4 pt-4">
                {/* ✨ Featured Carousel (Now at the Very Top) */}
                {!searchQuery && (
                    <div className="mb-2 animate-in fade-in slide-in-from-top-4 duration-1000">
                        <div className="transform scale-[1.02] sm:scale-100 origin-top">
                            <FeaturedCarousel items={items} onAdd={handleItemClick} />
                        </div>
                    </div>
                )}
            </div>

            {/* Categories - Sticky Top (Now below Recommended) */}
            <div className="sticky top-[3.5rem] z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm transition-all duration-300">
                <CategoryTabs
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />
            </div>

            <div className="relative z-10 px-4 pt-8 pb-2">
                {/* 🔍 Search Bar Section */}
                <div className="max-w-2xl mx-auto space-y-6 mb-10">
                    <div className="relative bg-white/70 backdrop-blur-md shadow-xl shadow-slate-200/50 rounded-2xl border border-white overflow-hidden group focus-within:ring-2 ring-indigo-500/20 transition-all duration-500">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                        <Input
                            placeholder="Discover your next favorite dish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-14 bg-transparent border-0 focus-visible:ring-0 text-base font-bold text-slate-950 placeholder:text-slate-400 placeholder:font-medium"
                        />
                    </div>

                    {/* Dietary Filters (Veg/Non-Veg) */}
                    {showDietaryToggle && !searchQuery && (
                        <div className="flex justify-center">
                            <div className="bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-white shadow-sm flex gap-1">
                                {(['all', 'veg', 'non-veg'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setDietaryFilter(type)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            dietaryFilter === type 
                                                ? "bg-slate-900 text-white shadow-lg" 
                                                : "text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {type === 'veg' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                            {type === 'non-veg' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                            {type}
                                        </div>
                                    </button>
                                ))}
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
                        {/* 🎫 Exclusive Coupons Section */}
                        {availableCoupons.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                                    Special Coupons 🎟️
                                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">{availableCoupons.length} Active</span>
                                </h3>
                                <div className="space-y-3">
                                    {availableCoupons.map((coupon) => (
                                        <div 
                                            key={coupon.id} 
                                            onClick={() => {
                                                navigator.clipboard.writeText(coupon.code);
                                                toast.success('Coupon code copied! 📋');
                                            }}
                                            className="group relative p-4 rounded-[2rem] border border-amber-100 bg-amber-50/30 hover:bg-amber-50 cursor-pointer active:scale-95 transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0">
                                                    <Percent className="h-5 w-5 text-amber-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 leading-none mb-1">
                                                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                                                    </p>
                                                    <p className="font-black text-sm tracking-tight text-slate-900 truncate">
                                                        {coupon.description
                                                            ?.replace(/\[PRIVATE\]/g, '')
                                                            ?.replace(/Loyal (VIP Reward|Coupon) for \d+/g, '')
                                                            ?.replace(/[:\s]+$/, '')
                                                            ?.replace(/^[:\s]+/, '')
                                                            ?.trim() || 'Special Discount'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="bg-white px-2 py-0.5 rounded-md border border-amber-100 font-mono text-xs font-black tracking-widest text-slate-800">
                                                            {coupon.code}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">Tap to Copy</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
