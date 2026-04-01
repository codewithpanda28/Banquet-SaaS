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
            
            const { data: restData } = await supabase
                .from('restaurants')
                .select('loyalty_point_ratio')
                .eq('id', id)
                .single()
            if (restData) setPointRatio(Number(restData.loyalty_point_ratio) || 10)

            const { data: tiers } = await supabase
                .from('loyalty_rewards')
                .select('*')
                .eq('restaurant_id', id)
                .order('threshold', { ascending: true })
            setRewards(tiers || [])

            const { data: items } = await supabase
                .from('menu_items')
                .select('id, name, image_url, price')
                .eq('restaurant_id', id)
            
            const validItems = (items || []).filter(i => !i.name.startsWith('[DELETED]'))
            setMenuItems(validItems)

        } catch (error) {
            console.error('Error:', error)
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
            toast.success('Earn points settings saved!')
        } catch (error) {
            toast.error('Failed to update')
        } finally {
            setSaving(false)
        }
    }

    const addReward = async () => {
        if (!newReward.threshold || !newReward.itemId) {
            toast.error('Please complete all steps')
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
                    reward_item_id: newReward.itemId,
                    reward_type: newReward.type,
                    discount_value: Number(newReward.value) || 0
                }])
                .select()
                .single()
            if (error) throw error
            setRewards(prev => [...prev, data].sort((a, b) => a.threshold - b.threshold))
            setNewReward({ threshold: '', name: '', image: '', itemId: '', type: 'free', value: 0 })
            toast.success('New reward milestone added!')
        } catch (error: any) {
            toast.error('Failed to add milestone')
        } finally {
            setSaving(false)
        }
    }

    const deleteReward = async (id: string) => {
        try {
            await supabase.from('loyalty_rewards').delete().eq('id', id)
            setRewards(prev => prev.filter(r => r.id !== id))
            toast.success('Reward deleted')
        } catch (error) {
            toast.error('Failed to delete')
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

    const renderValueDisplay = (type: string, value: number) => {
        if (type === 'free') return '100% FREE'
        if (type === 'percentage') return `${value}% OFF`
        return `At ₹${value}`
    }

    return (
        <div className="space-y-6 pb-20 bg-gray-50/50 min-h-screen">
            <PageHeader 
                title="Rewards Engine" 
                description="Create milestones for customers to redeem their hard-earned points." 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4">
                <div className="lg:col-span-8 space-y-8">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="border-b p-6 bg-white">
                            <h2 className="text-lg font-bold text-gray-900">Add New Milestone</h2>
                            <p className="text-xs text-gray-500 font-medium">Define a new reward points target</p>
                        </div>
                        
                        <CardContent className="p-8 space-y-10">
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    {/* 1. Threshold */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">1. Points Required</label>
                                        <div className="relative">
                                            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <Input 
                                                type="number" 
                                                placeholder="e.g. 500 Pts" 
                                                value={newReward.threshold} 
                                                onChange={(e) => setNewReward({...newReward, threshold: e.target.value})} 
                                                className="h-14 pl-12 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-600 focus:bg-white text-xl font-bold" 
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* 2. Select Item */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">2. Select Item</label>
                                        <Dialog open={isMenuBrowserOpen} onOpenChange={setIsMenuBrowserOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="w-full h-16 rounded-xl border-gray-200 bg-gray-50 hover:bg-white flex items-center justify-between px-4 group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <LayoutGrid className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                                        <div className="text-left truncate">
                                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                                {newReward.itemId ? menuItems.find(i => i.id === newReward.itemId)?.name : 'Click to Pick Item'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 font-medium">Menu product selection</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-gray-300" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-xl h-[70vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
                                                <div className="p-6 border-b">
                                                    <DialogTitle className="text-lg font-bold">Menu Browser</DialogTitle>
                                                    <div className="relative mt-4">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                        <Input 
                                                            placeholder="Search items..." 
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="h-10 pl-10 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                                    {filteredItems.map(item => (
                                                        <div 
                                                            key={item.id}
                                                            className={cn(
                                                                "flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all",
                                                                newReward.itemId === item.id 
                                                                    ? "border-blue-500 bg-blue-50 shadow-sm" 
                                                                    : "border-gray-50 hover:border-gray-200"
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
                                                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border">
                                                                {item.image_url ? (
                                                                    <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-[10px]">NO PIC</div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                                <p className="text-xs text-gray-500">Regular Price: ₹{item.price}</p>
                                                            </div>
                                                            {newReward.itemId === item.id && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
 
                                    {/* 3. Reward Strategy */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-wider">3. Reward Strategy</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'free', icon: Gift, label: 'Free' },
                                                { id: 'fixed', icon: IndianRupee, label: 'At Price' },
                                                { id: 'percentage', icon: Percent, label: 'Off %' }
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setNewReward({...newReward, type: type.id as any, value: 0})}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-95",
                                                        newReward.type === type.id 
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                                                            : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                                                    )}
                                                >
                                                    <type.icon className={cn("h-5 w-5", newReward.type === type.id ? "text-white" : "text-gray-400")} />
                                                    <span className="text-[10px] font-black uppercase">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
 
                                        {newReward.type !== 'free' && (
                                            <div className="pt-2">
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                                        {newReward.type === 'percentage' ? '%' : '₹'}
                                                    </div>
                                                    <Input 
                                                        type="number" 
                                                        placeholder="0" 
                                                        value={newReward.value || ''} 
                                                        onChange={(e) => setNewReward({...newReward, value: Number(e.target.value)})} 
                                                        className="h-14 pl-12 rounded-xl bg-gray-50 border-gray-100 focus:border-blue-600 focus:bg-white font-bold text-xl" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
 
                                    <Button 
                                        className="w-full h-16 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-sm uppercase tracking-widest gap-2 shadow-xl shadow-blue-100 transition-all" 
                                        onClick={addReward} 
                                        disabled={saving || !newReward.itemId || !newReward.threshold}
                                    >
                                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Save Milestone
                                    </Button>
                                </div>
 
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Interactive Preview</label>
                                    <div className="w-full aspect-[4/5] rounded-[2.5rem] border-8 border-gray-900 bg-gray-950 flex flex-col overflow-hidden relative shadow-2xl">
                                        {newReward.image ? (
                                            <div className="relative w-full h-full">
                                                <img src={newReward.image} alt="Preview" className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/10 to-transparent p-6 flex flex-col justify-end text-left">
                                                    <div className="space-y-4 font-sans">
                                                        <div className="flex gap-2">
                                                            <div className="bg-blue-600 text-white font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">
                                                                {newReward.threshold || '0'} Pts
                                                            </div>
                                                            <div className="bg-white/10 backdrop-blur-sm text-white font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                                                                {renderValueDisplay(newReward.type, newReward.value)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-2xl font-black text-white italic tracking-tighter leading-none mb-2 lowercase">{newReward.name}</h4>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Redeem to unlock item</p>
                                                        </div>
                                                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 w-[70%]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                                                <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                                    <Gift className="h-6 w-6 text-white/50" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic font-sans">Live Customer Preview</p>
                                            </div>
                                        )}
                                        <div className="bg-blue-600 h-12 w-full flex items-center justify-center text-white font-black text-[10px] uppercase tracking-widest font-sans">Collect Points</div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold italic text-center px-6 leading-relaxed flex items-center justify-center gap-2 font-sans">
                                        <Zap className="h-3 w-3 text-blue-500" /> AUTOMATICALLY UPDATED ON MENU
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
 
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest font-sans">Configured Milestones</h3>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-sans">{rewards.length} Active Tiers</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rewards.length === 0 ? (
                                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                    <Gift className="h-10 w-10 mx-auto text-gray-200 mb-4" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">No milestones yet</p>
                                </div>
                            ) : (
                                rewards.map((reward) => (
                                    <div key={reward.id} className="bg-white border rounded-2xl p-4 flex items-center gap-4 group transition-all hover:bg-white hover:border-blue-500 hover:shadow-xl shadow-gray-100/50">
                                        <div className="h-16 w-16 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden shrink-0">
                                            {reward.reward_image ? (
                                                <img src={reward.reward_image} className="w-full h-full object-cover" alt={reward.reward_name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs font-bold">IMG</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 font-sans">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{reward.threshold} Pts</span>
                                                <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase">
                                                    {renderValueDisplay(reward.reward_type, reward.discount_value)}
                                                </span>
                                            </div>
                                            <p className="font-bold text-gray-900 text-sm truncate uppercase tracking-tight leading-none mb-1">{reward.reward_name}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => deleteReward(reward.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
 
                <div className="lg:col-span-4 h-full sticky top-32 space-y-6 pb-10">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="p-8 space-y-8 font-sans">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-gray-900">Earning Logic</h3>
                                <p className="text-xs text-gray-500 font-medium tracking-tight">How customers earn points</p>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-50 flex items-center gap-4">
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Spend Amount</p>
                                        <p className="text-2xl font-black text-blue-900 italic tracking-tighter leading-none">₹{pointRatio}</p>
                                    </div>
                                    <div className="h-8 w-px bg-blue-100" />
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Points Earned</p>
                                        <p className="text-2xl font-black text-blue-900 italic tracking-tighter leading-none">1 PT</p>
                                    </div>
                                </div>

                                <div className="space-y-4 px-1">
                                    <div className="flex justify-between items-center bg-white border border-gray-100 rounded-xl p-4 shadow-sm group focus-within:border-blue-500 transition-all">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Spend Amount</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-blue-600">₹</span>
                                            <input 
                                                type="number"
                                                value={pointRatio}
                                                onChange={(e) => setPointRatio(Number(e.target.value))}
                                                className="w-16 bg-transparent border-none focus:ring-0 text-right font-black text-blue-600 p-0 text-base"
                                            />
                                        </div>
                                    </div>
                                    <Input 
                                        type="range" 
                                        min="1" 
                                        max="1000" 
                                        value={pointRatio} 
                                        onChange={(e) => setPointRatio(Number(e.target.value))} 
                                        className="h-2 bg-gray-100 accent-blue-600 rounded-full cursor-pointer w-full" 
                                    />
                                    <div className="flex justify-between px-1">
                                        <span className="text-[8px] font-black text-gray-300 uppercase">Aggressive</span>
                                        <span className="text-[8px] font-black text-gray-300 uppercase">Balanced</span>
                                        <span className="text-[8px] font-black text-gray-300 uppercase">Strict</span>
                                    </div>
                                </div>

                                <Button className="w-full h-14 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-gray-200" onClick={saveRatio} disabled={saving}>
                                    Save Earning Logic
                                </Button>
                            </div>

                            <div className="bg-gray-50 border p-6 rounded-2xl flex items-start gap-4">
                                <Trophy className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Points Strategy</p>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed italic">"Keep the ratio simple (like ₹10 = 1 PT) so customers can count points easily while they eat."</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
