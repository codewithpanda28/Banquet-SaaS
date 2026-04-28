'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    Activity, 
    CreditCard, 
    MoreHorizontal, 
    ShoppingBag, 
    Users, 
    UtensilsCrossed, 
    ArrowUpRight, 
    ArrowDownRight, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Calendar,
    Bell, 
    Check, 
    ChevronRight, 
    Coffee, 
    DollarSign, 
    Download, 
    ExternalLink, 
    Filter, 
    LayoutDashboard, 
    Loader2, 
    LogOut, 
    Menu, 
    MessageSquare, 
    MoreVertical, 
    Plus, 
    Printer, 
    QrCode, 
    Search, 
    Settings, 
    Smartphone, 
    Trash2, 
    User, 
    Wallet, 
    X, 
    Star, 
    Zap,
    TrendingUp,
    ImagePlus
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeOrders: 0,
        totalOrders: 0,
        totalCustomers: 0,
        peakHours: [] as number[],
        kitchenCounts: { pending_confirmation: 0, pending: 0, preparing: 0, ready: 0, cancelled: 0, completed: 0 }
    })
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [walletTransactions, setWalletTransactions] = useState<any[]>([])
    const [allCustomers, setAllCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isManualOrderOpen, setIsManualOrderOpen] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(false)
    const [range, setRange] = useState<'today' | 'week' | 'month'>('today')
    const [isFlashSale, setIsFlashSale] = useState(false)
    const [generatingReport, setGeneratingReport] = useState(false)
    const [selectedApproval, setSelectedApproval] = useState<any>(null)
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
    const [isProcessingApproval, setIsProcessingApproval] = useState(false)
    const [isLoyaltyRulesOpen, setIsLoyaltyRulesOpen] = useState(false)
    const [restaurant, setRestaurant] = useState<any>(null)
    const [loyaltyRule, setLoyaltyRule] = useState({ threshold: 500, reward: 'Free Dessert', image: '', ratio: 10 })
    const [isUploadingLoyaltyImage, setIsUploadingLoyaltyImage] = useState(false)
    
    // Split Payment States
    const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false)
    const [splitCash, setSplitCash] = useState<string>('')
    const [splitUpi, setSplitUpi] = useState<string>('')

    // Helper to robustly parse dates primarily from UTC
    // --- GLOBAL ALERT SYSTEM ---
    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
            audio.volume = 0.5
            audio.play().catch(e => console.log('🔊 Audio blocked by browser policy'))
        } catch (err) {
            console.log('🔊 Audio fail:', err)
        }
    }, [])

    const parseDate = (dateString: string) => {
        if (!dateString) return new Date()
        // If string comprises T but no Z or +, append Z to force UTC parsing
        // This fixes the issue where UTC strings are interpreted as local time
        if (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) {
            return new Date(dateString + 'Z')
        }
        return new Date(dateString)
    }

    const fetchDashboardData = useCallback(async (currentRange: 'today' | 'week' | 'month' = 'today') => {
        try {
            const now = new Date()
            let startDate = startOfDay(now)
            const todayEnd = endOfDay(now)

            if (currentRange === 'week') {
                startDate = startOfDay(subDays(now, 7))
            } else if (currentRange === 'month') {
                startDate = startOfDay(subDays(now, 30))
            }

            const todayStart = startDate.toISOString()
            const rangeEnd = todayEnd.toISOString()

            // 🚀 SaaS Isolation Check: Don't fetch if no ID
            const currentRid = RESTAURANT_ID.toString()
            if (!currentRid || currentRid === 'undefined' || currentRid === '') {
                console.warn('⚠️ [AdminDashboard] Wait... no restaurant_id found. Pausing fetch.')
                setLoading(false)
                return
            }

            // Fetch Restaurant Data (for tax rates)
            const { data: restInfo } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', currentRid)
                .single()
            
            if (restInfo) setRestaurant(restInfo)

            // Fetch Revenue
            const { data: revenueData } = await supabase
                .from('orders')
                .select('total')
                .eq('restaurant_id', RESTAURANT_ID)
                .eq('payment_status', 'paid')
                .gte('created_at', todayStart)
                .lte('created_at', rangeEnd)

            const totalRevenue = revenueData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0

            // Fetch Active Orders
            const { count: activeOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)
                .in('status', ['pending_confirmation', 'pending', 'confirmed', 'preparing', 'ready', 'served'])

            // Fetch Total Orders in Range
            const { count: totalOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', todayStart)
                .lte('created_at', rangeEnd)

            // Fetch Total Customers (All time)
            const { count: totalCustomers } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', RESTAURANT_ID)

            // Fetch Detailed Counts for Kitchen Activity
            const { data: statusCounts } = await supabase
                .from('orders')
                .select('status')
                .eq('restaurant_id', RESTAURANT_ID)
                .in('status', ['pending_confirmation', 'pending', 'preparing', 'ready', 'cancelled', 'completed'])

            const counts = {
                pending_confirmation: statusCounts?.filter(o => o.status === 'pending_confirmation').length || 0,
                pending: statusCounts?.filter(o => o.status === 'pending').length || 0,
                preparing: statusCounts?.filter(o => o.status === 'preparing').length || 0,
                ready: statusCounts?.filter(o => o.status === 'ready').length || 0,
                cancelled: statusCounts?.filter(o => o.status === 'cancelled').length || 0,
                completed: statusCounts?.filter(o => o.status === 'completed').length || 0
            }

            setStats(prev => ({
                ...prev,
                totalRevenue,
                activeOrders: activeOrders || 0,
                totalOrders: totalOrders || 0,
                totalCustomers: totalCustomers || 0,
                kitchenCounts: counts
            }))

            // Fetch Loyalty Rule
            const { data: ruleData } = await supabase
                .from('restaurants')
                .select('loyalty_milestone_threshold, loyalty_milestone_reward, loyalty_milestone_image, loyalty_point_ratio')
                .eq('id', RESTAURANT_ID)
                .single()
            
            if (ruleData) {
                setLoyaltyRule({
                    threshold: Number(ruleData.loyalty_milestone_threshold) || 500,
                    reward: ruleData.loyalty_milestone_reward || 'Free Dessert',
                    image: ruleData.loyalty_milestone_image || '',
                    ratio: Number(ruleData.loyalty_point_ratio) || 10
                })
            }

            // --- AUTO-POPUP LOGIC (RELIABLE SYNC) ---
            const currentSelectedObj = selectedApprovalRef.current
            const currentIsOpen = isApprovalOpenRef.current

            if (counts.pending_confirmation > 0 && !selectedOrder && !currentIsOpen) {
                // Fetch first pending confirmation order details
                const { data: pendingOrder } = await supabase
                    .from('orders')
                    .select('*, customers(id, name, phone, wallet_balance), order_items(*), restaurant_tables(table_number)')
                    .eq('restaurant_id', RESTAURANT_ID)
                    .eq('status', 'pending_confirmation')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (pendingOrder) {
                    console.log('📢 [Admin] Found pending order, opening popup:', pendingOrder.bill_id)
                    setSelectedApproval(pendingOrder)
                    setIsApprovalDialogOpen(true)
                    playNotificationSound() // Also play sound on polling discovery
                }
            } else if (counts.pending_confirmation === 0 && currentIsOpen) {
                // No more pending orders - close any open approval dialog automagically
                console.log('🧹 [Admin] No more pending orders, closing popup.')
                setIsApprovalDialogOpen(false)
                setSelectedApproval(null)
            } else if (currentIsOpen && currentSelectedObj) {
                // If popup is open, check if THE SPECIFIC ORDER is still pending
                const { data: fresh } = await supabase
                    .from('orders')
                    .select('status')
                    .eq('id', currentSelectedObj.id)
                    .maybeSingle();
                
                if (fresh && fresh.status !== 'pending_confirmation') {
                    console.log('🧹 [Admin] Current order handled elsewhere, closing popup.')
                    setIsApprovalDialogOpen(false)
                    setSelectedApproval(null)
                }
            }
            // --------------------------------

            // Fetch Recent Orders - Simplified select for maximum robustness
            const { data: recent, error: recentError } = await supabase
                .from('orders')
                .select('*, customers (id, name, phone, wallet_balance), order_items(*)')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(10)

            if (recentError) {
                console.error('❌ [ADMIN HOME] Error fetching recent orders:', recentError)
            }

            // Fetch Recent Wallet Transactions for the "Customer Wallet Hub" Ledger
            const { data: transactions } = await supabase
                .from('wallet_transactions')
                .select('*, customers(name, phone), orders(bill_id, total)')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('created_at', { ascending: false })
                .limit(10)

            setWalletTransactions(transactions || [])

            setRecentOrders(recent || [])

            // Calculate Peak Hours (from recent 100 orders or today's orders)
            // Ideally we want more historical data for "Peak Hours", e.g. last 7 days
            const peakStart = subDays(new Date(), 7).toISOString()
            const { data: peakData } = await supabase
                .from('orders')
                .select('created_at')
                .eq('restaurant_id', RESTAURANT_ID)
                .gte('created_at', peakStart)

            const hours = new Array(24).fill(0)
            peakData?.forEach(o => {
                const date = parseDate(o.created_at)
                const h = date.getHours() // Local hours
                hours[h]++
            })
            setStats(prev => ({ ...prev, peakHours: hours }))

            // --- REFRESH CUSTOMER WALLET HUB ---
            // Fetch customers with non-zero balances for the Hub
            const { data: customerLedger } = await supabase
                .from('customers')
                .select('id, name, phone, wallet_balance')
                .eq('restaurant_id', RESTAURANT_ID)
                .neq('wallet_balance', 0)
                .order('updated_at', { ascending: false })
            
            if (customerLedger) {
                setAllCustomers(customerLedger)
            }
            // -----------------------------------

            // Low Stock check moved to AdminHeader for global notification support

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    // Helper to refresh specific order details
    const refreshSelectedOrder = useCallback(async (orderId: string) => {
        const { data } = await supabase
            .from('orders')
            .select('*, customers(id, name, phone, wallet_balance), order_items(*), restaurant_tables(table_number)')
            .eq('id', orderId)
            .single()

        if (data) {
            setSelectedOrder(data)
        }
    }, [])

    const handleApproveOrder = async (orderId: string, accept: boolean) => {
        try {
            setIsProcessingApproval(true)
            const { error } = await supabase
                .from('orders')
                .update({
                    status: accept ? 'pending' : 'cancelled',
                    notes: accept ? 'Approved by Admin' : 'Rejected by Admin',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)

            if (error) throw error

            toast.success(accept ? 'Order Accepted!' : 'Order Rejected')
            setIsApprovalDialogOpen(false)
            fetchDashboardData(range)
            setSelectedOrder(null)
            setIsDetailsOpen(false)
        } catch (error) {
            console.error('Approval error:', error)
            toast.error('Failed to update order')
        } finally {
            setIsProcessingApproval(false)
        }
    }


    const saveLoyaltyRules = async () => {
        try {
            const { error } = await supabase
                .from('restaurants')
                .update({
                    loyalty_milestone_threshold: loyaltyRule.threshold,
                    loyalty_milestone_reward: loyaltyRule.reward,
                    loyalty_milestone_image: loyaltyRule.image,
                    loyalty_point_ratio: loyaltyRule.ratio
                })
                .eq('id', RESTAURANT_ID)

            if (error) throw error
            toast.success('Loyalty Program Rules Updated! 🏆')
            setIsLoyaltyRulesOpen(false)
        } catch (error) {
            toast.error('Failed to update rules')
        }
    }

    const handleLoyaltyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLoyaltyImage(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${RESTAURANT_ID}_milestone_${Math.random()}.${fileExt}`;
            const filePath = `milestones/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('branding')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('branding')
                .getPublicUrl(filePath);

            setLoyaltyRule(prev => ({ ...prev, image: publicUrl }));
            toast.success('Milestone image uploaded! 🎁');
        } catch (err: any) {
            toast.error('Image upload failed: ' + err.message);
        } finally {
            setIsUploadingLoyaltyImage(false);
        }
    };

    // --- BULLETPROOF REAL-TIME SYNC ---
    const fetchRef = useRef(fetchDashboardData)
    const refreshRef = useRef(refreshSelectedOrder)
    const rangeRef = useRef(range)
    const selOrderRef = useRef(selectedOrder)
    const isApprovalOpenRef = useRef(isApprovalDialogOpen)
    const selectedApprovalRef = useRef(selectedApproval)

    useEffect(() => {
        fetchRef.current = fetchDashboardData
        refreshRef.current = refreshSelectedOrder
        rangeRef.current = range
        selOrderRef.current = selectedOrder
        isApprovalOpenRef.current = isApprovalDialogOpen
        selectedApprovalRef.current = selectedApproval
    }, [fetchDashboardData, refreshSelectedOrder, range, selectedOrder, isApprovalDialogOpen, selectedApproval])

    useEffect(() => {
        // Initial Fetch
        fetchRef.current(rangeRef.current)

        console.log('📡 [LIVE] Initializing Stable Real-time Channel...')
        
        const channel = supabase.channel('staff-unified-sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                async (payload: any) => {
                    console.log('🔄 [LIVE] Order Event:', payload.eventType, payload.new?.status)
                    const targetOrder = payload.new || payload.old
                    if (!targetOrder) return
                    
                    // Resilient Restaurant ID Check
                    const orderRid = (targetOrder.restaurant_id || '').toString().toLowerCase()
                    const myRid = RESTAURANT_ID.toString().toLowerCase()
                    if (orderRid && orderRid !== myRid) return

                    // A. Handle Brand New Orders (INSERT)
                    if (payload.eventType === 'INSERT' && targetOrder.status === 'pending_confirmation') {
                        console.log('🔥 [LIVE] NEW ORDER RECEIVED! Triggering Alert...')
                        playNotificationSound()

                        // Fetch full data to show details
                        const { data: full } = await supabase
                            .from('orders')
                            .select('*, customers(id, name, phone, wallet_balance), order_items(*), restaurant_tables(table_number)')
                            .eq('id', targetOrder.id)
                            .single()
                        
                        if (full) {
                            setSelectedApproval(full)
                            toast.error('NEW ORDER RECEIVED! 🔔', { duration: 15000 })
                            setIsApprovalDialogOpen(true)
                        }
                    }

                    // B. Handle Cross-Dashboard Sync (UPDATE)
                    if (payload.eventType === 'UPDATE') {
                        const newStatus = targetOrder.status
                        
                        // Update current view if relevant
                        if (selOrderRef.current?.id === targetOrder.id) {
                            setSelectedOrder(prev => prev ? { ...prev, ...targetOrder } : null)
                        }

                        // Update list
                        setRecentOrders(prev => prev.map(o => o.id === targetOrder.id ? { ...o, ...targetOrder } : o))

                        // If order handled elsewhere, close popup
                        if (newStatus && newStatus !== 'pending_confirmation') {
                            setSelectedApproval((prev: any) => {
                                if (prev?.id === targetOrder.id) {
                                    console.log('🧹 [LIVE] Closing handled modal')
                                    setIsApprovalDialogOpen(false)
                                    return null
                                }
                                return prev
                            })
                        }
                    }

                    // Always Refresh stats for live feeling
                    fetchRef.current(rangeRef.current)
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items',
                },
                () => {
                    fetchRef.current(rangeRef.current)
                    if (selOrderRef.current) {
                        refreshRef.current(selOrderRef.current.id)
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 [LIVE] Real-time Status:', status)
            })

        // ULTRA-RESPONSIVE POLLING FALLBACK (2s)
        const interval = setInterval(() => fetchRef.current(rangeRef.current), 2000)

        return () => {
            console.log('📡 [LIVE] Cleaning up channel...')
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, []) // STABLE EMPTY DEP ARRAY - Uses Refs to always access latest logic

    const handleOrderClick = (order: any) => {
        // Ensure we have full details when clicking (recentOrders might rely on partial fetch if we change optimizations later, but for now safe)
        // Good to fetch fresh to be sure or just use passed obj
        setSelectedOrder(order)
        setIsDetailsOpen(true)
    }

    const handlePayment = async (method: 'cash' | 'upi' | 'mixed' | 'banquet', overrideAmounts?: { cash: number, upi: number }) => {
        if (!selectedOrder) return
        setProcessingPayment(true)
 
        const total = Number(selectedOrder.total)
        const cashValue = method === 'mixed' ? (overrideAmounts?.cash || 0) : (method === 'cash' ? total : 0)
        const upiValue = method === 'mixed' ? (overrideAmounts?.upi || 0) : (method === 'upi' ? total : 0)

        try {
            // 💰 [SAAS] ADMIN COIN DEDUCTION (Platform Fee - Restaurant only)
            if ((method === 'cash' || method === 'upi' || method === 'mixed' || method === 'banquet') && Number(selectedOrder.total) > 200) {
                const restId = String(RESTAURANT_ID);
                const { data: restData } = await supabase
                    .from('restaurants')
                    .select('coin_balance, coin_deduction_per_order')
                    .eq('id', restId)
                    .single();

                if (restData) {
                    const deductAmount = Number(restData.coin_deduction_per_order || 5);
                    await supabase
                        .from('restaurants')
                        .update({ coin_balance: Math.max(0, (Number(restData.coin_balance) || 0) - deductAmount) })
                        .eq('id', restId);
                    
                    window.dispatchEvent(new CustomEvent('refresh-admin-balance'));
                }
            }

            // 🏅 [SAAS] LOYALTY POINTS LOGIC (Updated to awarding only)
            if (selectedOrder.customer_id) {
                const pointsToEarn = Math.floor(Number(selectedOrder.total) / (loyaltyRule.ratio || 10));
                if (pointsToEarn > 0) {
                    const { data: customerData } = await supabase
                        .from('customers')
                        .select('loyalty_points')
                        .eq('id', selectedOrder.customer_id)
                        .maybeSingle();

                    if (customerData) {
                        const newPoints = (Number(customerData.loyalty_points) || 0) + pointsToEarn;
                        await supabase
                            .from('customers')
                            .update({ loyalty_points: newPoints })
                            .eq('id', selectedOrder.customer_id);

                        await supabase
                            .from('loyalty_history')
                            .insert([{
                                customer_id: selectedOrder.customer_id,
                                restaurant_id: RESTAURANT_ID,
                                points: pointsToEarn,
                                type: 'credit',
                                reason: `Points Earned (Order #${selectedOrder.bill_id})`,
                                order_id: selectedOrder.id
                            }]);
                    }
                }
            }

            // Fix: Map 'banquet' to 'cash' to avoid DB constraint violation
            const dbMethod = method === 'banquet' ? 'cash' : method;

            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    payment_status: 'paid',
                    payment_method: dbMethod,
                    status: 'completed',
                    notes: method === 'mixed' 
                        ? `Split Payment Handled`
                        : `Paid via ${method.toUpperCase()}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedOrder.id)
                .eq('restaurant_id', String(RESTAURANT_ID));

            if (updateError) {
                console.error('❌ [handlePayment] Update failed:', JSON.stringify(updateError, null, 2));
                throw new Error(updateError.message || 'Payment update failed');
            }


            // 2. Update Customer Loyalty Stats (New)
            if (selectedOrder.customer_id) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('total_spent, total_orders')
                    .eq('id', selectedOrder.customer_id)
                    .single()

                if (customer) {
                    await supabase
                        .from('customers')
                        .update({
                            total_spent: (customer.total_spent || 0) + total,
                            total_orders: (customer.total_orders || 0) + 1,
                            last_order_at: new Date().toISOString()
                        })
                        .eq('id', selectedOrder.customer_id)
                }
            }

            toast.success(`Payment settled successfully! ✅`)

            // Automatic table state updates have been removed as per user request.

            // Update local state for immediate UI feedback
            setSelectedOrder(prev => prev ? { ...prev, status: 'completed', payment_status: 'paid' } : null)
            setRecentOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'completed', payment_status: 'paid' } : o))

            fetchDashboardData(range) // Refresh background data

            // Close after delay so user sees the "Order Finished" state
            setTimeout(() => {
                setIsDetailsOpen(false)
                setIsSplitDialogOpen(false)
            }, 1000)

            // 4. Sync AdminHeader Balance
            window.dispatchEvent(new CustomEvent('refresh-admin-balance'))
        } catch (error) {
            console.error('Payment error:', error)
            toast.error('Failed to update payment status')
        } finally {
            setProcessingPayment(false)
        }
    }

    // Function to calculate time ago roughly
    const getTimeAgo = (dateString: string) => {
        const date = parseDate(dateString)
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

        if (diffInMinutes < 1) return 'Just now'
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours}h ago`
        return format(date, 'MMM d')
    }

    return (
        <div className="space-y-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 text-black">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tight text-gradient">Dashboard Overview</h2>
                    <p className="text-gray-500 font-medium">Real-time insights and performance metrics.</p>
                </div>
                <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl border border-gray-200">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRange('today')}
                        className={cn(
                            "rounded-lg text-xs font-semibold h-8 transition-all",
                            range === 'today' ? "bg-white border border-gray-200 text-black shadow-sm" : "hover:bg-gray-100 text-gray-500"
                        )}
                    >
                        Today
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRange('week')}
                        className={cn(
                            "rounded-lg text-xs font-semibold h-8 transition-all",
                            range === 'week' ? "bg-white border border-gray-200 text-black shadow-sm" : "hover:bg-gray-100 text-gray-500"
                        )}
                    >
                        Week
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRange('month')}
                        className={cn(
                            "rounded-lg text-xs font-semibold h-8 transition-all",
                            range === 'month' ? "bg-white border border-gray-200 text-black shadow-sm" : "hover:bg-gray-100 text-gray-500"
                        )}
                    >
                        Month
                    </Button>
                </div>

            </div>

            {/* Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {[
                    {
                        title: "Active Orders",
                        value: stats.activeOrders.toString(),
                        icon: Activity,
                        trend: "+4 since last hour",
                        trendUp: true,
                        color: "bg-blue-500",
                        textColor: "text-blue-600",
                        iconBg: "bg-blue-100",
                    },
                    {
                        title: "Total Orders",
                        value: stats.totalOrders.toString(),
                        icon: ShoppingBag,
                        trend: "+12% from yesterday",
                        trendUp: true,
                        color: "bg-purple-500",
                        textColor: "text-purple-600",
                        iconBg: "bg-purple-100",
                    },
                    {
                        title: "Customers",
                        value: stats.totalCustomers.toString(),
                        icon: Users,
                        trend: "+3 new today",
                        trendUp: true,
                        color: "bg-orange-500",
                        textColor: "text-orange-600",
                        iconBg: "bg-orange-100",
                    },
                ].map((stat, index) => (
                    <Card key={index} className="glass-card border border-gray-100 shadow-sm relative group bg-white hover:border-green-500/30 hover:shadow-lg transition-all duration-300">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.color} rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity`} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-green-700 transition-colors">
                                {stat.title}
                            </CardTitle>
                            <div className={cn("p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm", stat.iconBg)}>
                                <stat.icon className={cn("h-4 w-4", stat.textColor)} />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className={cn("text-3xl font-black tracking-tight text-gray-900", (stat as any).valueClassName)}>{stat.value}</div>
                            <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1">
                                {stat.trendUp ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
                                <span className={stat.trendUp ? "text-green-600" : "text-red-600"}>{stat.trend}</span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 items-start">
                {/* Peak Hours Chart */}
                <Card className="col-span-7 lg:col-span-7 glass-card border-gray-100 bg-white shadow-sm p-6 relative overflow-hidden group hover:border-blue-500/20 hover:shadow-md transition-all duration-300">
                    <CardHeader className="p-0 pb-4 border-b border-gray-50 flex flex-row justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" /> Peak Hours Analysis
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">Order traffic trends (Last 7 Days)</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-6">
                        <div className="h-32 flex items-end gap-1 w-full justify-between">
                            {Array.isArray(stats.peakHours) && stats.peakHours.length > 0 ? stats.peakHours.map((count, hour) => {
                                const max = Math.max(...(stats.peakHours || [1])) || 1
                                const height = (count / max) * 100
                                return (
                                    <div key={hour} className="flex-1 flex flex-col items-center gap-1 group/bar h-full justify-end">
                                        <div
                                            className="w-full bg-blue-100 rounded-t-sm hover:bg-blue-500 transition-all duration-500 relative min-w-[4px]"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {count} Orders
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-gray-400 rotate-0 group-hover/bar:text-gray-900 font-medium h-4">
                                            {hour % 2 === 0 ? (hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`) : ''}
                                        </span>
                                    </div>
                                )
                            }) : (
                                <div className="w-full text-center text-gray-400 text-sm flex items-center justify-center">Loading or No Data</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                {/* Recent Orders */}
                <Card className="col-span-4 glass-card border-gray-100 bg-white shadow-sm hover:border-green-500/20 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold text-gray-900">Recent Orders</CardTitle>
                            <CardDescription className="text-xs font-medium text-gray-500">
                                You have {stats.activeOrders} active orders right now.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 font-bold text-xs" asChild>
                            <Link href="/admin/orders">View All <ChevronRight className="h-3 w-3 ml-1" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-0 text-sm">
                            {recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No orders yet today.
                                </div>
                            ) : (
                                recentOrders.map((order, i) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center p-4 hover:bg-green-50 transition-all cursor-pointer border-b border-gray-100 last:border-0 group relative overflow-hidden"
                                        onClick={() => handleOrderClick(order)}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center pl-2">
                                            {/* ID & Status */}
                                            <div className="col-span-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">#{order.bill_id}</span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" /> {getTimeAgo(order.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Customer */}
                                            <div className="col-span-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-gray-100 hidden sm:block">
                                                        <AvatarFallback className={cn("text-[10px] font-bold", i % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600")}>
                                                            {(Array.isArray(order.customers) ? order.customers[0]?.name : order.customers?.name)?.substring(0, 2).toUpperCase() || 'CU'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium truncate text-gray-900">
                                                            {(Array.isArray(order.customers) ? order.customers[0]?.name : order.customers?.name) || 'Walk-in'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 truncate">
                                                            {(Array.isArray(order.customers) ? order.customers[0]?.phone : order.customers?.phone) || 'No Phone'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount Hidden for Banquet */}

                                            {/* Status Badge */}
                                            <div className="col-span-3 text-right">
                                                <Badge
                                                    className={cn(
                                                        "uppercase text-[10px] font-bold tracking-wider border-none px-2 py-0.5 shadow-sm",
                                                        order.status === 'completed'
                                                            ? "bg-green-100 text-green-700 group-hover:bg-green-200"
                                                            : order.status === 'pending_confirmation'
                                                                ? "bg-red-100 text-red-700 animate-pulse group-hover:bg-red-200"
                                                                : order.status === 'pending'
                                                                    ? "bg-yellow-100 text-yellow-700 group-hover:bg-yellow-200"
                                                                    : "bg-blue-100 text-blue-700 group-hover:bg-blue-200"
                                                    )}
                                                >
                                                    {order.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-green-600 ml-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Kitchen Activity / Secondary Metrics */}
                <div className="col-span-3 space-y-6">

                    <Card className="glass-card border-gray-100 shadow-sm relative overflow-hidden bg-white hover:border-green-500/20 hover:shadow-md transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent z-0" />
                        <CardHeader className="relative z-10 border-b border-gray-50 pb-4">
                            <CardTitle className="font-bold text-gray-900">Live Kitchen Activity</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Current order prep status</CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10 px-6 pt-6">
                            <div className="space-y-5">
                                {[
                                    { label: 'New Orders', count: stats.kitchenCounts.pending, color: 'bg-yellow-500', icon: Clock },
                                    { label: 'Preparing', count: stats.kitchenCounts.preparing, color: 'bg-orange-500', icon: UtensilsCrossed },
                                    { label: 'Ready', count: stats.kitchenCounts.ready, color: 'bg-green-500', icon: CheckCircle2 },
                                    { label: 'Cancelled', count: stats.kitchenCounts.cancelled, color: 'bg-red-500', icon: XCircle },
                                    { label: 'Completed', count: stats.kitchenCounts.completed, color: 'bg-blue-600', icon: ShoppingBag },
                                ].map((step, idx) => (
                                    <div key={idx} className="space-y-1.5 group">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-1.5 rounded-md text-white shadow-sm transition-transform group-hover:scale-110", step.color)}>
                                                    <step.icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-gray-700 text-xs font-bold uppercase tracking-tight">{step.label}</span>
                                            </div>
                                            <span className="font-black text-gray-900">{step.count}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000", step.color)}
                                                style={{ width: `${(step.count / (Math.max(stats.kitchenCounts.pending + stats.kitchenCounts.preparing + stats.kitchenCounts.ready + stats.kitchenCounts.cancelled + stats.kitchenCounts.completed, 1))) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-4 rounded-2xl bg-gray-900 border border-gray-800 text-center shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/20 rounded-full blur-xl -mr-10 -mt-10" />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 relative z-10">Kitchen Efficiency</p>
                                <p className="text-3xl font-black text-white relative z-10">94%</p>
                                <p className="text-[10px] text-gray-500 mt-1 relative z-10">Avg. prep time: 12m</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>


            {/* Order Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-xl max-h-[85vh] flex flex-col bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-3xl">
                    <DialogTitle className="sr-only">Order Details</DialogTitle>
                    {selectedOrder && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Premium Header - Fixed at Top */}
                            <div className="flex flex-col gap-1 p-6 pb-2 shrink-0 bg-white z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            Order #{selectedOrder.bill_id}
                                            <Badge className={cn(
                                                "ml-2 text-[10px] px-2 py-0.5 uppercase tracking-wide border-0",
                                                selectedOrder.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                    selectedOrder.status === 'pending' ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                                                        "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            )}>
                                                {selectedOrder.status}
                                            </Badge>
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {format(parseDate(selectedOrder.created_at), 'PPP')} at {format(parseDate(selectedOrder.created_at), 'p')}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" onClick={() => setIsDetailsOpen(false)}>
                                        <XCircle className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>

                            <div className="px-6 py-2 shrink-0">
                                <div className="h-px bg-gray-100 w-full" />
                            </div>

                            {/* Scrollable Content Body */}
                            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-6 pb-6 pt-2">
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" /> Customer
                                        </p>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-base">{selectedOrder.customers?.name || 'Walk-in Customer'}</p>
                                            <p className="text-sm text-gray-500 font-medium">{selectedOrder.customers?.phone || 'No Phone'}</p>
                                            
                                        </div>
                                        {(selectedOrder.delivery_address || selectedOrder.customers?.address) && (
                                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                                                {selectedOrder.delivery_address || selectedOrder.customers?.address}
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
                                                <span className="font-semibold text-gray-900 capitalize">{selectedOrder.order_type?.replace('_', ' ') || 'Dine In'}</span>
                                            </div>
                                            {selectedOrder.restaurant_tables && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 font-medium">Table No:</span>
                                                    <span className="font-semibold text-gray-900">#{selectedOrder.restaurant_tables.table_number}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="space-y-4">
                                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                                            <div className="col-span-10 pl-2">Item</div>
                                            <div className="col-span-2 text-center">Qty</div>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {selectedOrder.order_items?.map((item: any) => (
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
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inclusive Selection</p>
                                            <p className="text-[10px] text-gray-500 mt-1 italic">Guest experience optimized for banquet service.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-4" /> {/* Spacer */}
                            </div>

                            {/* Actions Footer - Fixed at Bottom */}
                            <div className="p-6 pt-2 shrink-0 bg-white border-t border-gray-50 z-10">
                                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && selectedOrder.payment_status !== 'paid' ? (
                                    <div className="flex justify-center">
                                        <Button
                                            className="h-14 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-lg shadow-green-600/20"
                                            onClick={() => handlePayment('banquet')}
                                            disabled={processingPayment}
                                        >
                                            {processingPayment ? (
                                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                            ) : (
                                                <><CheckCircle2 className="mr-2 h-6 w-6" /> FINISH ORDER</>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="w-full h-11 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        Order Finished
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>


            {/* NEW: Automatic Approval Popup */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                <DialogContent className="sm:max-w-[500px] border-none p-0 overflow-hidden shadow-2xl rounded-[2rem]">
                    <div className="bg-red-600 p-8 text-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-3">
                                <div className="bg-white/20 p-3 rounded-2xl w-fit">
                                    <ShoppingBag className="h-6 w-6" />
                                </div>
                                <DialogTitle className="text-3xl font-black">
                                    {selectedApproval?.order_items?.some((i: any) => i.status !== 'pending') ? "Merge New Items?" : "New Order Alert!"}
                                </DialogTitle>
                            </div>
                                <Badge className="bg-white/20 text-white border-0 font-bold px-3 py-1 uppercase tracking-wider">#{selectedApproval?.bill_id}</Badge>
                        </div>
                        <p className="text-red-100 font-bold opacity-90 italic">
                            {selectedApproval?.order_items?.some((i: any) => i.status !== 'pending') 
                                ? "This customer is already dining. These new items will be merged into their active bill."
                                : "A new customer has placed an order. Review and send to the kitchen."}
                        </p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                                <p className="font-bold text-gray-900">{selectedApproval?.customers?.name || 'Walk-in'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Table</p>
                                <p className="font-bold text-gray-900">T{selectedApproval?.restaurant_tables?.table_number || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Items</p>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {selectedApproval?.order_items?.map((item: any) => (
                                        <div className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <span className="h-6 w-6 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-[10px] font-black">{item.quantity}</span>
                                                <span className="text-sm font-bold text-gray-800">{item.item_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <span className="text-lg font-black text-gray-900 uppercase tracking-widest text-[10px]">Banquet Selection</span>
                                <span className="text-sm font-bold text-red-600">PENDING CONFIRMATION</span>
                            </div>
                    </div>

                    <div className="p-8 pt-0 grid grid-cols-2 gap-4">
                        <Button
                            className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-lg shadow-lg shadow-green-600/20"
                            onClick={() => handleApproveOrder(selectedApproval.id, true)}
                            disabled={isProcessingApproval}
                        >
                            {isProcessingApproval ? '...' : 'ACCEPT'}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 rounded-2xl border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold"
                            onClick={() => handleApproveOrder(selectedApproval.id, false)}
                            disabled={isProcessingApproval}
                        >
                            REJECT
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- SPLIT PAYMENT DIALOG --- */}
            {/* --- SPLIT PAYMENT DIALOG --- */}
            <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
                <DialogContent className="sm:max-w-[440px] bg-white rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
                    <div className="bg-purple-600 p-7 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-90 relative z-10" />
                        <DialogTitle className="text-2xl font-black relative z-10">Split Settlement</DialogTitle>
                        <DialogDescription className="text-purple-100 font-bold opacity-80 relative z-10">
                            Order #{selectedOrder?.bill_id}
                        </DialogDescription>
                    </div>

                    <div className="p-8 space-y-7">
                        <div className="space-y-5">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Cash Contribution</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                                        <DollarSign className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-16 h-16 rounded-2xl border-gray-100 bg-gray-50/50 focus:border-orange-500 transition-all font-black text-xl text-gray-900 shadow-inner"
                                        value={splitCash}
                                        onChange={(e) => {
                                            setSplitCash(e.target.value)
                                            const remaining = Number(selectedOrder?.total || 0) - Number(e.target.value)
                                            setSplitUpi(remaining > 0 ? remaining.toString() : '0')
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">UPI / Online Contribution</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                                        <Smartphone className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-16 h-16 rounded-2xl border-gray-100 bg-gray-50/50 focus:border-blue-500 transition-all font-black text-xl text-gray-900 shadow-inner"
                                        value={splitUpi}
                                        onChange={(e) => setSplitUpi(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button 
                                className={cn(
                                    "w-full h-16 rounded-2xl font-black text-lg transition-all duration-300 shadow-xl",
                                    (Number(splitCash) + Number(splitUpi)) === Number(selectedOrder?.total || 0)
                                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}
                                disabled={processingPayment || (Number(splitCash) + Number(splitUpi)) !== Number(selectedOrder?.total || 0)}
                                onClick={() => handlePayment('mixed', {
                                    cash: Number(splitCash),
                                    upi: Number(splitUpi)
                                })}
                            >
                                {processingPayment ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-6 w-6 mr-3" />}
                                { (Number(splitCash) + Number(splitUpi)) === Number(selectedOrder?.total || 0) 
                                    ? 'Collect Split Payment' 
                                    : `Total: Confirmed`}
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full mt-4 text-gray-400 font-bold hover:text-gray-900 hover:bg-gray-50 rounded-xl"
                                onClick={() => setIsSplitDialogOpen(false)}
                            >
                                Cancel & Return
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
