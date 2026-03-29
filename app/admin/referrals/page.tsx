'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
    Users,
    Zap,
    RefreshCw,
    Gift,
    Plus,
    ChevronRight,
    Loader2,
    Search,
    Check,
    LayoutGrid,
    SearchX,
    Percent,
    IndianRupee,
    Tag,
    Share2,
    Trophy,
    Info
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

interface ReferralSettings {
    id: string
    referrer_reward_type: 'points' | 'fixed' | 'percentage' | 'free_item'
    referrer_reward_value: number
    referrer_reward_item_id: string | null
    referee_reward_type: 'none' | 'points' | 'fixed' | 'percentage' | 'free_item'
    referee_reward_value: number
    referee_reward_item_id: string | null
    is_active: boolean
}

interface MenuItem {
    id: string
    name: string
    image_url: string
    price: number
}

export default function ReferralProgramPage() {
    const [settings, setSettings] = useState<ReferralSettings | null>(null)
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isMenuBrowserOpen, setIsMenuBrowserOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'referrer' | 'referee'>('referrer')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const id = getRestaurantId()
            if (!id) return

            // 1. Fetch Settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('referral_settings')
                .select('*')
                .eq('restaurant_id', id)
                .single()

            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error('Error fetching referral settings:', settingsError)
            }
            
            if (settingsData) {
                setSettings(settingsData)
            } else {
                // Initialize default settings if not exists
                const defaultSettings: any = {
                    restaurant_id: id,
                    referrer_reward_type: 'points',
                    referrer_reward_value: 500,
                    referrer_reward_item_id: null,
                    referee_reward_type: 'none',
                    referee_reward_value: 0,
                    referee_reward_item_id: null,
                    is_active: true
                }
                setSettings(defaultSettings as ReferralSettings)
            }

            // 2. Fetch Menu Items
            const { data: items } = await supabase
                .from('menu_items')
                .select('id, name, image_url, price')
                .eq('restaurant_id', id)
            
            const validItems = (items || []).filter(i => !i.name.startsWith('[DELETED]'))
            setMenuItems(validItems)

        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load referral program')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [menuItems, searchQuery])

    const handleSaveSettings = async () => {
        if (!settings) return
        try {
            setSaving(true)
            const id = getRestaurantId()
            
            const { error } = await supabase
                .from('referral_settings')
                .upsert({
                    ...settings,
                    restaurant_id: id,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'restaurant_id' 
                })

            if (error) throw error
            toast.success('Referral program updated! 🚀')
        } catch (error: any) {
            console.error('Save error:', error)
            toast.error(error.message || 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const updateRewardType = (type: any, isReferrer: boolean) => {
        if (!settings) return
        if (isReferrer) {
            setSettings({
                ...settings,
                referrer_reward_type: type,
                referrer_reward_value: type === 'points' ? 500 : 0
            })
        } else {
            setSettings({
                ...settings,
                referee_reward_type: type,
                referee_reward_value: type === 'points' ? 100 : 0
            })
        }
    }

    const handleItemSelect = (item: MenuItem, isReferrer: boolean) => {
        if (!settings) return
        if (isReferrer) {
            setSettings({
                ...settings,
                referrer_reward_item_id: item.id
            })
        } else {
            setSettings({
                ...settings,
                referee_reward_item_id: item.id
            })
        }
        setIsMenuBrowserOpen(false)
    }

    if (loading || !settings) return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Syncing Viral Engine...</p>
            </div>
        </div>
    )

    const renderValueDisplay = (type: string, value: number, itemId: string | null) => {
        if (type === 'points') return `${value} Points`
        if (type === 'percentage') return `${value}% Discount`
        if (type === 'fixed') return `₹${value} Discount`
        if (type === 'free_item') {
            const item = menuItems.find(i => i.id === itemId)
            return item ? `FREE ${item.name}` : 'FREE Item'
        }
        return 'None'
    }

    const activeRewardType = activeTab === 'referrer' ? settings.referrer_reward_type : settings.referee_reward_type
    const activeRewardValue = activeTab === 'referrer' ? settings.referrer_reward_value : settings.referee_reward_value
    const activeRewardItemId = activeTab === 'referrer' ? settings.referrer_reward_item_id : settings.referee_reward_item_id

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700 bg-slate-50/20 min-h-screen font-sans">
            <PageHeader 
                title="Referral Engine" 
                description="Turn your customers into brand ambassadors. Configure rewards for both referrers and their invited friends."
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program Status</span>
                        <Switch 
                            checked={settings.is_active} 
                            onCheckedChange={(val) => setSettings({...settings!, is_active: val})}
                            className="data-[state=checked]:bg-indigo-600"
                        />
                    </div>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto px-4">
                {/* Configuration Panel */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="border border-indigo-50 shadow-sm rounded-3xl overflow-hidden bg-white">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                <Share2 size={80} />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                        <Zap className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold italic tracking-tight uppercase tracking-widest">Viral Growth Logic</h2>
                                        <p className="text-indigo-100/80 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Configure your reward mechanics</p>
                                    </div>
                                </div>
                                <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                                    <button 
                                        onClick={() => setActiveTab('referrer')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[.15em] transition-all",
                                            activeTab === 'referrer' ? "bg-white text-indigo-700 shadow-sm" : "text-white hover:bg-white/5"
                                        )}
                                    >
                                        For Referrer
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('referee')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[.15em] transition-all",
                                            activeTab === 'referee' ? "bg-white text-indigo-700 shadow-sm" : "text-white hover:bg-white/5"
                                        )}
                                    >
                                        For Friend
                                    </button>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-8 space-y-10">
                            <div className="grid md:grid-cols-2 gap-10">
                                {/* Step 1: Benefit Type */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. Benefit Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'points', icon: Trophy, label: 'Loyalty Points' },
                                                { id: 'fixed', icon: IndianRupee, label: 'Cash Off' },
                                                { id: 'percentage', icon: Percent, label: 'Discount %' },
                                                { id: 'free_item', icon: Gift, label: 'Free Item' },
                                                ...(activeTab === 'referee' ? [{ id: 'none', icon: Tag, label: 'No Reward' }] : [])
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => updateRewardType(type.id, activeTab === 'referrer')}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 text-left",
                                                        activeRewardType === type.id 
                                                            ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-indigo-100" 
                                                            : "bg-white border-slate-100 text-slate-600 hover:border-indigo-100 hover:bg-indigo-50/30"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                                                        activeRewardType === type.id ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-600"
                                                    )}>
                                                        <type.icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Step 2: Set Value / Choose Item */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                            {activeRewardType === 'free_item' ? '2. Choose Menu Item' : '2. Set Reward Value'}
                                        </label>

                                        {activeRewardType === 'free_item' ? (
                                            <Dialog open={isMenuBrowserOpen} onOpenChange={setIsMenuBrowserOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="w-full h-16 rounded-2xl border-dashed border-2 border-indigo-100 bg-indigo-50/50 hover:bg-white hover:border-indigo-600 shadow-sm flex items-center justify-between px-6 group transition-all">
                                                        <div className="flex items-center gap-4 text-left min-w-0">
                                                            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                                                <LayoutGrid className="h-5 w-5" />
                                                            </div>
                                                            <div className="truncate flex-1">
                                                                <p className="text-sm font-black text-slate-900 truncate">
                                                                    {activeRewardItemId ? menuItems.find(i => i.id === activeRewardItemId)?.name : 'Pick a Menu Item'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2rem]">
                                                    <div className="p-8 pb-4">
                                                        <DialogTitle className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">Inventory Browser</DialogTitle>
                                                        <div className="relative mt-4">
                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                            <Input 
                                                                placeholder="Search products..." 
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                className="h-12 pl-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                            {filteredItems.map(item => (
                                                                <div 
                                                                    key={item.id}
                                                                    className={cn(
                                                                        "group relative flex flex-col p-2 rounded-[1.5rem] border transition-all cursor-pointer active:scale-95",
                                                                        activeRewardItemId === item.id 
                                                                            ? "bg-indigo-50 border-indigo-500 shadow-lg" 
                                                                            : "bg-white border-slate-100 hover:border-indigo-200"
                                                                    )}
                                                                    onClick={() => handleItemSelect(item, activeTab === 'referrer')}
                                                                >
                                                                    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-3 border border-slate-50 relative">
                                                                        {item.image_url ? (
                                                                            <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center"><Gift className="h-6 w-6 text-slate-200" /></div>
                                                                        )}
                                                                        {activeRewardItemId === item.id && (
                                                                            <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-[2px] flex items-center justify-center">
                                                                                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
                                                                                    <Check className="h-6 w-6 text-indigo-600" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] font-black text-slate-900 text-center truncate px-2 leading-none pb-1">{item.name}</p>
                                                                    <p className="text-[9px] font-bold text-indigo-500 text-center uppercase tracking-widest">₹{item.price}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        ) : activeRewardType === 'none' ? (
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-center opacity-60">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No reward for the friend</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-bold">
                                                        {activeRewardType === 'points' ? <Trophy size={16} /> : activeRewardType === 'percentage' ? <Percent size={16} /> : <IndianRupee size={16} />}
                                                    </div>
                                                    <Input 
                                                        type="number" 
                                                        placeholder={activeRewardType === 'points' ? "e.g. 500" : activeRewardType === 'percentage' ? "e.g. 20" : "e.g. 100"} 
                                                        value={activeRewardValue || ''} 
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value)
                                                            if (activeTab === 'referrer') {
                                                                setSettings({...settings, referrer_reward_value: val})
                                                            } else {
                                                                setSettings({...settings, referee_reward_value: val})
                                                            }
                                                        }} 
                                                        className="h-14 pl-12 rounded-2xl bg-indigo-50/30 border-indigo-50 focus:border-indigo-500 focus:bg-white transition-all text-xl font-black tracking-tight" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Button 
                                        className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-slate-950 font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300" 
                                        onClick={handleSaveSettings} 
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
                                        Save logic
                                    </Button>
                                </div>

                                {/* Preview Panel */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Hub Preview</label>
                                    <div className="w-full aspect-[4/5] rounded-[2.5rem] bg-slate-900 shadow-xl overflow-hidden relative border-[6px] border-slate-800 p-6 flex flex-col justify-end">
                                        {/* Background Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/10" />
                                        
                                        <div className="relative space-y-6 z-10">
                                            <div className="space-y-3">
                                                <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                                    <Share2 className="h-6 w-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white italic tracking-tighter leading-none mb-1">Refer & Earn</h4>
                                                    <p className="text-indigo-200 text-[10px] font-bold leading-relaxed tracking-tight">Invite friends and unlock rewards.</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Referrer Reward Card */}
                                                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-lg space-y-1">
                                                    <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest leading-none">Your Reward</p>
                                                    <h5 className="text-lg font-black text-white italic tracking-tight truncate leading-none pt-1">
                                                        {renderValueDisplay(settings.referrer_reward_type, settings.referrer_reward_value, settings.referrer_reward_item_id)}
                                                    </h5>
                                                </div>

                                                {settings.referee_reward_type !== 'none' && (
                                                    <div className="bg-white/5 backdrop-blur-lg p-4 rounded-2xl border border-white/5 shadow-md space-y-1">
                                                        <p className="text-[8px] font-black text-purple-300 uppercase tracking-widest leading-none">Friend's Welcome</p>
                                                        <h5 className="text-base font-black text-white/80 italic tracking-tight truncate leading-none pt-1">
                                                            {renderValueDisplay(settings.referee_reward_type, settings.referee_reward_value, settings.referee_reward_item_id)}
                                                        </h5>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-indigo-600 h-10 w-full rounded-xl flex items-center justify-center font-black text-[9px] text-white uppercase tracking-[0.2em] shadow-lg">
                                                Invite Now
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold italic text-center px-6 leading-relaxed uppercase tracking-wider opacity-60">Referral systems boost organic acquisition significantly.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Info and Tips Sidebar */}
                <div className="lg:col-span-4 space-y-8 h-full sticky top-32 pb-10">
                    <Card className="border border-indigo-50 shadow-sm rounded-3xl overflow-hidden bg-white">
                        <div className="p-8 space-y-8">
                            <div className="space-y-3">
                                <h3 className="text-xl font-black italic text-slate-900 tracking-tight leading-none mb-1 uppercase tracking-widest">Growth Tips</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Viral Growth Guide</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Referrer Reward</h4>
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">500-1000 Loyalty Points is standard for casual dining.</p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Referee Reward</h4>
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">A small welcome discount works best to reduce friction.</p>
                                </div>
                                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-2 relative overflow-hidden group">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">Pro Strategy</p>
                                    </div>
                                    <p className="text-[11px] text-indigo-600/80 font-bold italic leading-relaxed">A *Free Dessert* instead of cash feels higher value to customers!</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="border border-indigo-50 shadow-sm rounded-3xl overflow-hidden bg-white">
                         <div className="p-8 flex items-center gap-5">
                             <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                 <Users className="h-6 w-6 text-indigo-600" />
                             </div>
                             <div className="flex-1">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                 <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">Active</p>
                             </div>
                         </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
