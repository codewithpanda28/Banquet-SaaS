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
import { handleWhatsAppCoupon } from '@/lib/webhook'
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
        code: `VIP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    })
    const [menuSearch, setMenuSearch] = useState('')
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
            if (rewardConfig.type === 'percentage') rewardText = `${rewardConfig.value}% OFF`
            else if (rewardConfig.type === 'fixed') rewardText = `₹${rewardConfig.value} Discount`
            else rewardText = `FREE ${rewardConfig.itemName}`

            const fullMessage = `👑 VIP Reward: Congratulations ${selectedCustomer.name}! As a valued patron of Gold Biryani, you've unlocked a special reward: *${rewardText}*. Use Code: *${rewardConfig.code}* on your next visit! 🎉`

            await handleWhatsAppCoupon(
                selectedCustomer.name, 
                selectedCustomer.phone, 
                rewardConfig.code, 
                rewardText, 
                RESTAURANT_ID as string
            )
            
            // Trigger customized message if n8n allows (message is sent in payload)
            // Note: We send 'rewardText' in the discount field of the webhook.

            toast.success(`Exclusive reward sent to ${selectedCustomer.name}! 🎁`)
            setSelectedCustomer(null)
            // Regenerate code for next one
            setRewardConfig(prev => ({...prev, code: `VIP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`}))
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
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 leading-none">VIP Potential</p>
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
                        <DialogTitle className="text-lg font-bold tracking-tight uppercase">Issue VIP Reward</DialogTitle>
                        <p className="text-[10px] text-indigo-100 font-semibold uppercase tracking-widest opacity-80 leading-none">Celebrating {selectedCustomer?.name}</p>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* 1. Benefit Mode Selection */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">1. Choose Reward Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'percentage', icon: Percent, label: 'Disc %' },
                                { id: 'fixed', icon: IndianRupee, label: '₹ Off' },
                                { id: 'item', icon: Gift, label: 'Free Product' }
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
                                 The VIP reward will be sent via WhatsApp with an exclusive template. Recorded for 100% auditing.
                             </p>
                        </div>

                        <Button 
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-950 font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 gap-3" 
                            onClick={handleFinalizeReward} 
                            disabled={sendingReward || (rewardConfig.type === 'item' && !rewardConfig.itemId)}
                        >
                            {sendingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white" />}
                            Execute VIP Reward
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
