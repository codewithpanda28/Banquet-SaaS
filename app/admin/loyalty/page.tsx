'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Crown,
    Search,
    RefreshCw,
    Gift,
    Coins,
    Users,
    SearchX,
    Info,
    ChevronRight,
    Zap,
    Tag,
    IndianRupee,
    Percent,
    LayoutGrid,
    Check,
    Loader2
} from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils'

interface Customer {
    id: string
    name: string
    phone: string
    total_spent: number
    loyalty_points: number
    last_visit: string
}

interface MenuItem {
    id: string
    name: string
    image_url: string
    price: number
}

export default function LoyaltyHubPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [totalPool, setTotalPool] = useState(0)
    
    // Reward Modal States
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [isMenuBrowserOpen, setIsMenuBrowserOpen] = useState(false)
    const [rewardConfig, setRewardConfig] = useState({
        type: 'percentage' as 'percentage' | 'fixed' | 'item',
        value: '20',
        itemId: '',
        itemName: '',
        code: `LOYAL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    })
    const [menuSearch, setMenuSearch] = useState('')
    const [existingCoupons, setExistingCoupons] = useState<any[]>([])
    const [isCreatingNew, setIsCreatingNew] = useState(true)
    const [selectedExistingCoupon, setSelectedExistingCoupon] = useState<any>(null)
    const [sendingReward, setSendingReward] = useState(false)

    const fetchLoyaltyData = useCallback(async () => {
        try {
            setLoading(true)
            
            // 1. Fetch Customers
            const { data: customerData, error } = await supabase
                .from('customers')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('total_spent', { ascending: false })

            if (error) throw error
            setCustomers(customerData || [])
            const pool = customerData?.reduce((acc, curr) => acc + (curr.total_spent || 0), 0) || 0
            setTotalPool(pool)

            // 2. Fetch Menu Items (for item-specific rewards)
            const { data: items } = await supabase
                .from('menu_items')
                .select('id, name, image_url, price')
                .eq('restaurant_id', RESTAURANT_ID)
            
            setMenuItems((items || []).filter(i => !i.name.startsWith('[DELETED]')))

            // 3. Fetch Existing Coupons (for reuse) - ONLY general/reusable ones
            const { data: coupons } = await supabase
                .from('coupons')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .is('customer_id', null) // Avoid private linked ones
                .eq('is_active', true)
                .order('created_at', { ascending: false })
            
            setExistingCoupons(coupons || [])
        } catch (error) {
            console.error('Error fetching loyalty:', error)
            toast.error('Failed to sync loyalty data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLoyaltyData()
    }, [fetchLoyaltyData])

    const filteredCustomers = customers.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone?.includes(searchQuery)
    )

    const filteredMenu = useMemo(() => {
        return menuItems.filter(i => i.name.toLowerCase().includes(menuSearch.toLowerCase()))
    }, [menuItems, menuSearch])

    const vipCustomers = customers.filter(c => Number(c.total_spent) >= 500)
    const repeatRate = customers.length > 0 
        ? (customers.filter(c => Number(c.total_spent) > 0).length / customers.length) * 100 
        : 0

    const handleFinalizeReward = async () => {
        if (!selectedCustomer) return
        try {
            setSendingReward(true)
            
            let rewardText = ''
            let discountType: 'percentage' | 'fixed' = 'percentage'
            let discountValue = 0
            let finalCode = ''

            if (isCreatingNew) {
                discountValue = Number(rewardConfig.value)
                finalCode = rewardConfig.code
                if (rewardConfig.type === 'percentage') {
                    rewardText = `${rewardConfig.value}% OFF`
                    discountType = 'percentage'
                } else if (rewardConfig.type === 'fixed') {
                    rewardText = `₹${rewardConfig.value} Discount`
                    discountType = 'fixed'
                } else {
                    rewardText = `FREE ${rewardConfig.itemName}`
                    discountType = 'percentage'
                    discountValue = 100
                }

                // 1. Create Private Coupon in Database
                const { error: dbError } = await supabase
                    .from('coupons')
                    .insert([{
                        restaurant_id: RESTAURANT_ID,
                        customer_id: selectedCustomer.id,
                        code: finalCode,
                        description: `[PRIVATE] Loyal Coupon for ${selectedCustomer.phone}: ${rewardText}`,
                        discount_type: discountType,
                        discount_value: discountValue,
                        min_order_amount: 0,
                        usage_limit: 1,
                        valid_from: new Date().toISOString(),
                        valid_until: new Date(Date.now() + 7 * 86400000).toISOString(),
                        is_active: true
                    }]);

                if (dbError) throw dbError;
            } else {
                if (!selectedExistingCoupon) {
                    toast.error('Please select an existing coupon first');
                    return;
                }
                finalCode = selectedExistingCoupon.code;
                rewardText = selectedExistingCoupon.discount_type === 'percentage' 
                    ? `${selectedExistingCoupon.discount_value}% OFF` 
                    : `₹${selectedExistingCoupon.discount_value} OFF`;
            }

            // 2. Automated Notification removed as requested. 
            // The customer will see this in their history/profile if implemented.

            toast.success(`Loyal Coupon ${isCreatingNew ? 'created' : 'reused'}! 🎁`)
            setSelectedCustomer(null)
            setIsCreatingNew(true)
            setSelectedExistingCoupon(null)
            fetchLoyaltyData()
        } catch (error) {
            toast.error('Failed to send reward')
        } finally {
            setSendingReward(false)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600" /></div>

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 min-h-screen bg-slate-50/20 font-sans">
            <PageHeader
                title="VIP Leaderboard"
                description="Monitor spending habits and issue high-value rewards to your top patrons."
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
                        <div className="h-6 w-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shadow-inner">
                            <Coins className="h-3 w-3" />
                        </div>
                        <div className="leading-none">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Revenue Sum</p>
                            <p className="text-sm font-bold text-slate-900 tabular-nums">₹{totalPool.toLocaleString()}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchLoyaltyData} className="rounded-xl h-10 bg-white border-indigo-100 hover:bg-indigo-50 font-bold text-[10px] uppercase tracking-widest gap-2 pr-4">
                        <RefreshCw className="h-3 w-3" /> Sync
                    </Button>
                </div>
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-lg shadow-indigo-100/50 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Crown size={80} />
                    </div>
                    <CardContent className="p-8 relative z-10">
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mb-2 leading-none">Loyalty Index</p>
                        <h3 className="text-3xl font-bold tracking-tight leading-none">{repeatRate.toFixed(1)}%</h3>
                    </CardContent>
                </Card>

                <Card className="border border-indigo-50 shadow-sm bg-white text-slate-900 rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8">
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                            <Users className="h-5 w-5" />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 leading-none">Total Users</p>
                        <h3 className="text-3xl font-bold text-indigo-900  tracking-tight leading-none">{customers.length}</h3>
                    </CardContent>
                </Card>

                <Card className="border border-purple-50 shadow-sm bg-white text-slate-900 rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-8">
                        <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                            <Crown className="h-5 w-5" />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 leading-none">Loyal Coupon Elite</p>
                        <h3 className="text-3xl font-bold text-purple-900  tracking-tight leading-none">{vipCustomers.length}</h3>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-4 bg-white p-1 rounded-2xl shadow-sm border border-indigo-50 pl-5 group focus-within:border-indigo-500 transition-all">
                <Search className="h-4 w-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                    placeholder="Search by name or phone..."
                    className="border-none bg-transparent font-semibold text-sm focus-visible:ring-0 shadow-none h-10 flex-1"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Card className="border border-indigo-50 shadow-sm rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-900  tracking-tight">Top Spenders Leaderboard</CardTitle>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 ">Synced with real-time transactional logic</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Engine</span>
                    </div>
                </CardHeader>
                <CardContent className="p-10">
                    {filteredCustomers.length === 0 ? (
                        <div className="py-24 text-center">
                            <SearchX className="h-20 w-20 mx-auto mb-6 text-slate-100" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] ">No customer records found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-10 px-10">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="px-6 py-4 text-[9px] font-semibold uppercase text-slate-400 tracking-widest leading-none">Rank</th>
                                        <th className="px-6 py-4 text-[9px] font-semibold uppercase text-slate-400 tracking-widest leading-none">Profile</th>
                                        <th className="px-6 py-4 text-[9px] font-semibold uppercase text-slate-400 tracking-widest leading-none">Points</th>
                                        <th className="px-6 py-4 text-[9px] font-semibold uppercase text-slate-400 tracking-widest leading-none">Total Spent</th>
                                        <th className="px-6 py-4 text-[9px] font-semibold uppercase text-slate-400 tracking-widest leading-none text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredCustomers.map((customer, index) => (
                                        <tr key={customer.id} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className={cn("px-6 py-4 font-semibold text-lg tracking-tighter", 
                                                index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-slate-200"
                                            )}>#{index+1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 rounded-xl border border-white shadow-sm group-hover:scale-105 transition-transform">
                                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs text-xs">
                                                            {customer.name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900 leading-none mb-1">{customer.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">{customer.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-base text-indigo-700 tracking-tight leading-none">{customer.loyalty_points || 0}</span>
                                                    <span className="text-[8px] font-semibold text-indigo-400 uppercase tracking-widest mt-0.5">PTS</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-base text-slate-900 tracking-tight">₹{customer.total_spent.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                {customer.total_spent >= 1000 ? (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => setSelectedCustomer(customer)}
                                                        className="bg-indigo-600 hover:bg-slate-900 text-white rounded-xl h-9 px-4 font-bold text-[9px] uppercase tracking-widest gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                                    >
                                                        <Gift className="h-3 w-3" /> Issue Loyal Coupon
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline" className="text-[8px] uppercase tracking-widest bg-slate-50 text-slate-400 border-slate-200 h-8 px-3 rounded-lg">
                                                        ₹1,000+ Req.
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Premium Sophisticated Reward Dialog */}
            <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
                <DialogContent className="max-w-md p-0 border-none rounded-3xl overflow-hidden shadow-2xl bg-white animate-in slide-in-from-bottom-5 duration-500">
                    <DialogHeader className="p-5 text-left bg-indigo-600 text-white relative">
                        <DialogTitle className="text-lg font-bold tracking-tight uppercase">Issue Loyal Coupon</DialogTitle>
                        <p className="text-[10px] text-indigo-100 font-semibold uppercase tracking-widest opacity-80 leading-none">Celebrating {selectedCustomer?.name}</p>
                    </DialogHeader>

                    <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        {/* 0. Creation Mode Toggle */}
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
                            <button 
                                onClick={() => setIsCreatingNew(true)}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                    isCreatingNew ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Create New
                            </button>
                            <button 
                                onClick={() => setIsCreatingNew(false)}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                    !isCreatingNew ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Reuse Existing
                            </button>
                        </div>

                        {isCreatingNew ? (
                            <>
                        {/* 1. Benefit Mode Selection */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">1. Choose Coupon Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'percentage', icon: Percent, label: 'Disc %' },
                                { id: 'fixed', icon: IndianRupee, label: '₹ Off' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setRewardConfig({...rewardConfig, type: mode.id as any})}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                                        rewardConfig.type === mode.id 
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" 
                                            : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <mode.icon className={cn("h-4 w-4", rewardConfig.type === mode.id ? "text-white" : "text-indigo-400")} />
                                    <span className="text-[8px] font-bold uppercase tracking-widest leading-none">{mode.label}</span>
                                </button>
                            ))}
                        </div>
                        </div>

                        {/* 2. Value Input / Item Selector */}
                        <div className="space-y-4">
                            {rewardConfig.type === 'item' ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">2. Target Product</label>
                                    <Dialog open={isMenuBrowserOpen} onOpenChange={setIsMenuBrowserOpen}>
                                        <Button 
                                            variant="outline" 
                                            className="w-full h-16 rounded-[1.5rem] border-dashed border-2 border-indigo-100 bg-indigo-50/30 hover:bg-white hover:border-indigo-600 shadow-sm flex items-center justify-between px-6 group transition-all"
                                            onClick={() => setIsMenuBrowserOpen(true)}
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                                    <LayoutGrid className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{rewardConfig.itemName || 'Pick a Reward Item'}</p>
                                                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 truncate ">Synced with Menu Catalogue</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 animate-pulse" />
                                        </Button>
                                        <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 overflow-hidden border-none shadow-xl bg-white rounded-3xl">
                                            <div className="p-6 pb-2">
                                                <DialogTitle className="text-xl font-bold tracking-tight">Pick a Reward Product</DialogTitle>
                                                <div className="relative mt-4">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                    <Input 
                                                        placeholder="Search your menu items..." 
                                                        value={menuSearch}
                                                        onChange={(e) => setMenuSearch(e.target.value)}
                                                        className="h-12 pl-11 rounded-xl bg-slate-50 border-transparent font-semibold focus:bg-white focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {filteredMenu.map(item => (
                                                        <div 
                                                            key={item.id}
                                                            className={cn(
                                                                "group relative flex flex-col p-2 rounded-[2rem] border transition-all cursor-pointer active:scale-95",
                                                                rewardConfig.itemId === item.id ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-100"
                                                            )}
                                                            onClick={() => {
                                                                if (rewardConfig.itemId === item.id) {
                                                                    setRewardConfig({ ...rewardConfig, itemId: '', itemName: '' });
                                                                } else {
                                                                    setRewardConfig({
                                                                        ...rewardConfig,
                                                                        itemId: item.id,
                                                                        itemName: item.name
                                                                    });
                                                                    setIsMenuBrowserOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative">
                                                                <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                                                                {rewardConfig.itemId === item.id && (
                                                                    <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-[2px] flex items-center justify-center">
                                                                        <Check className="h-8 w-8 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] font-bold text-slate-900 text-center truncate px-2 leading-none pb-1">{item.name}</p>
                                                            <p className="text-[9px] font-semibold text-slate-400 text-center uppercase tracking-widest  opacity-60">₹{item.price}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">2. Enter {rewardConfig.type === 'percentage' ? 'Percentage' : 'Amount'}</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-bold">
                                            {rewardConfig.type === 'percentage' ? <Percent size={16} /> : <IndianRupee size={16} />}
                                        </div>
                                        <Input 
                                            type="number"
                                            placeholder={rewardConfig.type === 'percentage' ? "e.g. 50" : "e.g. 100"}
                                            value={rewardConfig.value}
                                            onChange={(e) => setRewardConfig({...rewardConfig, value: e.target.value})}
                                            className="h-12 pl-10 rounded-xl bg-indigo-50/30 border-indigo-50 focus:border-indigo-500 focus:bg-white transition-all text-xl font-bold tracking-tight"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* 3. Coupon Code Display */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between border-dashed">
                             <div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Coupon Code</p>
                                 <p className="text-lg font-bold font-mono tracking-widest text-indigo-900">{rewardConfig.code}</p>
                             </div>
                             <button className="h-9 w-9 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all" onClick={() => setRewardConfig({...rewardConfig, code: `VIP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`})}>
                                 <RefreshCw className="h-4 w-4" />
                             </button>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3 border border-amber-100">
                             <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                             <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                                 The Loyal Coupon will be sent via WhatsApp with an exclusive template. Recorded for 100% auditing.
                             </p>
                        </div>

                        <Button 
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-950 font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 gap-3" 
                            onClick={handleFinalizeReward} 
                            disabled={sendingReward || (rewardConfig.type === 'item' && !rewardConfig.itemId)}
                        >
                            {sendingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white" />}
                            Execute Loyal Coupon
                        </Button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">Select from Previous Coupons</label>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {existingCoupons.length === 0 ? (
                                        <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No previous coupons found</p>
                                        </div>
                                    ) : (
                                        existingCoupons.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedExistingCoupon(c)}
                                                className={cn(
                                                    "w-full p-4 rounded-2xl border transition-all text-left group active:scale-[0.98]",
                                                    selectedExistingCoupon?.id === c.id 
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" 
                                                        : "bg-white border-slate-100 hover:border-indigo-200"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        selectedExistingCoupon?.id === c.id ? "text-indigo-100" : "text-indigo-600"
                                                    )}>
                                                        {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                                                    </span>
                                                    <span className={cn(
                                                        "font-mono text-[10px] font-bold",
                                                        selectedExistingCoupon?.id === c.id ? "text-white/80" : "text-slate-400"
                                                    )}>{c.code}</span>
                                                </div>
                                                <p className={cn(
                                                    "text-xs font-bold truncate",
                                                    selectedExistingCoupon?.id === c.id ? "text-white" : "text-slate-900"
                                                )}>{c.description?.replace('[PRIVATE]', '').trim() || 'No Description'}</p>
                                            </button>
                                        ))
                                    )}
                                </div>
                                <Button 
                                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-950 font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 gap-3 mt-4" 
                                    onClick={handleFinalizeReward} 
                                    disabled={sendingReward || !selectedExistingCoupon}
                                >
                                    {sendingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white" />}
                                    Reuse Loyal Coupon
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
