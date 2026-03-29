'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Trophy,
    Zap,
    RefreshCw,
    Gift,
    Trash2,
    Plus,
    ChevronRight,
    Loader2,
    Search,
    Check,
    LayoutGrid,
    SearchX,
    Percent,
    IndianRupee,
    Tag
} from 'lucide-react'
import { supabase, getRestaurantId } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface Reward {
    id: string
    threshold: number
    reward_name: string
    reward_image: string
    reward_type: 'free' | 'fixed' | 'percentage'
    discount_value: number
}

interface MenuItem {
    id: string
    name: string
    image_url: string
    price: number
}

export default function RewardsProgramPage() {
    const [rewards, setRewards] = useState<Reward[]>([])
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [pointRatio, setPointRatio] = useState(10)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Expanded reward config
    const [newReward, setNewReward] = useState({ 
        threshold: '', 
        name: '', 
        image: '', 
        itemId: '',
        type: 'free' as 'free' | 'fixed' | 'percentage',
        value: 0
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [isMenuBrowserOpen, setIsMenuBrowserOpen] = useState(false)

    const fetchProgramData = useCallback(async () => {
        try {
            setLoading(true)
            const id = getRestaurantId()
            if (!id) return
            
            // 1. Fetch Ratio
            const { data: restData } = await supabase
                .from('restaurants')
                .select('loyalty_point_ratio')
                .eq('id', id)
                .single()
            if (restData) setPointRatio(Number(restData.loyalty_point_ratio) || 10)

            // 2. Fetch Rewards
            const { data: tiers } = await supabase
                .from('loyalty_rewards')
                .select('*')
                .eq('restaurant_id', id)
                .order('threshold', { ascending: true })
            setRewards(tiers || [])

            const { data: items, error: menuErr } = await supabase
                .from('menu_items')
                .select('id, name, image_url, price')
                .eq('restaurant_id', id)
            
            if (menuErr) {
                console.error('❌ Menu Items Fetch Error:', menuErr)
                toast.error(`Database Error: ${menuErr.message}`)
            }
            
            // Filter out items named [DELETED] as per menu/page.tsx logic
            const validItems = (items || []).filter(i => !i.name.startsWith('[DELETED]'))
            setMenuItems(validItems)

        } catch (error) {
            console.error('Error fetching rewards:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProgramData()
    }, [fetchProgramData])

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [menuItems, searchQuery])

    const saveRatio = async () => {
        try {
            setSaving(true)
            const id = getRestaurantId()
            await supabase.from('restaurants').update({ loyalty_point_ratio: pointRatio }).eq('id', id)
            toast.success('Earning ratio updated!')
        } catch (error) {
            toast.error('Failed to update ratio')
        } finally {
            setSaving(false)
        }
    }

    const addReward = async () => {
        if (!newReward.threshold || !newReward.name) {
            toast.error('Please select an item and set a threshold')
            return
        }
        try {
            setSaving(true)
            const id = getRestaurantId()
            const { data, error } = await supabase
                .from('loyalty_rewards')
                .insert([{
                    restaurant_id: id,
                    threshold: Number(newReward.threshold),
                    reward_name: newReward.name,
                    reward_image: newReward.image,
                    reward_item_id: newReward.itemId, // 🔥 Critical Fix: Store the relation ID
                    reward_type: newReward.type,
                    discount_value: Number(newReward.value) || 0
                }])
                .select()
                .single()
            if (error) throw error
            setRewards(prev => [...prev, data].sort((a, b) => a.threshold - b.threshold))
            setNewReward({ threshold: '', name: '', image: '', itemId: '', type: 'free', value: 0 })
            setSearchQuery('')
            toast.success('Reward tier added! 🎁')
        } catch (error: any) {
            toast.error(error.message || 'Failed to add tier')
        } finally {
            setSaving(false)
        }
    }

    const deleteReward = async (id: string) => {
        try {
            await supabase.from('loyalty_rewards').delete().eq('id', id)
            setRewards(prev => prev.filter(r => r.id !== id))
            toast.success('Reward removed')
        } catch (error) {
            toast.error('Failed to remove reward')
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600" /></div>

    const renderValueDisplay = (type: string, value: number) => {
        if (type === 'free') return '100% Free'
        if (type === 'percentage') return `${value}% Off`
        return `At ₹${value}`
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 bg-slate-50/20 min-h-screen font-sans">
            <PageHeader title="Rewards Engine" description="Select from your menu and choose to give items for Free, at Fixed Price, or Percentage discount." />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    <Card className="border border-indigo-50 shadow-sm rounded-3xl overflow-hidden bg-white">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Plus className="h-6 w-6 text-indigo-200" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold italic tracking-tight uppercase tracking-widest">Add Loyalty Tier</h2>
                                        <p className="text-indigo-100 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Configure item-specific incentives</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <CardContent className="p-8 space-y-10">
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    {/* 1. Point Threshold */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. Milestone Points</label>
                                        <Input 
                                            type="number" 
                                            placeholder="Eg: 500 Pts" 
                                            value={newReward.threshold} 
                                            onChange={(e) => setNewReward({...newReward, threshold: e.target.value})} 
                                            className="h-14 rounded-2xl bg-indigo-50/30 border-indigo-50 focus:border-indigo-500 focus:bg-white transition-all text-xl font-black tracking-tight" 
                                        />
                                    </div>
                                    
                                    {/* 2. Menu Item Browser */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">2. Target Product</label>
                                        <Dialog open={isMenuBrowserOpen} onOpenChange={setIsMenuBrowserOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full h-16 rounded-2xl border-dashed border-2 border-indigo-100 bg-indigo-50/50 hover:bg-white hover:border-indigo-600 shadow-sm flex items-center justify-between px-6 group transition-all">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                                            <LayoutGrid className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <p className="text-sm font-black text-slate-900 truncate">{newReward.itemId ? menuItems.find(i => i.id === newReward.itemId)?.name : 'Pick a Menu Item'}</p>
                                                                {newReward.itemId && (
                                                                    <div className="flex flex-col items-end shrink-0">
                                                                        <span className="text-[10px] text-slate-400 line-through">₹{menuItems.find(i => i.id === newReward.itemId)?.price}</span>
                                                                        <span className="text-sm font-black text-indigo-600">
                                                                            {newReward.type === 'free' ? 'FREE' : 
                                                                             newReward.type === 'percentage' ? `₹${(menuItems.find(i => i.id === newReward.itemId)!.price * (1 - newReward.value/100)).toFixed(0)}` :
                                                                             `₹${newReward.value}`}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">Synced with Menu Management</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2rem]">
                                                <DialogHeader className="p-8 pb-4 border-b border-slate-50">
                                                    <DialogTitle className="text-2xl font-black italic tracking-tighter">Choose Menu Item</DialogTitle>
                                                    <div className="relative mt-4">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                        <Input 
                                                            placeholder="Search your menu items..." 
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="h-12 pl-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold"
                                                        />
                                                    </div>
                                                </DialogHeader>
                                                <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                        {filteredItems.length === 0 ? (
                                                            <div className="col-span-full py-20 text-center space-y-4">
                                                                <SearchX className="h-12 w-12 mx-auto text-slate-200" />
                                                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No products found</p>
                                                                <Button variant="ghost" size="sm" onClick={fetchProgramData} className="font-bold text-indigo-600 border border-indigo-100 rounded-xl px-6 h-10 hover:bg-indigo-50">Refresh Items</Button>
                                                            </div>
                                                        ) : (
                                                            filteredItems.map(item => (
                                                                <div 
                                                                    key={item.id}
                                                                    className={cn(
                                                                        "group relative flex flex-col p-2 rounded-[1.5rem] border transition-all cursor-pointer active:scale-95",
                                                                        newReward.itemId === item.id 
                                                                            ? "bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100" 
                                                                            : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50"
                                                                    )}
                                                                    onClick={() => {
                                                                        setNewReward({
                                                                            ...newReward,
                                                                            itemId: item.id,
                                                                            name: item.name,
                                                                            image: item.image_url
                                                                        });
                                                                        setIsMenuBrowserOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-3 border border-slate-50 relative shadow-inner">
                                                                        {item.image_url ? (
                                                                            <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center"><Gift className="h-6 w-6 text-slate-200" /></div>
                                                                        )}
                                                                        {newReward.itemId === item.id && (
                                                                            <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-[2px] flex items-center justify-center">
                                                                                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                                                    <Check className="h-6 w-6 text-indigo-600" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] font-black text-slate-900 text-center truncate px-2 leading-none pb-1">{item.name}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">₹{item.price}</p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    {/* 3. Reward Type Selection */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">3. Benefit Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'free', icon: Gift, label: 'Free' },
                                                { id: 'fixed', icon: IndianRupee, label: 'Fixed Price' },
                                                { id: 'percentage', icon: Percent, label: 'Discount %' }
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setNewReward({...newReward, type: type.id as any, value: 0})}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                                                        newReward.type === type.id 
                                                            ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
                                                            : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <type.icon className="h-5 w-5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {newReward.type !== 'free' && (
                                            <div className="animate-in slide-in-from-top-2 duration-300">
                                                <div className="relative group">
                                                    {newReward.type === 'percentage' ? (
                                                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                                                    ) : (
                                                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                                                    )}
                                                    <Input 
                                                        type="number" 
                                                        placeholder={newReward.type === 'percentage' ? "Eg: 50%" : "Eg: 99"} 
                                                        value={newReward.value || ''} 
                                                        onChange={(e) => setNewReward({...newReward, value: Number(e.target.value)})} 
                                                        className="h-14 pl-12 rounded-2xl bg-indigo-50/30 border-indigo-50 focus:border-indigo-500 focus:bg-white transition-all text-lg font-black tracking-tight" 
                                                    />
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-2 ml-1 italic opacity-70">
                                                    {newReward.type === 'percentage' 
                                                        ? "* Customer gets XX% off on this item" 
                                                        : "* Customer gets this item at a fixed price"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <Button 
                                        className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300" 
                                        onClick={addReward} 
                                        disabled={saving || !newReward.itemId || !newReward.threshold}
                                    >
                                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-white" />}
                                        Save Milestone
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Hub Preview</label>
                                    <div className="w-full aspect-square md:aspect-[4/5] rounded-[3rem] border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center bg-slate-50 transition-all overflow-hidden relative shadow-inner">
                                        {newReward.image ? (
                                            <div className="relative w-full h-full group">
                                                <img src={newReward.image} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-8">
                                                    <div className="space-y-2 w-full">
                                                        <div className="flex justify-between items-center">
                                                            <div className="bg-yellow-400 text-black font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                                {newReward.threshold || '0'} Points
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="bg-white/20 backdrop-blur-md text-white font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/20 flex items-center gap-2">
                                                                    <span className="line-through opacity-60">₹{menuItems.find(i => i.id === newReward.itemId)?.price}</span>
                                                                    <span>{renderValueDisplay(newReward.type, newReward.value)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <h4 className="text-2xl font-black text-white italic leading-tight truncate">{newReward.name}</h4>
                                                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden mt-2">
                                                            <div className="h-full bg-indigo-500 w-[65%] shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center p-10 space-y-4 opacity-30">
                                                <div className="h-20 w-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto">
                                                    <Gift className="h-10 w-10 text-indigo-400" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Preview your special deal</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold italic text-center px-6 leading-relaxed uppercase tracking-wider opacity-60">Loyalty tiers increase retention by 40% based on our retail benchmarks.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Active Redemption Tiers</h3>
                            <Button variant="ghost" size="sm" onClick={fetchProgramData} className="h-8 text-[10px] text-indigo-600 font-black uppercase tracking-widest gap-2">
                                <RefreshCw className="h-3 w-3" /> Refresh Database
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {rewards.length === 0 ? (
                                <div className="col-span-full py-28 text-center bg-white rounded-[3rem] border border-dashed border-indigo-100">
                                    <Gift className="h-14 w-14 mx-auto text-slate-200 mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-relaxed">No rewards configured.<br/>Add your first milestone above.</p>
                                </div>
                            ) : (
                                rewards.map((reward) => (
                                    <Card key={reward.id} className="border border-indigo-50 shadow-sm rounded-[2.5rem] overflow-hidden bg-white group hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-50">
                                        <div className="flex items-center gap-5 p-5">
                                            <div className="h-24 w-24 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500 relative">
                                                {reward.reward_image ? (
                                                    <img src={reward.reward_image} className="w-full h-full object-cover" alt={reward.reward_name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><Gift className="h-8 w-8 text-slate-200" /></div>
                                                )}
                                                <div className="absolute top-1 right-1">
                                                    <div className="bg-indigo-600 text-white rounded-full p-1 shadow-lg border border-indigo-400">
                                                        <Tag className="h-3 w-3" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="bg-amber-400 text-black font-black text-[9px] px-3 py-0.5 rounded-full uppercase tracking-[0.1em] shadow-sm">
                                                        {reward.threshold} Pts
                                                    </div>
                                                    <div className="bg-slate-100 text-slate-900 font-black text-[9px] px-3 py-0.5 rounded-full uppercase tracking-[0.1em]">
                                                        {renderValueDisplay(reward.reward_type, reward.discount_value)}
                                                    </div>
                                                </div>
                                                <p className="font-black text-slate-900 text-base tracking-tight truncate leading-none mb-2">{reward.reward_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 opacity-70">
                                                    <Zap className="h-2.5 w-2.5 fill-indigo-400 text-indigo-400" />
                                                    LOYALTY DEAL
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all h-10 w-10 shrink-0" onClick={() => deleteReward(reward.id)}>
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 h-full sticky top-32 space-y-8 pb-10">
                    <Card className="border border-indigo-50 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                        <div className="p-8 space-y-10">
                            <div>
                                <h3 className="text-xl font-black italic text-slate-900 tracking-tight leading-none mb-1">Earning Logic</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Global Points Accumulation</p>
                            </div>
                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] ml-1">Spend : Earn Ratio</label>
                                <div className="flex items-center gap-4 bg-purple-50 p-8 rounded-[2.5rem] border border-purple-100 shadow-inner group transition-all hover:bg-purple-100/50">
                                    <div className="flex-1 text-center">
                                        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Spend</p>
                                        <p className="text-xl font-black text-purple-900 italic tracking-tight">₹{pointRatio}</p>
                                    </div>
                                    <div className="h-10 w-px bg-purple-200" />
                                    <div className="flex-1 text-center">
                                        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Earn</p>
                                        <p className="text-xl font-black text-purple-900 italic tracking-tight">1 PT</p>
                                    </div>
                                </div>
                                <div className="px-2">
                                    <Input 
                                        type="range" 
                                        min="1" 
                                        max="100" 
                                        value={pointRatio} 
                                        onChange={(e) => setPointRatio(Number(e.target.value))} 
                                        className="h-2 bg-purple-100 accent-purple-600 rounded-full cursor-pointer w-full mt-4" 
                                    />
                                    <div className="flex justify-between mt-2 px-1">
                                        <span className="text-[8px] font-black text-slate-300 uppercase">Aggressive</span>
                                        <span className="text-[8px] font-black text-slate-300 uppercase">Strict</span>
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95" onClick={saveRatio} disabled={saving}>Confirm Logic</Button>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 space-y-3 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Trophy className="h-12 w-12 text-indigo-600" />
                                </div>
                                <div className="flex items-center gap-2 relative">
                                    <Trophy className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">Smart Logic</p>
                                </div>
                                <p className="text-[11px] text-indigo-600/80 font-bold italic leading-relaxed relative">Using existing menu favorites (from Menu Management) keeps your inventory synced and customers hooked.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
