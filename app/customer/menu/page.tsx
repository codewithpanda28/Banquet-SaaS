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

        // Fetch Tier Rewards (Always fetch so guests can see the Lalach Engine)
        const { data: rewardsData } = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('restaurant_id', rid)
            .order('threshold', { ascending: true })
        if (rewardsData) setAvailableRewards(rewardsData)

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

    // Real-time Order Status Notifications for Customer
    useEffect(() => {
        if (!currentCustomerId) return

        const orderChannel = supabase.channel(`customer-order-updates-${currentCustomerId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `customer_id=eq.${currentCustomerId}`
                },
                (payload) => {
                    const newOrder = payload.new as any
                    const oldOrder = payload.old as any

                    if (newOrder.status === 'completed' && oldOrder.status !== 'completed') {
                        toast.success('Order Completed! 🎉', {
                            description: `Order #${newOrder.bill_id} has been finished. Enjoy your meal!`,
                            duration: 8000,
                        })
                        checkSessionStatus()
                    } else if (newOrder.status === 'ready' && oldOrder.status !== 'ready') {
                        toast.info('Order Ready! 🍽️', {
                            description: `Your order #${newOrder.bill_id} is ready to be served.`,
                            duration: 8000,
                        })
                    } else if (newOrder.status === 'preparing' && oldOrder.status !== 'preparing') {
                        toast.info('Cooking Started! 👨‍🍳', {
                            description: `The kitchen is now preparing your order #${newOrder.bill_id}.`,
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(orderChannel)
        }
    }, [currentCustomerId, checkSessionStatus])

    useEffect(() => {
        checkSessionStatus()

        // Real-time broad orders listener removed to prevent performance lag.
        // Customer-specific listener on line 347 handles necessary updates.
        return () => { }
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


    useEffect(() => {
        // ENFORCE DINE IN FOR BANQUET
        setOrderType('dine_in')
        sessionStorage.setItem('orderTypeConfirmed', 'true')
        setShowOrderTypeModal(false)

        const checkTableStatusAndRedirect = async (tNum: number) => {
            const { data: tableData } = await supabase
                .from('restaurant_tables')
                .select('status')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('table_number', tNum)
                .single()

            if (tableData?.status === 'occupied') {
                const isConfirmed = sessionStorage.getItem('orderTypeConfirmed')
                if (!isConfirmed) {
                    router.replace(`/customer/scan?table=${tNum}`)
                    return
                }
            }
        }

        if (tableParam) {
            const tNum = parseInt(tableParam)
            if (!isNaN(tNum)) {
                const tId = searchParams.get('tableId') || 'qr-scan'
                setTableInfo(tNum, tId)
                checkTableStatusAndRedirect(tNum)
            }
        }
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
        <div className="min-h-screen bg-[#FCFBF7] pb-32 selection:bg-[#F4EBD0] selection:text-[#8B6508] font-sans">
            {/* ✨ Premium Banquet Header */}
            <div className="bg-white border-b border-[#D4AF37]/20 shadow-sm pt-8 pb-6 px-6 text-center relative overflow-hidden">
                {/* Decorative Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30-30-30z' fill='%23D4AF37' fill-rule='evenodd'/%3E%3C/svg%3E")` }}>
                </div>
                
                <div className="relative z-10">
                    <p className="text-[#D4AF37] font-black text-[10px] uppercase tracking-[0.4em] mb-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        Welcome to Our Elegant
                    </p>
                    <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-1 tracking-tight">
                        {restaurant?.name || 'Grand Banquet'}
                    </h1>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mt-3"></div>
                </div>
            </div>

            {/* 🏆 Referral & Loyalty Floating Badges (Pinned to viewport) - Hidden for Banquet */}
            <div ref={floatingRef} className={cn(
                "z-[100] flex flex-col items-end gap-2.5 transition-all duration-500 hidden",
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
                        {!customerPhone ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
                                <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-2 shadow-inner border border-white/10 relative z-10">
                                    <Phone className="h-8 w-8 text-indigo-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight relative z-10">Unlock Referrals</h3>
                                <p className="text-sm text-slate-400 font-medium relative z-10">Please place your first order or checkout to verify your phone number and unlock your unique referral code.</p>
                                <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-14 font-black uppercase tracking-[0.2em] text-[11px] relative z-10 shadow-lg shadow-indigo-500/20" onClick={() => setIsReferDialogOpen(false)}>
                                    Start Ordering
                                </Button>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
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

            <div className="relative z-10 px-4 pt-6 pb-2">
                {/* 🔍 Sophisticated Search Section */}
                <div className="max-w-2xl mx-auto space-y-4 mb-8">
                    <div className="relative bg-white shadow-lg shadow-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/20 overflow-hidden group focus-within:ring-2 ring-[#D4AF37]/20 transition-all duration-500">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#D4AF37] group-focus-within:text-[#8B6508] transition-colors pointer-events-none" />
                        <Input
                            placeholder="Search for a delicacy..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-14 bg-transparent border-0 focus-visible:ring-0 text-base font-medium text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Dietary Filters */}
                    {showDietaryToggle && !searchQuery && (
                        <div className="flex justify-center">
                            <div className="bg-[#F4EBD0]/30 backdrop-blur-md p-1 rounded-full border border-[#D4AF37]/10 flex gap-1">
                                {(['all', 'veg', 'non-veg'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setDietaryFilter(type)}
                                        className={cn(
                                            "px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                                            dietaryFilter === type 
                                                ? "bg-[#D4AF37] text-white shadow-md shadow-[#D4AF37]/20" 
                                                : "text-[#8B6508]/60 hover:bg-[#F4EBD0]/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {type === 'veg' && <div className="w-1.5 h-1.5 rounded-full bg-green-600" />}
                                            {type === 'non-veg' && <div className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                                            {type}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cuisine Listings */}
                <div className="px-2 pb-4">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-xl font-serif font-bold text-[#1A1A1A] flex items-center gap-2">
                            <span className="w-1 h-6 bg-[#D4AF37] rounded-full"></span>
                            {categories.find(c => c.id === activeCategory)?.name || 'Cuisine Selection'}
                        </h2>
                        <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest bg-[#F4EBD0]/30 px-3 py-1 rounded-full border border-[#D4AF37]/10">
                            {filteredItems.length} Offerings
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    onAdd={() => handleItemClick(item)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-[#8B6508]/50 flex flex-col items-center gap-4">
                                <Search className="h-12 w-12 opacity-10" />
                                <p className="font-medium">No delicacies found matching your taste.</p>
                                <Button variant="outline" onClick={() => setSearchQuery('')} className="border-[#D4AF37]/30 text-[#8B6508]">Clear Search</Button>
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

            {/* Order Mode Selection Modal - DISABLED FOR BANQUET */}

            {/* Loyalty Milestone Details - Hidden for Banquet but code preserved */}
            <Dialog open={isLoyaltyInfoOpen} onOpenChange={setIsLoyaltyInfoOpen}>
                <DialogContent className="max-w-[340px] w-[90%] p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 outline-none">
                    <DialogHeader className="p-0">
                        <div className="bg-[#1A1A1A] p-6 text-white text-center relative overflow-hidden">
                            <Star className="h-8 w-8 mx-auto mb-2 text-[#D4AF37] fill-[#D4AF37]" />
                            <DialogTitle className="text-xl font-serif font-bold tracking-tight">Rewards Program</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="p-8 text-center">
                        <p className="text-sm text-[#8B6508]/60 italic">Loyalty features are currently being refined for the banquet experience.</p>
                        <Button className="mt-8 w-full rounded-full bg-[#1A1A1A]" onClick={() => setIsLoyaltyInfoOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function MenuPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#FCFBF7]">
                <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MenuContent />
        </Suspense>
    )
}
